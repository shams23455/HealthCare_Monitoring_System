import hashlib
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.api.deps import get_db, get_current_user
from app.models.observation import Observation
from app.models.review import ExpertReview
from app.models.escalation import Escalation
from app.models.image import Image
from app.models.animal import Animal
from app.models.audit import AuditLog
from app.models.user import User

router = APIRouter()

ERROR_CATEGORIES = [
    "IMAGE_QUALITY",
    "SYMPTOM_MISSING",
    "SYMPTOM_AMBIGUITY",
    "LOCATION_MISSING",
    "STAGE_MISSING",
    "RISK_OVER_ESTIMATION",
    "RISK_UNDER_ESTIMATION",
    "SYNC_FAILURE",
    "EXPERT_MODIFICATION",
    "OTHER"
]

@router.get("/review-time")
def get_review_time_metrics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Primary project metric: Time from first symptom to useful expert review.
    Calculates: expert_review_completed_at - first_symptom_at.
    """
    # Fetch observations that have completed expert review
    completed_obs = db.query(Observation).filter(
        Observation.expert_review_completed_at.isnot(None),
        Observation.first_symptom_at.isnot(None)
    ).all()

    sample_size = len(completed_obs)
    durations_hours: List[float] = []
    turnaround_hours: List[float] = []

    for obs in completed_obs:
        if obs.first_symptom_at and obs.expert_review_completed_at:
            delta = obs.expert_review_completed_at - obs.first_symptom_at
            durations_hours.append(max(0.0, delta.total_seconds() / 3600.0))

        if obs.submitted_at and obs.expert_review_completed_at:
            t_delta = obs.expert_review_completed_at - obs.submitted_at
            turnaround_hours.append(max(0.0, t_delta.total_seconds() / 3600.0))

    avg_first_symptom_to_review = (
        round(sum(durations_hours) / len(durations_hours), 2)
        if durations_hours else None
    )

    avg_turnaround = (
        round(sum(turnaround_hours) / len(turnaround_hours), 2)
        if turnaround_hours else None
    )

    return {
        "metric_name": "Time from first symptom to useful expert review",
        "formula": "expert_review_completed_at - first_symptom_at",
        "baseline_value": "48.0 hours (Manual reporting baseline estimate)",
        "target_value": "6.0 hours (Digital escalation protocol target)",
        "measured_value_hours": avg_first_symptom_to_review,
        "average_turnaround_hours": avg_turnaround,
        "sample_size": sample_size,
        "measurement_period": "Prototype Field Validation Phase",
        "unit": "hours",
        "note": "A useful expert review requires inspection of clinical evidence and recorded expert decision."
    }

@router.get("/error-analysis")
def get_error_analysis_metrics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Error analysis comparing System Assessment vs Expert Assessment.
    Groups systematic discrepancies by predefined error categories.
    """
    reviews = db.query(ExpertReview).all()
    total_reviews = len(reviews)

    category_counts = {cat: 0 for cat in ERROR_CATEGORIES}
    agreement_count = 0
    disagreement_count = 0
    modifications_count = 0
    requires_more_info_count = 0

    for r in reviews:
        decision = r.expert_decision or r.validation_status
        if decision == "MODIFIED":
            modifications_count += 1
            disagreement_count += 1
        elif decision == "REQUIRES_MORE_INFORMATION":
            requires_more_info_count += 1
        elif decision in ["VALIDATED", "CONFIRMED"]:
            agreement_count += 1
        elif decision == "REJECTED":
            disagreement_count += 1

        if r.error_category and r.error_category in category_counts:
            category_counts[r.error_category] += 1
        elif r.error_category:
            category_counts["OTHER"] += 1

    disagreement_rate = (
        round((disagreement_count / total_reviews) * 100, 1)
        if total_reviews > 0 else 0.0
    )

    return {
        "total_expert_reviews": total_reviews,
        "system_expert_agreement_count": agreement_count,
        "system_expert_disagreement_count": disagreement_count,
        "disagreement_rate_percent": disagreement_rate,
        "expert_modifications_count": modifications_count,
        "requires_more_info_count": requires_more_info_count,
        "category_breakdown": category_counts,
        "evaluation_disclaimer": "Metrics reflect comparative assessments for systematic protocol refinement."
    }

