from typing import List, Optional
from uuid import UUID
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user, get_current_farmer, get_current_expert
from app.core.risk import evaluate_disease_risk, default_risk_engine
from app.core.audit import log_audit
from app.models.animal import Animal
from app.models.observation import Observation
from app.models.symptom import ObservationSymptom
from app.models.image import Image
from app.models.prediction import DiseasePrediction
from app.models.escalation import Escalation
from app.models.review import ExpertReview
from app.models.user import User
from app.schemas.observation import ObservationCreate, ObservationResponse, ImageResponse
from app.services.image_storage import image_storage_service

router = APIRouter()

@router.get("", response_model=List[ObservationResponse])
def get_observations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Observation)
    if current_user.role == "FARMER":
        query = query.filter(Observation.recorded_by == current_user.id)
    
    observations = query.order_by(Observation.created_at.desc()).all()
    return observations

@router.post("", response_model=ObservationResponse, status_code=status.HTTP_201_CREATED)
def create_observation(
    obs_in: ObservationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_farmer)
):
    # 1. Animal validation & ownership check
    animal = db.query(Animal).filter(Animal.id == obs_in.animal_id).first()
    if not animal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Animal not found"
        )
    if current_user.role == "FARMER" and animal.farmer_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only record health observations for your own livestock."
        )

    # 1b. Idempotency check: if client_observation_id already exists for this farmer, return it safely
    if obs_in.client_observation_id:
        existing_obs = db.query(Observation).filter(
            Observation.recorded_by == current_user.id,
            Observation.client_observation_id == obs_in.client_observation_id
        ).first()
        if existing_obs:
            return existing_obs

    # 2. Compile symptoms description list
    symptoms_list = list(obs_in.symptoms_description or [])
    if obs_in.structured_symptoms:
        for s in obs_in.structured_symptoms:
            if s.symptom_name and s.symptom_name not in symptoms_list:
                symptoms_list.append(s.symptom_name)

    # 3. Evaluate risk using pluggable RuleBasedRiskEngine
    risk_assessment = default_risk_engine.assess(
        symptoms=symptoms_list,
        temperature=obs_in.temperature,
        appetite_status=obs_in.appetite_status,
        activity_status=obs_in.activity_status,
        age_stage=obs_in.age_stage or animal.age_stage
    )
    risk_level = risk_assessment.risk_level
    condition = risk_assessment.predicted_condition
    confidence = risk_assessment.confidence
    explanation = risk_assessment.explanation
    factors = risk_assessment.factors
    recommended_action = risk_assessment.recommended_action

    # 4. Handle timestamps
    now = datetime.now(timezone.utc)
    first_symptom_at = obs_in.first_symptom_at or now
    observed_at = obs_in.observed_at or obs_in.observation_date or now
    observation_date = observed_at

    # 5. Populate location and age/stage defaults if not provided
    farm_location = obs_in.farm_location or animal.farm_location
    age_stage = obs_in.age_stage or animal.age_stage

    observation = Observation(
        client_observation_id=obs_in.client_observation_id,
        animal_id=obs_in.animal_id,
        recorded_by=current_user.id,
        first_symptom_at=first_symptom_at,
        observed_at=observed_at,
        observation_date=observation_date,
        submitted_at=now,
        symptoms_description=symptoms_list,
        temperature=obs_in.temperature,
        temperature_unit=obs_in.temperature_unit or "C",
        appetite_status=obs_in.appetite_status,
        activity_status=obs_in.activity_status,
        farm_location=farm_location,
        animal_location=obs_in.animal_location,
        age_stage=age_stage,
        notes=obs_in.notes,
        risk_level=risk_level,
        system_confidence=confidence,
        explanation_factors=factors,
        recommended_action=recommended_action
    )
    db.add(observation)
    db.flush()

    # 6. Save structured symptoms associations
    if obs_in.structured_symptoms:
        for s_item in obs_in.structured_symptoms:
            obs_symptom = ObservationSymptom(
                observation_id=observation.id,
                symptom_id=s_item.symptom_id,
                symptom_name=s_item.symptom_name,
                severity=s_item.severity,
                duration=s_item.duration
            )
            db.add(obs_symptom)

    # 7. Disease prediction record
    prediction = DiseasePrediction(
        observation_id=observation.id,
        predicted_condition=condition,
        confidence_score=confidence,
        prediction_source="RULE_ENGINE",
        explanation=explanation
    )
    db.add(prediction)

    # 8. Automatic escalation for HIGH risk
    if risk_level == "HIGH":
        escalation = Escalation(
            observation_id=observation.id,
            priority="HIGH",
            reason=f"System auto-escalated: {condition}",
            status="OPEN"
        )
        review = ExpertReview(
            observation_id=observation.id,
            validation_status="PENDING",
            system_risk_level=risk_level,
            system_confidence=f"{int(confidence * 100)}%"
        )
        db.add(escalation)
        db.add(review)

    db.commit()
    db.refresh(observation)

    try:
        log_audit(
            db=db,
            action="OBSERVATION_CREATED",
            entity_type="OBSERVATION",
            user_id=current_user.id,
            entity_id=observation.id,
            metadata={"animal_id": str(animal.id), "risk_level": risk_level}
        )
    except Exception:
        pass

    return observation

