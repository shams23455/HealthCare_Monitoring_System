import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Uuid
from sqlalchemy.orm import relationship
from app.db.session import Base

class Escalation(Base):
    __tablename__ = "escalations"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    observation_id = Column(Uuid, ForeignKey("observations.id", ondelete="CASCADE"), nullable=False, index=True)
    priority = Column(String(20), nullable=False, default="MEDIUM", index=True)
    reason = Column(Text, nullable=False)
    status = Column(String(50), nullable=False, default="OPEN", index=True)
    escalated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    resolved_at = Column(DateTime(timezone=True), nullable=True)

    observation = relationship("Observation", back_populates="escalations")
