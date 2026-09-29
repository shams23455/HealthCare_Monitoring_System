from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel

class ReviewCreate(BaseModel):
    observation_id: UUID
    diagnosis: Optional[str] = None
    validation_status: Optional[str] = "VALIDATED"  # VALIDATED, REJECTED, INCONCLUSIVE
    expert_decision: Optional[str] = "VALIDATED"  # VALIDATED, MODIFIED, REQUIRES_MORE_INFORMATION, NOT_ACTIONABLE
    comments: Optional[str] = None
    expert_notes: Optional[str] = None
    modified_risk_level: Optional[str] = None
    error_category: Optional[str] = None

class EscalationUpdate(BaseModel):
    status: Optional[str] = None
    priority: Optional[str] = None
