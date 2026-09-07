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
    comments = Column(Text, nullable=True)
    reviewed_at = Column(DateTime(timezone=True), nullable=True)

    observation = relationship("Observation", back_populates="reviews")
    expert = relationship("User", back_populates="reviews")
