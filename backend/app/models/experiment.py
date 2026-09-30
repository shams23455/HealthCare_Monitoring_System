import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Numeric, Text, DateTime, Integer, Uuid
from app.db.session import Base

class ExperimentMeasurement(Base):
    """
    Stores measurable empirical observations for the primary project experiment:
    Time from first symptom to useful expert review.
    Compares BASELINE (manual/less-structured reporting) vs PROPOSED (structured digital escalation).
    """
    __tablename__ = "experiment_measurements"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    trial_type = Column(String(50), nullable=False, index=True)  # BASELINE or PROPOSED
    case_id = Column(String(100), nullable=True)
    species = Column(String(100), nullable=True)
    first_symptom_at = Column(DateTime(timezone=True), nullable=True)
    expert_review_at = Column(DateTime(timezone=True), nullable=True)
    time_to_review_hours = Column(Numeric(6, 2), nullable=False)
    notes = Column(Text, nullable=True)
    source = Column(String(50), default="FIELD_MEASUREMENT", nullable=False)  # FIELD_MEASUREMENT, IMPORT, DEMO
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class StakeholderFeedback(Base):
    """
    Stores non-sensitive usability evaluation feedback from farmers, farm staff,
    and veterinary experts using a standard 1-5 Likert scale.
    """
    __tablename__ = "stakeholder_feedbacks"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    participant_type = Column(String(50), nullable=False, index=True)  # FARMER, FARM_STAFF, EXPERT
    ease_observation_capture = Column(Integer, nullable=False)  # 1 to 5
    ease_image_capture = Column(Integer, nullable=False)        # 1 to 5
    clarity_explanation = Column(Integer, nullable=False)       # 1 to 5
    ease_expert_review = Column(Integer, nullable=False)        # 1 to 5
    usefulness_offline_mode = Column(Integer, nullable=False)   # 1 to 5
    overall_usability = Column(Integer, nullable=False)         # 1 to 5
    tasks_performed = Column(Text, nullable=True)
    feedback_text = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
