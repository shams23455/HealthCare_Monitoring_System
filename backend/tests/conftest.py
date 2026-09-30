import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.db.session import Base, get_db
from app.models import (
    User, Animal, Observation, Image,
    DiseasePrediction, ExpertReview, Escalation,
    AuditLog, Symptom, ObservationSymptom
)
from app.main import app as fastapi_app

# Shared SQLite file engine for pytest across worker threads
SQLALCHEMY_DATABASE_URL = "sqlite:///./test_temp.db"

test_engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

def override_get_db():
    db = TestingSessionLocal()
    try:
        yield db
    finally:
        db.close()

fastapi_app.dependency_overrides[get_db] = override_get_db
test_client = TestClient(fastapi_app)

@pytest.fixture(autouse=True)
def reset_database():
    """Drops and recreates all tables, seeding default symptoms for tests."""
    Base.metadata.drop_all(bind=test_engine)
    Base.metadata.create_all(bind=test_engine)

    # Seed baseline symptoms
    db = TestingSessionLocal()
    try:
        symptoms = [
            "Fever", "Coughing", "Nasal discharge", "Reduced appetite",
            "Reduced activity", "Diarrhea", "Skin changes", "Swelling",
            "Difficulty walking", "Abnormal breathing", "Other"
        ]
        for s in symptoms:
            db.add(Symptom(name=s, description=f"Description for {s}", is_active=True))
        db.commit()
    finally:
        db.close()
    yield