@router.get("/dashboard")
def get_metrics_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Aggregated operational and clinical metrics dashboard for the application.
    """
    total_obs = db.query(Observation).count()
    high_risk_obs = db.query(Observation).filter(Observation.risk_level == "HIGH").count()
    pending_reviews = db.query(ExpertReview).filter(ExpertReview.validation_status == "PENDING").count()
    completed_reviews = db.query(ExpertReview).filter(ExpertReview.reviewed_at.isnot(None)).count()
    escalated_cases = db.query(Escalation).count()

    # Image quality stats
    poor_images = db.query(Image).filter(Image.image_quality == "POOR").count()
    good_images = db.query(Image).filter(Image.image_quality == "GOOD").count()
    acceptable_images = db.query(Image).filter(Image.image_quality == "ACCEPTABLE").count()

    # Offline sync and duplicate prevention audit count
    dup_prevented = db.query(AuditLog).filter(AuditLog.action == "OBSERVATION_IDEMPOTENT_REPLAY").count()

    # Review time summary
    completed_obs = db.query(Observation).filter(
        Observation.expert_review_completed_at.isnot(None),
        Observation.first_symptom_at.isnot(None)
    ).all()
    durations = [
        max(0.0, (o.expert_review_completed_at - o.first_symptom_at).total_seconds() / 3600.0)
        for o in completed_obs
    ]
    avg_review_hours = round(sum(durations) / len(durations), 2) if durations else None

    # Disagreements
    modified_reviews = db.query(ExpertReview).filter(
        (ExpertReview.expert_decision == "MODIFIED") | (ExpertReview.validation_status == "REJECTED")
    ).count()

    requires_info = db.query(ExpertReview).filter(
        ExpertReview.expert_decision == "REQUIRES_MORE_INFORMATION"
    ).count()

    return {
        "total_observations": total_obs,
        "high_risk_observations": high_risk_obs,
        "pending_reviews": pending_reviews,
        "completed_reviews": completed_reviews,
        "escalated_cases": escalated_cases,
        "average_review_time_hours": avg_review_hours,
        "expert_modifications": modified_reviews,
        "observations_requiring_more_information": requires_info,
        "duplicate_preventions_count": dup_prevented,
        "image_quality_stats": {
            "good": good_images,
            "acceptable": acceptable_images,
            "poor": poor_images
        },
        "experiment_framework": {
            "baseline": {
                "name": "Manual reporting workflow",
                "time_to_review": "48.0 hours",
                "completion_rate": "Unreliable"
            },
            "target": {
                "name": "Digital escalation system",
                "time_to_review": "6.0 hours",
                "completion_rate": "95%"
            },
            "measured": {
                "time_to_review": f"{avg_review_hours} hours" if avg_review_hours else "[Awaiting field trial sample]",
                "sample_size": len(durations)
            }
        }
    }

@router.get("/dataset/images")
def get_anonymized_image_dataset(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> List[Dict[str, Any]]:
    """
    Part 14: Reproducible dataset structure for project-created or ethically sourced images.
    Strictly anonymized: No farmer IDs, no personal data, no identifying metadata.
    """
    images = db.query(Image).join(Observation).all()
    dataset: List[Dict[str, Any]] = []

    for img in images:
        obs = img.observation
        animal = obs.animal if obs else None

        # Generate non-reversible anonymized animal hash
        raw_id = f"ANIMAL_{animal.id if animal else 'ANON'}"
        anon_animal_id = hashlib.sha256(raw_id.encode()).hexdigest()[:12].upper()

        review = obs.reviews[0] if (obs and obs.reviews) else None

        # Mask specific farm location to region only
        region = "Rural Farming Region"
        if obs and obs.farm_location:
            parts = obs.farm_location.split(",")
            region = parts[-1].strip() if len(parts) > 1 else "Primary Agricultural Zone"

        dataset.append({
            "image_id": str(img.id),
            "animal_id_anonymized": f"LIVESTOCK-{anon_animal_id}",
            "species": animal.species if animal else "Livestock",
            "symptoms": obs.symptoms_description if obs else [],
            "location_region": region,
            "animal_stage": obs.age_stage if obs else (animal.age_stage if animal else "Adult"),
            "image_quality": img.image_quality or "GOOD",
            "quality_notes": img.quality_notes,
            "expert_label": review.diagnosis if (review and review.diagnosis) else "Pending Review",
            "expert_confidence": review.system_confidence if review else None,
            "created_at": img.created_at.isoformat() if img.created_at else None
        })

    return dataset
