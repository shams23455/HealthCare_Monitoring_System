from typing import List, Optional
from uuid import UUID
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user, get_current_farmer
from app.core.audit import log_audit
from app.models.animal import Animal
from app.models.user import User
from app.schemas.animal import AnimalCreate, AnimalUpdate, AnimalResponse

router = APIRouter()

@router.get("", response_model=List[AnimalResponse])
def get_animals(
    include_inactive: bool = Query(False, description="Whether to include deactivated animals"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Animal)
    if current_user.role == "FARMER":
        query = query.filter(Animal.farmer_id == current_user.id)
    
    if not include_inactive:
        query = query.filter(Animal.is_active == True)
        
    animals = query.order_by(Animal.created_at.desc()).all()
    return animals

@router.post("", response_model=AnimalResponse, status_code=status.HTTP_201_CREATED)
def create_animal(
    animal_in: AnimalCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_farmer)
):
    # Enforce uniqueness per farmer
    existing = db.query(Animal).filter(
        Animal.farmer_id == current_user.id,
        Animal.animal_tag == animal_in.animal_tag
    ).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"An animal with tag '{animal_in.animal_tag}' already exists on your farm."
        )

    animal = Animal(
        farmer_id=current_user.id,
        animal_tag=animal_in.animal_tag,
        species=animal_in.species,
        breed=animal_in.breed,
        sex=animal_in.sex,
        date_of_birth=animal_in.date_of_birth,
        age_stage=animal_in.age_stage,
        farm_location=animal_in.farm_location,
        notes=animal_in.notes,
        is_active=True
    )
    db.add(animal)
    db.commit()
    db.refresh(animal)

    try:
        log_audit(
            db=db,
            action="ANIMAL_CREATED",
            entity_type="ANIMAL",
            user_id=current_user.id,
            entity_id=animal.id,
            metadata={"animal_tag": animal.animal_tag, "species": animal.species}
        )
    except Exception:
        pass

    return animal

@router.get("/{animal_id}", response_model=AnimalResponse)
def get_animal(
    animal_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    animal = db.query(Animal).filter(Animal.id == animal_id).first()
    if not animal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Animal not found"
        )
    if current_user.role == "FARMER" and animal.farmer_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to this animal record"
        )
    return animal

@router.put("/{animal_id}", response_model=AnimalResponse)
def update_animal(
    animal_id: UUID,
    animal_in: AnimalUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_farmer)
):
    animal = db.query(Animal).filter(Animal.id == animal_id).first()
    if not animal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Animal not found"
        )
    if current_user.role == "FARMER" and animal.farmer_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to update this animal"
        )

    update_data = animal_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(animal, field, value)

    db.commit()
    db.refresh(animal)

    try:
        log_audit(
            db=db,
            action="ANIMAL_UPDATED",
            entity_type="ANIMAL",
            user_id=current_user.id,
            entity_id=animal.id,
            metadata={"updated_fields": list(update_data.keys())}
        )
    except Exception:
        pass

    return animal

@router.patch("/{animal_id}/deactivate", response_model=AnimalResponse)
def deactivate_animal(
    animal_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_farmer)
):
    animal = db.query(Animal).filter(Animal.id == animal_id).first()
    if not animal:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Animal not found"
        )
    if current_user.role == "FARMER" and animal.farmer_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied to deactivate this animal"
        )

    animal.is_active = False
    db.commit()
    db.refresh(animal)

    try:
        log_audit(
            db=db,
            action="ANIMAL_DEACTIVATED",
            entity_type="ANIMAL",
            user_id=current_user.id,
            entity_id=animal.id,
            metadata={"animal_tag": animal.animal_tag}
        )
    except Exception:
        pass

    return animal
