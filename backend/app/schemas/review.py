from datetime import datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel

class ReviewCreate(BaseModel):
    observation_id: UUID
    diagnosis: str
    validation_status: str  # VALIDATED, REJECTED, INCONCLUSIVE
    comments: Optional[str] = None

class EscalationUpdate(BaseModel):
    status: Optional[str] = None
    priority: Optional[str] = None
