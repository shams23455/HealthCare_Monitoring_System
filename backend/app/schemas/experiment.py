from datetime import datetime
from typing import Optional, List, Dict, Any
from uuid import UUID
from pydantic import BaseModel, Field

class ExperimentMeasurementCreate(BaseModel):
    trial_type: str = Field(..., description="BASELINE (manual) or PROPOSED (digital escalation)")
    case_id: Optional[str] = None
    species: Optional[str] = None
    first_symptom_at: Optional[datetime] = None
    expert_review_at: Optional[datetime] = None
    time_to_review_hours: float = Field(..., ge=0.0, description="Elapsed hours from first symptom to expert review")
    notes: Optional[str] = None
    source: Optional[str] = "FIELD_MEASUREMENT"

class ExperimentMeasurementResponse(BaseModel):
    id: UUID
    trial_type: str
    case_id: Optional[str] = None
    species: Optional[str] = None
    first_symptom_at: Optional[datetime] = None
    expert_review_at: Optional[datetime] = None
    time_to_review_hours: float
    notes: Optional[str] = None
    source: str
    created_at: datetime

    class Config:
        from_attributes = True

class ExperimentImportRequest(BaseModel):
    measurements: List[ExperimentMeasurementCreate]

class StakeholderFeedbackCreate(BaseModel):
    participant_type: str = Field(..., description="FARMER, FARM_STAFF, or EXPERT")
    ease_observation_capture: int = Field(..., ge=1, le=5)
    ease_image_capture: int = Field(..., ge=1, le=5)
    clarity_explanation: int = Field(..., ge=1, le=5)
    ease_expert_review: int = Field(..., ge=1, le=5)
    usefulness_offline_mode: int = Field(..., ge=1, le=5)
    overall_usability: int = Field(..., ge=1, le=5)
    tasks_performed: Optional[str] = None
    feedback_text: Optional[str] = None

class StakeholderFeedbackResponse(BaseModel):
    id: UUID
    participant_type: str
    ease_observation_capture: int
    ease_image_capture: int
    clarity_explanation: int
    ease_expert_review: int
    usefulness_offline_mode: int
    overall_usability: int
    tasks_performed: Optional[str] = None
    feedback_text: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True
