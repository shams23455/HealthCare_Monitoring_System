import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Numeric, Text, DateTime, ForeignKey, JSON, Uuid, UniqueConstraint
from sqlalchemy.orm import relationship
from app.db.session import Base

class Observation(Base):
    __tablename__ = "observations"
    __table_args__ = (
        UniqueConstraint("recorded_by", "client_observation_id", name="uq_farmer_client_obs_id"),
    )

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    client_observation_id = Column(String(100), nullable=True, index=True)
    animal_id = Column(Uuid, ForeignKey("animals.id", ondelete="CASCADE"), nullable=False, index=True)
    recorded_by = Column(Uuid, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    first_symptom_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False, index=True)
    observation_date = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), index=True)
    observed_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), nullable=False)
    symptoms_description = Column(JSON, default=list)
    temperature = Column(Numeric(4, 1), nullable=True)
    temperature_unit = Column(String(10), default="C", nullable=False)
    appetite_status = Column(String(50), nullable=False)
    activity_status = Column(String(50), nullable=False)
    farm_location = Column(String(255), nullable=True)
    animal_location = Column(String(255), nullable=True)
    age_stage = Column(String(50), nullable=True)
    notes = Column(Text, nullable=True)
    risk_level = Column(String(20), nullable=False, default="UNKNOWN", index=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    animal = relationship("Animal", back_populates="observations")
    recorder = relationship("User", back_populates="observations")
    observation_symptoms = relationship("ObservationSymptom", back_populates="observation", cascade="all, delete-orphan")
    images = relationship("Image", back_populates="observation", cascade="all, delete-orphan")
    predictions = relationship("DiseasePrediction", back_populates="observation", cascade="all, delete-orphan")
    reviews = relationship("ExpertReview", back_populates="observation", cascade="all, delete-orphan")
    escalations = relationship("Escalation", back_populates="observation", cascade="all, delete-orphan")