@router.get("/{observation_id}", response_model=ObservationResponse)
def get_observation(
    observation_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    obs = db.query(Observation).filter(Observation.id == observation_id).first()
    if not obs:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Observation record not found"
        )
    if current_user.role == "FARMER" and obs.recorded_by != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this observation record"
        )
    return obs

# ==========================================
# Observation Image Endpoints
# ==========================================

@router.post("/{observation_id}/images", response_model=ImageResponse, status_code=status.HTTP_201_CREATED)
async def upload_observation_image(
    observation_id: UUID,
    file: UploadFile = File(...),
    image_type: str = Form("BODY"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_farmer)
):
    obs = db.query(Observation).filter(Observation.id == observation_id).first()
    if not obs:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Observation record not found"
        )
    if current_user.role == "FARMER" and obs.recorded_by != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: You cannot upload images to another farmer's observation."
        )

    file_bytes = await file.read()
    try:
        saved_meta = image_storage_service.process_and_save(
            file_bytes=file_bytes,
            original_filename=file.filename or "animal_photo.jpg",
            content_type=file.content_type or "image/jpeg"
        )
    except ValueError as ve:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(ve)
        )

    img_record = Image(
        observation_id=obs.id,
        storage_path=saved_meta["storage_path"],
        original_filename=saved_meta["original_filename"],
        file_size=saved_meta["file_size"],
        width=saved_meta["width"],
        height=saved_meta["height"],
        image_type=image_type,
        upload_status=saved_meta["upload_status"],
        image_quality=saved_meta.get("image_quality", "GOOD"),
        quality_notes=saved_meta.get("quality_notes")
    )
    db.add(img_record)
    db.commit()
    db.refresh(img_record)

    try:
        log_audit(
            db=db,
            action="IMAGE_UPLOADED",
            entity_type="IMAGE",
            user_id=current_user.id,
            entity_id=img_record.id,
            metadata={"observation_id": str(obs.id), "file_size": saved_meta["file_size"]}
        )
    except Exception:
        pass

    return img_record

@router.get("/{observation_id}/images", response_model=List[ImageResponse])
def get_observation_images(
    observation_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    obs = db.query(Observation).filter(Observation.id == observation_id).first()
    if not obs:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Observation record not found"
        )
    if current_user.role == "FARMER" and obs.recorded_by != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to these observation images"
        )
    return obs.images

@router.delete("/{observation_id}/images/{image_id}", status_code=status.HTTP_200_OK)
def delete_observation_image(
    observation_id: UUID,
    image_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_farmer)
):
    obs = db.query(Observation).filter(Observation.id == observation_id).first()
    if not obs:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Observation record not found"
        )
    if current_user.role == "FARMER" and obs.recorded_by != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: You cannot delete images from another farmer's observation."
        )

    img = db.query(Image).filter(Image.id == image_id, Image.observation_id == observation_id).first()
    if not img:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Image not found"
        )

    # Delete physical file
    image_storage_service.delete_image(img.storage_path)

    db.delete(img)
    db.commit()

    try:
        log_audit(
            db=db,
            action="IMAGE_DELETED",
            entity_type="IMAGE",
            user_id=current_user.id,
            entity_id=image_id,
            metadata={"observation_id": str(observation_id)}
        )
    except Exception:
        pass

    return {"message": "Image deleted successfully"}

@router.post("/{observation_id}/start-review", response_model=ObservationResponse)
def start_expert_review(
    observation_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_expert)
):
    obs = db.query(Observation).filter(Observation.id == observation_id).first()
    if not obs:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Observation record not found"
        )
    if not obs.expert_review_started_at:
        obs.expert_review_started_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(obs)

    return obs
