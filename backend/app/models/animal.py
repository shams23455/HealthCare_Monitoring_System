import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Date, DateTime, ForeignKey, Uuid, Boolean, Text
from sqlalchemy.orm import relationship
from app.db.session import Base

class Animal(Base):
    __tablename__ = "animals"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    farmer_id = Column(Uuid, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    animal_tag = Column(String(100), nullable=False, index=True)
    species = Column(String(100), nullable=False, index=True)
    breed = Column(String(100), nullable=True)
    sex = Column(String(20), nullable=False)
    date_of_birth = Column(Date, nullable=True)
    age_stage = Column(String(50), nullable=False)
    farm_location = Column(String(255), nullable=False)
    notes = Column(Text, nullable=True)
    is_active = Column(Boolean, default=True, nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    farmer = relationship("User", back_populates="animals")
    observations = relationship("Observation", back_populates="animal", cascade="all, delete-orphan")
