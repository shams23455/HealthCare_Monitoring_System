import hashlib
import statistics
from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
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
from app.models.experiment import ExperimentMeasurement, StakeholderFeedback
from app.schemas.experiment import (
    ExperimentMeasurementCreate,
    ExperimentMeasurementResponse,
    ExperimentImportRequest,
    StakeholderFeedbackCreate,
    StakeholderFeedbackResponse
)

router = APIRouter()

# 11 Systematic Error Categories per Project Specification Part 11
SYSTEMATIC_ERROR_CATEGORIES = [
    "POOR_IMAGE_QUALITY",
    "MISSING_SYMPTOMS",
    "INCORRECT_SYMPTOM_INFO",
    "ANIMAL_STAGE_MISSING",
    "LOCATION_MISSING",
    "LOW_CONFIDENCE",
    "RISK_OVER_ESTIMATION",
    "RISK_UNDER_ESTIMATION",
    "MODEL_EXPERT_DISAGREEMENT",
    "NETWORK_SYNC_FAILURE",
    "OTHER"
]

CATEGORY_DISPLAY_NAMES = {
    "POOR_IMAGE_QUALITY": "Poor image quality",
    "IMAGE_QUALITY": "Poor image quality",
    "MISSING_SYMPTOMS": "Missing symptoms",
    "SYMPTOM_MISSING": "Missing symptoms",
    "INCORRECT_SYMPTOM_INFO": "Incorrect symptom information",
    "SYMPTOM_AMBIGUITY": "Incorrect symptom information",
    "ANIMAL_STAGE_MISSING": "Animal stage missing",
    "STAGE_MISSING": "Animal stage missing",
    "LOCATION_MISSING": "Location missing",
    "LOW_CONFIDENCE": "Low confidence",
    "RISK_OVER_ESTIMATION": "Risk over-estimation",
    "RISK_UNDER_ESTIMATION": "Risk under-estimation",
    "MODEL_EXPERT_DISAGREEMENT": "Model/expert disagreement",
    "EXPERT_MODIFICATION": "Model/expert disagreement",
    "NETWORK_SYNC_FAILURE": "Network/sync failure",
    "SYNC_FAILURE": "Network/sync failure",
    "OTHER": "Other"
}


# ============================================================
# PART 10 & 11: Error Analysis Dashboard & Comparison
# ============================================================

