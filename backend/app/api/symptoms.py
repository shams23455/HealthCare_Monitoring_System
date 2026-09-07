from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.api.deps import get_db
from app.models.symptom import Symptom
from app.schemas.symptom import SymptomResponse

router = APIRouter()

@router.get("", response_model=List[SymptomResponse])
def get_active_symptoms(db: Session = Depends(get_db)):
    """Returns active structured symptoms catalog for observation forms."""
    symptoms = db.query(Symptom).filter(Symptom.is_active == True).order_by(Symptom.name.asc()).all()
    return symptoms
