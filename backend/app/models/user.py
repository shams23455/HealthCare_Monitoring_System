import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, DateTime, Uuid
from sqlalchemy.orm import relationship
from app.db.session import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(50), nullable=False, default="FARMER", index=True)
    phone = Column(String(50), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    animals = relationship("Animal", back_populates="farmer", cascade="all, delete-orphan")
    observations = relationship("Observation", back_populates="recorder", cascade="all, delete-orphan")
    reviews = relationship("ExpertReview", back_populates="expert")
    audit_logs = relationship("AuditLog", back_populates="user")