@router.get("/error-analysis")
def get_error_analysis_metrics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Error analysis comparing System Assessment vs Expert Assessment.
    Groups systematic discrepancies by predefined error categories without fabrication.
    """
    reviews = db.query(ExpertReview).all()
    total_cases = len(reviews)

    correct_agreement_cases = 0
    modified_cases = 0
    low_confidence_cases = 0
    image_quality_errors = 0
    missing_info_cases = 0

    category_counts = {cat: 0 for cat in SYSTEMATIC_ERROR_CATEGORIES}

    for r in reviews:
        decision = r.expert_decision or r.validation_status or ""
        comp_cat = r.comparison_category or ""

        # Map agreement / disagreement
        if comp_cat == "AGREEMENT" or decision in ["VALIDATED", "CONFIRMED"]:
            correct_agreement_cases += 1
        elif comp_cat == "EXPERT_MODIFIED" or decision == "MODIFIED":
            modified_cases += 1

        if comp_cat == "LOW_CONFIDENCE" or (r.system_confidence and r.system_confidence.strip("%").isdigit() and int(r.system_confidence.strip("%")) < 60):
            low_confidence_cases += 1
            category_counts["LOW_CONFIDENCE"] += 1

        if comp_cat == "IMAGE_QUALITY_ISSUE" or r.error_category in ["IMAGE_QUALITY", "POOR_IMAGE_QUALITY"]:
            image_quality_errors += 1
            category_counts["POOR_IMAGE_QUALITY"] += 1

        if comp_cat == "INSUFFICIENT_INFORMATION" or decision == "REQUIRES_MORE_INFORMATION":
            missing_info_cases += 1
            category_counts["MISSING_SYMPTOMS"] += 1

        # Classify specific error category
        err_cat = r.error_category
        if err_cat:
            norm_cat = err_cat.upper()
            if norm_cat in category_counts:
                category_counts[norm_cat] += 1
            elif norm_cat in ["SYMPTOM_MISSING", "MISSING_SYMPTOMS"]:
                category_counts["MISSING_SYMPTOMS"] += 1
            elif norm_cat in ["SYMPTOM_AMBIGUITY", "INCORRECT_SYMPTOM_INFO"]:
                category_counts["INCORRECT_SYMPTOM_INFO"] += 1
            elif norm_cat in ["STAGE_MISSING", "ANIMAL_STAGE_MISSING"]:
                category_counts["ANIMAL_STAGE_MISSING"] += 1
            elif norm_cat in ["EXPERT_MODIFICATION", "MODEL_EXPERT_DISAGREEMENT"]:
                category_counts["MODEL_EXPERT_DISAGREEMENT"] += 1
            elif norm_cat in ["SYNC_FAILURE", "NETWORK_SYNC_FAILURE"]:
                category_counts["NETWORK_SYNC_FAILURE"] += 1
            else:
                category_counts["OTHER"] += 1

    disagreement_rate = (
        round((modified_cases / total_cases) * 100, 1)
        if total_cases > 0 else 0.0
    )

    return {
        "total_cases": total_cases,
        "total_reviewed_cases": total_cases,
        "correct_agreement_cases": correct_agreement_cases,
        "modified_cases": modified_cases,
        "expert_modifications_count": modified_cases,
        "low_confidence_cases": low_confidence_cases,
        "image_quality_errors": image_quality_errors,
        "missing_information_cases": missing_info_cases,
        "disagreement_rate_percent": disagreement_rate,
        "systematic_error_categories": category_counts,
        "category_breakdown": category_counts,
        "comparison_categories_summary": {
            "AGREEMENT": correct_agreement_cases,
            "EXPERT_MODIFIED": modified_cases,
            "LOW_CONFIDENCE": low_confidence_cases,
            "INSUFFICIENT_INFORMATION": missing_info_cases,
            "IMAGE_QUALITY_ISSUE": image_quality_errors
        },
        "evaluation_disclaimer": "Metrics derived from empirical reviews. No values are fabricated."
    }


# ============================================================
# PART 13 & 14: Primary Experiment & Review Time Analytics
# ============================================================

@router.get("/review-time")
def get_review_time_metrics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Primary project metric: Time from first symptom to useful expert review.
    Calculates: expert_review_completed_at - first_symptom_at.
    """
    completed_obs = db.query(Observation).filter(
        Observation.expert_review_completed_at.isnot(None),
        Observation.first_symptom_at.isnot(None)
    ).all()

    durations: List[float] = []
    for obs in completed_obs:
        delta = obs.expert_review_completed_at - obs.first_symptom_at
        durations.append(max(0.0, delta.total_seconds() / 3600.0))

    sample_size = len(durations)
    avg_hours = round(statistics.mean(durations), 2) if durations else None
    median_hours = round(statistics.median(durations), 2) if durations else None
    min_hours = round(min(durations), 2) if durations else None
    max_hours = round(max(durations), 2) if durations else None

    # Number of pending reviews
    pending_count = db.query(ExpertReview).filter(
        ExpertReview.validation_status == "PENDING"
    ).count()

    return {
        "metric_name": "Time from first symptom to useful expert review",
        "formula": "expert_review_completed_at - first_symptom_at",
        "sample_size": sample_size,
        "measured_value_hours": avg_hours,
        "average_time_hours": avg_hours,
        "median_time_hours": median_hours,
        "min_time_hours": min_hours,
        "max_time_hours": max_hours,
        "number_of_completed_reviews": sample_size,
        "number_of_pending_reviews": pending_count,
        "unit": "hours",
        "disclaimer": "Metrics calculated directly from observation and review database records."
    }


