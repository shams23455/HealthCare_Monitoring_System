from typing import List, Optional
from datetime import datetime, timezone
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user, get_current_expert
from app.models.review import ExpertReview
from app.models.escalation import Escalation
from app.models.observation import Observation
from app.models.user import User
from app.schemas.observation import ReviewResponse
from app.schemas.review import ReviewCreate
from app.core.audit import log_audit

router = APIRouter()

@router.get("/reviews", response_model=List[ReviewResponse])
def get_expert_reviews(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    reviews = db.query(ExpertReview).order_by(ExpertReview.validation_status.desc()).all()
    return reviews

@router.post("/reviews", response_model=ReviewResponse, status_code=status.HTTP_201_CREATED)
def submit_expert_review(
    review_in: ReviewCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_expert)
):
    obs = db.query(Observation).filter(Observation.id == review_in.observation_id).first()
    if not obs:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Observation record not found"
        )

    now = datetime.now(timezone.utc)
    if not obs.expert_review_started_at:
        obs.expert_review_started_at = obs.submitted_at or obs.created_at or now
    obs.expert_review_completed_at = now

    decision = review_in.expert_decision or review_in.validation_status or "VALIDATED"
    notes = review_in.expert_notes or review_in.comments or ""
    validation_status = review_in.validation_status or decision

    review = db.query(ExpertReview).filter(
        ExpertReview.observation_id == review_in.observation_id
    ).first()

    original_system_risk = review.system_risk_level if (review and review.system_risk_level) else obs.risk_level

    # Update observation risk if modified
    if decision == "MODIFIED" and review_in.modified_risk_level:
        obs.risk_level = review_in.modified_risk_level

    system_conf_str = f"{int(obs.system_confidence * 100)}%" if obs.system_confidence is not None else "80%"

    if not review:
        review = ExpertReview(
            observation_id=review_in.observation_id,
            expert_id=current_user.id,
            diagnosis=review_in.diagnosis or "Clinical Evaluation Completed",
            validation_status=validation_status,
            expert_decision=decision,
            system_risk_level=original_system_risk,
            system_confidence=system_conf_str,
            modified_risk_level=review_in.modified_risk_level,
            comments=notes,
            expert_notes=notes,
            error_category=review_in.error_category,
            reviewed_at=now
        )
        db.add(review)
    else:
        review.expert_id = current_user.id
        review.diagnosis = review_in.diagnosis or review.diagnosis or "Clinical Evaluation Completed"
        review.validation_status = validation_status
        review.expert_decision = decision
        review.system_risk_level = original_system_risk
        review.system_confidence = system_conf_str
        review.modified_risk_level = review_in.modified_risk_level
        review.comments = notes
        review.expert_notes = notes
        review.error_category = review_in.error_category
        review.reviewed_at = now

    # Handle linked escalation
    escalation = db.query(Escalation).filter(
        Escalation.observation_id == review_in.observation_id
    ).first()
    if escalation:
        if decision == "REQUIRES_MORE_INFORMATION":
            escalation.status = "IN_REVIEW"
        else:
            escalation.status = "RESOLVED"
            escalation.resolved_at = now

    db.commit()
    db.refresh(review)

    try:
        log_audit(
            db=db,
            action="EXPERT_REVIEW_SUBMITTED",
            entity_type="EXPERT_REVIEW",
            user_id=current_user.id,
            entity_id=review.id,
            metadata={
                "observation_id": str(obs.id),
                "decision": decision,
                "error_category": review_in.error_category
            }
        )
    except Exception:
        pass

    return review
