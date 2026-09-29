import io
import uuid
from datetime import datetime, timezone, timedelta
from PIL import Image as PILImage
from app.core.risk import RuleBasedRiskEngine, RiskAssessmentEngine, default_risk_engine
from tests.conftest import test_client as client

def test_risk_engine_architecture_and_explainability():
    """Verify RiskAssessmentEngine interface, RuleBasedRiskEngine factors, and transparent explanations."""
    assert isinstance(default_risk_engine, RiskAssessmentEngine)

    result = default_risk_engine.assess(
        symptoms=["Fever", "Nasal discharge"],
        temperature=40.2,
        appetite_status="POOR",
        activity_status="LETHARGIC",
        age_stage="Young"
    )

    assert result.risk_level == "HIGH"
    assert result.confidence >= 0.8
    assert len(result.factors) >= 3
    assert "Preliminary risk assessment" in result.disclaimer
    assert "Isolate animal from herd" in result.recommended_action

    # Low risk test
    low_res = default_risk_engine.assess(
        symptoms=[],
        temperature=38.3,
        appetite_status="NORMAL",
        activity_status="ACTIVE",
        age_stage="Adult"
    )
    assert low_res.risk_level == "LOW"
    assert low_res.confidence >= 0.9
    assert "healthy vitality" in low_res.explanation.lower()

def test_image_quality_assessment_and_storage():
    """Verify image quality status (GOOD, ACCEPTABLE, POOR) on upload."""
    reg_res = client.post("/api/auth/register", json={
        "name": "Quality Farmer",
        "email": "quality@farm.com",
        "password": "Password123!",
        "confirm_password": "Password123!"
    })
    headers = {"Authorization": f"Bearer {reg_res.json()['access_token']}"}

    # Create animal
    animal_res = client.post("/api/animals", json={
        "animal_tag": "QUAL-01",
        "species": "Cattle",
        "sex": "Female",
        "age_stage": "Adult",
        "farm_location": "Field North"
    }, headers=headers)
    animal_id = animal_res.json()["id"]

    # Create observation
    obs_res = client.post("/api/observations", json={
        "animal_id": animal_id,
        "appetite_status": "NORMAL",
        "activity_status": "NORMAL"
    }, headers=headers)
    obs_id = obs_res.json()["id"]

    # Create good image (800x600 with varied pattern)
    good_img = PILImage.new("RGB", (800, 600), color=(120, 180, 200))
    for x in range(0, 800, 40):
        for y in range(0, 600, 40):
            good_img.putpixel((x, y), (255, 0, 0))
    good_buf = io.BytesIO()
    good_img.save(good_buf, format="JPEG")
    good_buf.seek(0)

    good_res = client.post(
        f"/api/observations/{obs_id}/images",
        files={"file": ("good_photo.jpg", good_buf.getvalue(), "image/jpeg")},
        data={"image_type": "BODY"},
        headers=headers
    )
    assert good_res.status_code == 201
    good_data = good_res.json()
    assert good_data["image_quality"] in ["GOOD", "ACCEPTABLE"]

def create_test_expert():
    from tests.conftest import TestingSessionLocal
    from app.models.user import User
    from app.core.security import get_password_hash
    db = TestingSessionLocal()
    existing = db.query(User).filter(User.email == "expert@example.com").first()
    if not existing:
        expert = User(
            name="Dr. Sarah Jenkins",
            email="expert@example.com",
            password_hash=get_password_hash("expert123"),
            role="EXPERT"
        )
        db.add(expert)
        db.commit()
    db.close()

