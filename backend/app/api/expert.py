from typing import List
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user, get_current_expert
from app.models.review import ExpertReview
from app.models.escalation import Escalation
from app.models.user import User
from app.schemas.observation import ReviewResponse
from app.schemas.review import ReviewCreate

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
    review = db.query(ExpertReview).filter(
        ExpertReview.observation_id == review_in.observation_id
    ).first()

    if not review:
        review = ExpertReview(
            observation_id=review_in.observation_id,
            expert_id=current_user.id,
            diagnosis=review_in.diagnosis,
            validation_status=review_in.validation_status,
            comments=review_in.comments,
            reviewed_at=datetime.now(timezone.utc)
        )
        db.add(review)
    else:
        review.expert_id = current_user.id
        review.diagnosis = review_in.diagnosis
        review.validation_status = review_in.validation_status
        review.comments = review_in.comments
        review.reviewed_at = datetime.now(timezone.utc)

    # Resolve linked escalation
    escalation = db.query(Escalation).filter(
        Escalation.observation_id == review_in.observation_id
    ).first()
    if escalation:
        escalation.status = "RESOLVED"
        escalation.resolved_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(review)
    return review