@router.get("/experiment/analytics")
def get_experiment_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Primary Before/After Experiment Analytics.
    Compares BASELINE (manual reporting) vs PROPOSED (digital escalation workflow).
    Calculates: baseline_review_time, proposed_review_time, improvement percentage.
    """
    baseline_records = db.query(ExperimentMeasurement).filter(
        ExperimentMeasurement.trial_type == "BASELINE"
    ).all()

    proposed_records = db.query(ExperimentMeasurement).filter(
        ExperimentMeasurement.trial_type == "PROPOSED"
    ).all()

    # Also include completed observations as proposed digital measurements if present
    completed_obs = db.query(Observation).filter(
        Observation.expert_review_completed_at.isnot(None),
        Observation.first_symptom_at.isnot(None)
    ).all()
    live_proposed_durations = [
        max(0.0, (o.expert_review_completed_at - o.first_symptom_at).total_seconds() / 3600.0)
        for o in completed_obs
    ]

    baseline_times = [float(b.time_to_review_hours) for b in baseline_records]
    proposed_times = [float(p.time_to_review_hours) for p in proposed_records] + live_proposed_durations

    baseline_avg = round(statistics.mean(baseline_times), 2) if baseline_times else None
    baseline_median = round(statistics.median(baseline_times), 2) if baseline_times else None
    baseline_min = round(min(baseline_times), 2) if baseline_times else None
    baseline_max = round(max(baseline_times), 2) if baseline_times else None

    proposed_avg = round(statistics.mean(proposed_times), 2) if proposed_times else None
    proposed_median = round(statistics.median(proposed_times), 2) if proposed_times else None
    proposed_min = round(min(proposed_times), 2) if proposed_times else None
    proposed_max = round(max(proposed_times), 2) if proposed_times else None

    improvement_pct = None
    if baseline_avg and proposed_avg and baseline_avg > 0:
        improvement_pct = round(((baseline_avg - proposed_avg) / baseline_avg) * 100, 1)

    pending_reviews = db.query(ExpertReview).filter(
        ExpertReview.validation_status == "PENDING"
    ).count()

    return {
        "metric_name": "Time from first symptom to useful expert review",
        "baseline": {
            "name": "Manual / Less-Structured Reporting",
            "sample_size": len(baseline_times),
            "average_review_time_hours": baseline_avg,
            "median_review_time_hours": baseline_median,
            "min_hours": baseline_min,
            "max_hours": baseline_max,
            "source_status": "Stakeholder Trial Baseline Measurements" if len(baseline_times) > 0 else "Pending measurement"
        },
        "proposed": {
            "name": "Digital Escalation Workflow",
            "sample_size": len(proposed_times),
            "average_review_time_hours": proposed_avg,
            "median_review_time_hours": proposed_median,
            "min_hours": proposed_min,
            "max_hours": proposed_max,
            "completed_reviews": len(proposed_times),
            "pending_reviews": pending_reviews,
            "source_status": "System Field Validation Records" if len(proposed_times) > 0 else "Pending measurement"
        },
        "improvement": {
            "hours_saved": round(baseline_avg - proposed_avg, 2) if (baseline_avg and proposed_avg) else None,
            "percentage_reduction": improvement_pct,
            "status": f"{improvement_pct}% reduction in time-to-review" if improvement_pct is not None else "Pending measurement"
        },
        "disclaimer": "Measurements based strictly on entered/recorded empirical trial timestamps without fabrication."
    }


@router.post("/experiment/measurements", response_model=ExperimentMeasurementResponse, status_code=status.HTTP_201_CREATED)
def record_experiment_measurement(
    measurement_in: ExperimentMeasurementCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Record a single trial measurement for the before/after experiment."""
    record = ExperimentMeasurement(
        trial_type=measurement_in.trial_type.upper(),
        case_id=measurement_in.case_id,
        species=measurement_in.species,
        first_symptom_at=measurement_in.first_symptom_at,
        expert_review_at=measurement_in.expert_review_at,
        time_to_review_hours=measurement_in.time_to_review_hours,
        notes=measurement_in.notes,
        source=measurement_in.source or "FIELD_MEASUREMENT"
    )
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


