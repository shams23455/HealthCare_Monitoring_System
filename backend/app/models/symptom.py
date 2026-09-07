import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, Boolean, DateTime, ForeignKey, Uuid
from sqlalchemy.orm import relationship
from app.db.session import Base

class Symptom(Base):
    __tablename__ = "symptoms"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    name = Column(String(100), unique=True, nullable=False, index=True)
    description = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    observation_associations = relationship("ObservationSymptom", back_populates="symptom")

class ObservationSymptom(Base):
    __tablename__ = "observation_symptoms"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    observation_id = Column(Uuid, ForeignKey("observations.id", ondelete="CASCADE"), nullable=False, index=True)
    symptom_id = Column(Uuid, ForeignKey("symptoms.id", ondelete="SET NULL"), nullable=True, index=True)
    symptom_name = Column(String(100), nullable=True)
    severity = Column(String(50), nullable=False, default="Moderate")  # Mild, Moderate, Severe
    duration = Column(String(50), nullable=False, default="Unknown")   # <1 day, 1-3 days, 4-7 days, >7 days, Unknown
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    observation = relationship("Observation", back_populates="observation_symptoms")
    symptom = relationship("Symptom", back_populates="observation_associations")
