import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Uuid
from sqlalchemy.orm import relationship
from app.db.session import Base

class Image(Base):
    __tablename__ = "images"

    id = Column(Uuid, primary_key=True, default=uuid.uuid4)
    observation_id = Column(Uuid, ForeignKey("observations.id", ondelete="CASCADE"), nullable=False, index=True)
    storage_path = Column(String(500), nullable=False)
    original_filename = Column(String(255), nullable=True)
    file_size = Column(Integer, nullable=True)  # in bytes
    width = Column(Integer, nullable=True)
    height = Column(Integer, nullable=True)
    image_type = Column(String(50), default="BODY")
    captured_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    upload_status = Column(String(50), default="PENDING")  # PENDING, UPLOADING, UPLOADED, FAILED
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    observation = relationship("Observation", back_populates="images")
