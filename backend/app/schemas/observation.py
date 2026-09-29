from datetime import datetime, timezone
from typing import Optional, List
from uuid import UUID
from pydantic import BaseModel, field_validator, model_validator
from app.schemas.animal import AnimalResponse
from app.schemas.symptom import ObservationSymptomCreate, ObservationSymptomResponse

class ImageBase(BaseModel):
    storage_path: str
    original_filename: Optional[str] = None
    file_size: Optional[int] = None
    width: Optional[int] = None
    height: Optional[int] = None
    image_type: Optional[str] = "BODY"
    upload_status: Optional[str] = "UPLOADED"
    image_quality: Optional[str] = "GOOD"
    quality_notes: Optional[str] = None

class ImageResponse(ImageBase):
    id: UUID
    observation_id: UUID
    captured_at: datetime

    class Config:
        from_attributes = True

class PredictionResponse(BaseModel):
    id: UUID
    observation_id: UUID
    predicted_condition: str
    confidence_score: float
    prediction_source: str
    explanation: str
    created_at: datetime

    class Config:
        from_attributes = True

class ReviewResponse(BaseModel):
    id: UUID
    observation_id: UUID
    expert_id: Optional[UUID] = None
    diagnosis: Optional[str] = None
    validation_status: str
    expert_decision: Optional[str] = "VALIDATED"
    system_risk_level: Optional[str] = None
    system_confidence: Optional[str] = None
    modified_risk_level: Optional[str] = None
    comments: Optional[str] = None
    expert_notes: Optional[str] = None
    error_category: Optional[str] = None
    reviewed_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class EscalationResponse(BaseModel):
    id: UUID
    observation_id: UUID
    priority: str
    reason: str
    status: str
    escalated_at: datetime
    resolved_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class ObservationBase(BaseModel):
    client_observation_id: Optional[str] = None
    animal_id: UUID
    first_symptom_at: Optional[datetime] = None
    observation_date: Optional[datetime] = None
    observed_at: Optional[datetime] = None
    symptoms_description: List[str] = []
    temperature: Optional[float] = None
    temperature_unit: str = "C"
    appetite_status: str
    activity_status: str
    farm_location: Optional[str] = None
    animal_location: Optional[str] = None
    age_stage: Optional[str] = None
    notes: Optional[str] = None

    @field_validator("first_symptom_at")
    @classmethod
    def validate_first_symptom_at(cls, v: Optional[datetime]) -> Optional[datetime]:
        if v:
            # Ensure timezone awareness comparison
            now = datetime.now(timezone.utc)
            v_cmp = v if v.tzinfo else v.replace(tzinfo=timezone.utc)
            if v_cmp > now:
                raise ValueError("First noticed symptoms date/time cannot be in the future.")
        return v

    @field_validator("temperature")
    @classmethod
    def validate_temperature(cls, v: Optional[float]) -> Optional[float]:
        if v is not None:
            if v < 25.0 or v > 48.0:
                raise ValueError("Temperature value is out of physiological range (must be between 25°C and 48°C).")
        return v

    @model_validator(mode="after")
    def validate_timestamps(self):
        if self.first_symptom_at and self.observed_at:
            f_cmp = self.first_symptom_at if self.first_symptom_at.tzinfo else self.first_symptom_at.replace(tzinfo=timezone.utc)
            o_cmp = self.observed_at if self.observed_at.tzinfo else self.observed_at.replace(tzinfo=timezone.utc)
            if o_cmp < f_cmp:
                raise ValueError("Observation recorded time cannot be earlier than first observed symptom time.")
        return self

class ObservationCreate(ObservationBase):
    structured_symptoms: Optional[List[ObservationSymptomCreate]] = None

class ObservationResponse(ObservationBase):
    id: UUID
    recorded_by: UUID
    first_symptom_at: datetime
    observation_date: datetime
    observed_at: datetime
    risk_level: str
    system_confidence: Optional[float] = None
    explanation_factors: Optional[List[str]] = []
    recommended_action: Optional[str] = None
    submitted_at: Optional[datetime] = None
    expert_review_started_at: Optional[datetime] = None
    expert_review_completed_at: Optional[datetime] = None
    created_at: datetime
    animal: Optional[AnimalResponse] = None
    observation_symptoms: List[ObservationSymptomResponse] = []
    images: List[ImageResponse] = []
    predictions: List[PredictionResponse] = []
    reviews: List[ReviewResponse] = []
    escalations: List[EscalationResponse] = []

    class Config:
        from_attributes = True
