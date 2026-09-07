from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel

class SymptomBase(BaseModel):
    name: str
    description: Optional[str] = None
    is_active: bool = True

class SymptomResponse(SymptomBase):
    id: UUID
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class ObservationSymptomCreate(BaseModel):
    symptom_id: Optional[UUID] = None
    symptom_name: Optional[str] = None
    severity: str = "Moderate"  # Mild, Moderate, Severe
    duration: str = "Unknown"   # Less than 1 day, 1-3 days, 4-7 days, More than 7 days, Unknown

class ObservationSymptomResponse(BaseModel):
    id: UUID
    observation_id: UUID
    symptom_id: Optional[UUID] = None
    symptom_name: Optional[str] = None
    severity: str
    duration: str
    created_at: datetime

    class Config:
        from_attributes = True
