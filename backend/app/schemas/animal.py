from datetime import date, datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, field_validator

ALLOWED_SPECIES = {"Cattle", "Goat", "Sheep", "Buffalo", "Other"}
ALLOWED_SEX = {"Male", "Female", "Unknown"}
ALLOWED_AGE_STAGES = {"Newborn", "Young", "Adult", "Senior", "Unknown"}

class AnimalBase(BaseModel):
    animal_tag: str
    species: str
    breed: Optional[str] = None
    sex: str
    date_of_birth: Optional[date] = None
    age_stage: str
    farm_location: str
    notes: Optional[str] = None
    is_active: bool = True

    @field_validator("animal_tag")
    @classmethod
    def validate_tag(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Please enter the animal tag.")
        return v

    @field_validator("species")
    @classmethod
    def validate_species(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Please select or enter the animal species.")
        # Normalize casing if matching allowed
        for allowed in ALLOWED_SPECIES:
            if v.lower() == allowed.lower():
                return allowed
        # Allow custom species if valid non-empty string
        return v

    @field_validator("sex")
    @classmethod
    def validate_sex(cls, v: str) -> str:
        v = v.strip()
        for allowed in ALLOWED_SEX:
            if v.lower() == allowed.lower():
                return allowed
        raise ValueError(f"Sex must be one of: {', '.join(sorted(ALLOWED_SEX))}.")

    @field_validator("age_stage")
    @classmethod
    def validate_age_stage(cls, v: str) -> str:
        v = v.strip()
        for allowed in ALLOWED_AGE_STAGES:
            if v.lower() == allowed.lower():
                return allowed
        # Also allow standard legacy like "ADULT"
        for allowed in ALLOWED_AGE_STAGES:
            if allowed.upper() == v.upper():
                return allowed
        return v

    @field_validator("farm_location")
    @classmethod
    def validate_location(cls, v: str) -> str:
        v = v.strip()
        if not v:
            raise ValueError("Please specify the farm location or pen for this animal.")
        return v

    @field_validator("date_of_birth")
    @classmethod
    def validate_dob(cls, v: Optional[date]) -> Optional[date]:
        if v and v > date.today():
            raise ValueError("Date of birth cannot be in the future.")
        return v

class AnimalCreate(AnimalBase):
    pass

class AnimalUpdate(BaseModel):
    breed: Optional[str] = None
    sex: Optional[str] = None
    date_of_birth: Optional[date] = None
    age_stage: Optional[str] = None
    farm_location: Optional[str] = None
    notes: Optional[str] = None
    is_active: Optional[bool] = None

    @field_validator("date_of_birth")
    @classmethod
    def validate_dob(cls, v: Optional[date]) -> Optional[date]:
        if v and v > date.today():
            raise ValueError("Date of birth cannot be in the future.")
        return v

    @field_validator("sex")
    @classmethod
    def validate_sex(cls, v: Optional[str]) -> Optional[str]:
        if v is not None:
            for allowed in ALLOWED_SEX:
                if v.lower() == allowed.lower():
                    return allowed
            raise ValueError(f"Sex must be one of: {', '.join(sorted(ALLOWED_SEX))}.")
        return v

class AnimalResponse(AnimalBase):
    id: UUID
    farmer_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True
