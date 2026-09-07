from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user
from app.models.escalation import Escalation
from app.models.user import User
from app.schemas.observation import EscalationResponse

router = APIRouter()

@router.get("", response_model=List[EscalationResponse])
def get_escalations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    escalations = (
        db.query(Escalation)
        .order_by(Escalation.escalated_at.desc())
        .all()
    )
    return escalations
