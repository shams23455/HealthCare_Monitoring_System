import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Numeric, Text, DateTime, ForeignKey, Uuid
from sqlalchemy.orm import relationship
from app.db.session import Base

class DiseasePrediction(Base):
    __tablename__ = "disease_predictions"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    observation_id = Column(Uuid, ForeignKey("observations.id", ondelete="CASCADE"), nullable=False, index=True)
    predicted_condition = Column(String(255), nullable=False)
    confidence_score = Column(Numeric(3, 2), nullable=False)
    prediction_source = Column(String(100), default="RULE_ENGINE")
    explanation = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    observation = relationship("Observation", back_populates="predictions")
