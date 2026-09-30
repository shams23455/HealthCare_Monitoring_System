import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Uuid
from sqlalchemy.orm import relationship
from app.db.session import Base

class ExpertReview(Base):
    __tablename__ = "expert_reviews"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    observation_id = Column(Uuid, ForeignKey("observations.id", ondelete="CASCADE"), nullable=False, index=True)
    expert_id = Column(Uuid, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    diagnosis = Column(String(255), nullable=True)
    validation_status = Column(String(50), nullable=False, default="PENDING", index=True)
    expert_decision = Column(String(50), nullable=True, default="VALIDATED", index=True)
    system_risk_level = Column(String(50), nullable=True)
    system_confidence = Column(String(20), nullable=True)
    modified_risk_level = Column(String(50), nullable=True)
    comments = Column(Text, nullable=True)
    expert_notes = Column(Text, nullable=True)
    comparison_category = Column(String(50), nullable=True, default="AGREEMENT", index=True)
    error_category = Column(String(50), nullable=True, index=True)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)

    observation = relationship("Observation", back_populates="reviews")
    expert = relationship("User", back_populates="reviews")
