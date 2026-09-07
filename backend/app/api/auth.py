from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from app.api.deps import get_db, get_current_user
from app.core.security import get_password_hash, verify_password, create_access_token
from app.core.audit import log_audit
from app.models.user import User
from app.schemas.user import UserCreate, UserProfileUpdate, UserResponse, Token

router = APIRouter()

@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    # Enforce allowed public registration role (strictly FARMER)
    role_upper = user_in.role.upper()
    if role_upper != "FARMER":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Public registration is strictly permitted for FARMER accounts. Expert and Admin accounts must be provisioned by an administrator."
        )

    existing_user = db.query(User).filter(User.email == user_in.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists."
        )
    
    new_user = User(
        name=user_in.name,
        email=user_in.email,
        password_hash=get_password_hash(user_in.password),
        role="FARMER",
        phone=user_in.phone
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Record audit log
    try:
        log_audit(
            db=db,
            action="USER_REGISTER",
            entity_type="USER",
            user_id=new_user.id,
            entity_id=new_user.id,
            metadata={"email": new_user.email, "role": new_user.role}
        )
    except Exception:
        pass

    access_token = create_access_token(subject=new_user.id, role=new_user.role)
    return Token(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(new_user)
    )

@router.post("/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == form_data.username).first()
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Record audit log
    try:
        log_audit(
            db=db,
            action="USER_LOGIN",
            entity_type="USER",
            user_id=user.id,
            entity_id=user.id,
            metadata={"email": user.email, "role": user.role}
        )
    except Exception:
        pass

    access_token = create_access_token(subject=user.id, role=user.role)
    return Token(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse.model_validate(user)
    )

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@router.put("/profile", response_model=UserResponse)
def update_profile(
    profile_in: UserProfileUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    update_data = profile_in.model_dump(exclude_unset=True)
    if "name" in update_data and update_data["name"] is not None:
        current_user.name = update_data["name"]
    if "phone" in update_data:
        current_user.phone = update_data["phone"]

    db.commit()
    db.refresh(current_user)

    try:
        log_audit(
            db=db,
            action="PROFILE_UPDATED",
            entity_type="USER",
            user_id=current_user.id,
            entity_id=current_user.id,
            metadata={"updated_fields": list(update_data.keys())}
        )
    except Exception:
        pass

    return current_user