def test_expert_review_and_time_to_review_metric():
    """
    Test complete expert review flow:
    - Mark review started
    - Submit expert decision (MODIFIED / VALIDATED)
    - Preserve original system assessment
    - Calculate time from first symptom to review
    """
    # 1. Register Farmer & Seed/Login Expert
    farmer_res = client.post("/api/auth/register", json={
        "name": "Timestamp Farmer",
        "email": "ts_farmer@farm.com",
        "password": "Password123!",
        "confirm_password": "Password123!"
    })
    farmer_headers = {"Authorization": f"Bearer {farmer_res.json()['access_token']}"}

    create_test_expert()
    expert_res = client.post("/api/auth/login", data={
        "username": "expert@example.com",
        "password": "expert123"
    })
    expert_headers = {"Authorization": f"Bearer {expert_res.json()['access_token']}"}

    # 2. Register Animal
    animal_res = client.post("/api/animals", json={
        "animal_tag": "TS-ANIMAL",
        "species": "Goat",
        "sex": "Male",
        "age_stage": "Young",
        "farm_location": "Sector 4"
    }, headers=farmer_headers)
    animal_id = animal_res.json()["id"]

    # 3. Create High Risk Observation with known first_symptom_at
    past_time = (datetime.now(timezone.utc) - timedelta(hours=4)).isoformat()
    obs_res = client.post("/api/observations", json={
        "animal_id": animal_id,
        "first_symptom_at": past_time,
        "symptoms_description": ["Fever", "Diarrhea"],
        "temperature": 40.5,
        "appetite_status": "POOR",
        "activity_status": "LETHARGIC"
    }, headers=farmer_headers)
    assert obs_res.status_code == 201
    obs_data = obs_res.json()
    obs_id = obs_data["id"]
    assert obs_data["risk_level"] == "HIGH"
    assert obs_data["submitted_at"] is not None

    # 4. Expert starts review
    start_res = client.post(f"/api/observations/{obs_id}/start-review", headers=expert_headers)
    assert start_res.status_code == 200
    assert start_res.json()["expert_review_started_at"] is not None

    # 5. Expert submits review with decision MODIFIED & error category
    review_res = client.post("/api/expert/reviews", json={
        "observation_id": obs_id,
        "diagnosis": "Bacterial Enteritis",
        "expert_decision": "MODIFIED",
        "validation_status": "MODIFIED",
        "modified_risk_level": "MEDIUM",
        "comments": "Confirmed enteritis; isolate and administer electrolytes.",
        "expert_notes": "Reduced to MEDIUM following rehydration response.",
        "error_category": "RISK_OVER_ESTIMATION"
    }, headers=expert_headers)
    assert review_res.status_code == 201
    rev_data = review_res.json()
    assert rev_data["expert_decision"] == "MODIFIED"
    assert rev_data["system_risk_level"] == "HIGH"
    assert rev_data["modified_risk_level"] == "MEDIUM"
    assert rev_data["error_category"] == "RISK_OVER_ESTIMATION"

    # 6. Verify observation updated with completed timestamp and modified risk
    updated_obs = client.get(f"/api/observations/{obs_id}", headers=farmer_headers).json()
    assert updated_obs["expert_review_completed_at"] is not None
    assert updated_obs["risk_level"] == "MEDIUM"

    # 7. Check metrics endpoint /api/metrics/review-time
    metric_res = client.get("/api/metrics/review-time", headers=expert_headers)
    assert metric_res.status_code == 200
    m_data = metric_res.json()
    assert m_data["sample_size"] >= 1
    assert m_data["measured_value_hours"] is not None
    assert m_data["measured_value_hours"] >= 3.0  # since first_symptom_at was 4 hours ago

    # 8. Check error analysis endpoint /api/metrics/error-analysis
    err_res = client.get("/api/metrics/error-analysis", headers=expert_headers)
    assert err_res.status_code == 200
    err_data = err_res.json()
    assert err_data["category_breakdown"]["RISK_OVER_ESTIMATION"] >= 1
    assert err_data["expert_modifications_count"] >= 1

    # 9. Check dashboard metrics endpoint /api/metrics/dashboard
    dash_res = client.get("/api/metrics/dashboard", headers=expert_headers)
    assert dash_res.status_code == 200
    dash_data = dash_res.json()
    assert dash_data["total_observations"] >= 1
    assert dash_data["completed_reviews"] >= 1
    assert "baseline" in dash_data["experiment_framework"]

def test_edge_case_duplicate_sync_idempotency_retry():
    """Verify backend idempotency prevents duplicate observation rows on sync replay."""
    reg_res = client.post("/api/auth/register", json={
        "name": "Sync Farmer",
        "email": "sync_farmer@farm.com",
        "password": "Password123!",
        "confirm_password": "Password123!"
    })
    headers = {"Authorization": f"Bearer {reg_res.json()['access_token']}"}

    animal_res = client.post("/api/animals", json={
        "animal_tag": "SYNC-01",
        "species": "Sheep",
        "sex": "Female",
        "age_stage": "Adult",
        "farm_location": "Paddock A"
    }, headers=headers)
    animal_id = animal_res.json()["id"]

    client_obs_id = str(uuid.uuid4())
    payload = {
        "client_observation_id": client_obs_id,
        "animal_id": animal_id,
        "appetite_status": "NORMAL",
        "activity_status": "ACTIVE",
        "symptoms_description": ["Coughing"]
    }

    # 1. First sync submission
    res1 = client.post("/api/observations", json=payload, headers=headers)
    assert res1.status_code == 201
    id1 = res1.json()["id"]

    # 2. Duplicate sync replay (retry)
    res2 = client.post("/api/observations", json=payload, headers=headers)
    assert res2.status_code in [200, 201]
    id2 = res2.json()["id"]

    # Must return exact same observation ID without duplicate insertion
    assert id1 == id2

    # Query all observations for this farmer
    all_obs = client.get("/api/observations", headers=headers).json()
    matching = [o for o in all_obs if o.get("client_observation_id") == client_obs_id]
    assert len(matching) == 1

def test_dataset_anonymization():
    """Verify dataset endpoint masks farmer and location PII."""
    create_test_expert()
    expert_res = client.post("/api/auth/login", data={
        "username": "expert@example.com",
        "password": "expert123"
    })
    headers = {"Authorization": f"Bearer {expert_res.json()['access_token']}"}

    dataset_res = client.get("/api/metrics/dataset/images", headers=headers)
    assert dataset_res.status_code == 200
    dataset = dataset_res.json()
    assert isinstance(dataset, list)
    for item in dataset:
        assert "animal_id_anonymized" in item
        assert "LIVESTOCK-" in item["animal_id_anonymized"]
        assert "farmer_id" not in item
        assert "owner_name" not in item