@router.post("/experiment/import", status_code=status.HTTP_201_CREATED)
def import_experiment_measurements(
    payload: ExperimentImportRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """Batch import experiment measurements from empirical testing or field logs."""
    created_records = []
    for item in payload.measurements:
        rec = ExperimentMeasurement(
            trial_type=item.trial_type.upper(),
            case_id=item.case_id,
            species=item.species,
            first_symptom_at=item.first_symptom_at,
            expert_review_at=item.expert_review_at,
            time_to_review_hours=item.time_to_review_hours,
            notes=item.notes,
            source=item.source or "IMPORT"
        )
        db.add(rec)
        created_records.append(rec)

    db.commit()
    return {
        "status": "success",
        "imported_count": len(created_records),
        "message": f"Successfully imported {len(created_records)} experimental measurements."
    }


@router.get("/experiment/measurements", response_model=List[ExperimentMeasurementResponse])
def get_experiment_measurements(
    trial_type: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve all experimental before/after measurements."""
    query = db.query(ExperimentMeasurement)
    if trial_type:
        query = query.filter(ExperimentMeasurement.trial_type == trial_type.upper())
    return query.order_by(ExperimentMeasurement.created_at.desc()).all()


# ============================================================
# PART 15 & 16: Stakeholder Validation & Feedback
# ============================================================

@router.post("/stakeholder/feedback", response_model=StakeholderFeedbackResponse, status_code=status.HTTP_201_CREATED)
def submit_stakeholder_feedback(
    feedback_in: StakeholderFeedbackCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Submits anonymous usability evaluation feedback on a 1-5 scale.
    Does NOT collect unnecessary personal information.
    """
    fb = StakeholderFeedback(
        participant_type=feedback_in.participant_type.upper(),
        ease_observation_capture=feedback_in.ease_observation_capture,
        ease_image_capture=feedback_in.ease_image_capture,
        clarity_explanation=feedback_in.clarity_explanation,
        ease_expert_review=feedback_in.ease_expert_review,
        usefulness_offline_mode=feedback_in.usefulness_offline_mode,
        overall_usability=feedback_in.overall_usability,
        tasks_performed=feedback_in.tasks_performed,
        feedback_text=feedback_in.feedback_text
    )
    db.add(fb)
    db.commit()
    db.refresh(fb)
    return fb


@router.get("/stakeholder/feedback", response_model=List[StakeholderFeedbackResponse])
def get_stakeholder_feedback(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Retrieve all submitted stakeholder validation feedback records."""
    return db.query(StakeholderFeedback).order_by(StakeholderFeedback.created_at.desc()).all()


@router.get("/stakeholder/summary")
def get_stakeholder_validation_summary(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """
    Computes average usability ratings per dimension across participant types.
    If no participants completed validation, explicitly reports 'Pending stakeholder validation'.
    """
    feedbacks = db.query(StakeholderFeedback).all()
    count = len(feedbacks)

    if count == 0:
        return {
            "validation_status": "Pending stakeholder validation",
            "participant_count": 0,
            "average_ratings": {
                "ease_observation_capture": None,
                "ease_image_capture": None,
                "clarity_explanation": None,
                "ease_expert_review": None,
                "usefulness_offline_mode": None,
                "overall_usability": None
            },
            "participant_breakdown": {},
            "recent_feedback": [],
            "note": "Awaiting field deployment stakeholder feedback. No feedback fabricated."
        }

    ease_obs = round(statistics.mean([f.ease_observation_capture for f in feedbacks]), 2)
    ease_img = round(statistics.mean([f.ease_image_capture for f in feedbacks]), 2)
    clarity = round(statistics.mean([f.clarity_explanation for f in feedbacks]), 2)
    ease_rev = round(statistics.mean([f.ease_expert_review for f in feedbacks]), 2)
    offline = round(statistics.mean([f.usefulness_offline_mode for f in feedbacks]), 2)
    overall = round(statistics.mean([f.overall_usability for f in feedbacks]), 2)

    participant_counts = {}
    for f in feedbacks:
        ptype = f.participant_type
        participant_counts[ptype] = participant_counts.get(ptype, 0) + 1

    recent = [
        {
            "participant_type": f.participant_type,
            "overall_usability": f.overall_usability,
            "feedback_text": f.feedback_text
        }
        for f in feedbacks[-5:]
        if f.feedback_text
    ]

    return {
        "validation_status": "Stakeholder validation in progress",
        "participant_count": count,
        "average_ratings": {
            "ease_observation_capture": ease_obs,
            "ease_image_capture": ease_img,
            "clarity_explanation": clarity,
            "ease_expert_review": ease_rev,
            "usefulness_offline_mode": offline,
            "overall_usability": overall
        },
        "participant_breakdown": participant_counts,
        "recent_feedback": recent,
        "note": "Empirical evaluation based on collected user ratings."
    }


# ============================================================
# General Dashboard & Anonymized Dataset Export
# ============================================================

@router.get("/dashboard")
def get_metrics_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> Dict[str, Any]:
    """Aggregated operational and clinical metrics dashboard for the application."""
    total_obs = db.query(Observation).count()
    high_risk_obs = db.query(Observation).filter(Observation.risk_level == "HIGH").count()
    pending_reviews = db.query(ExpertReview).filter(ExpertReview.validation_status == "PENDING").count()
    completed_reviews = db.query(ExpertReview).filter(ExpertReview.reviewed_at.isnot(None)).count()
    escalated_cases = db.query(Escalation).count()

    poor_images = db.query(Image).filter(Image.image_quality == "POOR").count()
    good_images = db.query(Image).filter(Image.image_quality == "GOOD").count()
    acceptable_images = db.query(Image).filter(Image.image_quality == "ACCEPTABLE").count()

    dup_prevented = db.query(AuditLog).filter(AuditLog.action == "OBSERVATION_IDEMPOTENT_REPLAY").count()

    # Time to review
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
            "baseline": "Manual reporting workflow (paper logs or informal messaging)",
            "proposed": "Structured digital observation, automated preliminary triage, and expert queue"
        }
    }


@router.get("/dataset/images")
def get_anonymized_image_dataset(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
) -> List[Dict[str, Any]]:
    """Reproducible dataset structure for project-created or ethically sourced images."""
    images = db.query(Image).join(Observation).all()
    dataset: List[Dict[str, Any]] = []

    for img in images:
        obs = img.observation
        animal = obs.animal if obs else None

        raw_id = f"ANIMAL_{animal.id if animal else 'ANON'}"
        anon_animal_id = hashlib.sha256(raw_id.encode()).hexdigest()[:12].upper()

        review = obs.reviews[0] if (obs and obs.reviews) else None

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
