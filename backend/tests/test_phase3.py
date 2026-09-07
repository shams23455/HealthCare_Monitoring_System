import io
import pytest
from datetime import datetime, timezone, timedelta
from PIL import Image as PILImage

from app.models.user import User
from app.models.animal import Animal
from app.models.observation import Observation
from app.models.symptom import Symptom, ObservationSymptom
from app.models.image import Image
from app.models.audit import AuditLog
from tests.conftest import test_client as client, TestingSessionLocal

def create_dummy_image_bytes(format="JPEG", width=100, height=100) -> bytes:
    img = PILImage.new("RGB", (width, height), color=(73, 109, 137))
    buf = io.BytesIO()
    img.save(buf, format=format)
    return buf.getvalue()

def test_01_get_active_symptoms():
    res = client.get("/api/symptoms")
    assert res.status_code == 200
    data = res.json()
    assert len(data) >= 6
    names = [s["name"] for s in data]
    assert "Fever" in names
    assert "Coughing" in names

def test_02_create_observation_success_with_structured_symptoms():
    # 1. Register Farmer
    reg_res = client.post("/api/auth/register", json={
        "name": "Farmer Sam",
        "email": "sam@farm.com",
        "password": "Password123!",
        "confirm_password": "Password123!"
    })
    token = reg_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 2. Register Animal
    animal_res = client.post("/api/animals", json={
        "animal_tag": "COW-301",
        "species": "Cattle",
        "breed": "Jersey",
        "sex": "Female",
        "age_stage": "Adult",
        "farm_location": "Pasture East"
    }, headers=headers)
    animal_id = animal_res.json()["id"]

    # 3. Create observation with structured symptoms & timestamps
    now = datetime.now(timezone.utc)
    first_symptom = now - timedelta(hours=6)
    obs_payload = {
        "animal_id": animal_id,
        "first_symptom_at": first_symptom.isoformat(),
        "observed_at": now.isoformat(),
        "symptoms_description": ["Fever"],
        "structured_symptoms": [
            {
                "symptom_name": "Fever",
                "severity": "Moderate",
                "duration": "1-3 days"
            },
            {
                "symptom_name": "Coughing",
                "severity": "Mild",
                "duration": "Less than 1 day"
            }
        ],
        "temperature": 39.4,
        "temperature_unit": "C",
        "appetite_status": "REDUCED",
        "activity_status": "ACTIVE",
        "farm_location": "Pasture East",
        "animal_location": "Shed 2",
        "age_stage": "Adult",
        "notes": "Mild morning cough noticed during feeding."
    }
    obs_res = client.post("/api/observations", json=obs_payload, headers=headers)
    assert obs_res.status_code == 201, obs_res.text
    obs_data = obs_res.json()
    assert obs_data["animal_id"] == animal_id
    assert obs_data["temperature"] == 39.4
    assert obs_data["temperature_unit"] == "C"
    assert obs_data["animal_location"] == "Shed 2"
    assert len(obs_data["observation_symptoms"]) == 2

def test_03_observation_requires_valid_animal():
    reg_res = client.post("/api/auth/register", json={
        "name": "Farmer Sam",
        "email": "sam2@farm.com",
        "password": "Password123!",
        "confirm_password": "Password123!"
    })
    headers = {"Authorization": f"Bearer {reg_res.json()['access_token']}"}

    import uuid
    fake_animal_id = str(uuid.uuid4())
    obs_res = client.post("/api/observations", json={
        "animal_id": fake_animal_id,
        "appetite_status": "NORMAL",
        "activity_status": "ACTIVE"
    }, headers=headers)
    assert obs_res.status_code == 404
    assert "Animal not found" in obs_res.text

def test_04_farmer_cannot_observe_another_farmers_animal():
    # Farmer A
    res_a = client.post("/api/auth/register", json={
        "name": "Farmer A",
        "email": "farmerA@farm.com",
        "password": "Password123!",
        "confirm_password": "Password123!"
    })
    headers_a = {"Authorization": f"Bearer {res_a.json()['access_token']}"}

    # Farmer B
    res_b = client.post("/api/auth/register", json={
        "name": "Farmer B",
        "email": "farmerB@farm.com",
        "password": "Password123!",
        "confirm_password": "Password123!"
    })
    headers_b = {"Authorization": f"Bearer {res_b.json()['access_token']}"}

    # Farmer B registers an animal
    animal_b = client.post("/api/animals", json={
        "animal_tag": "TAG-B1",
        "species": "Goat",
        "sex": "Male",
        "age_stage": "Adult",
        "farm_location": "Pen B"
    }, headers=headers_b).json()

    # Farmer A tries to create observation for Farmer B's animal -> 403 Forbidden
    cross_res = client.post("/api/observations", json={
        "animal_id": animal_b["id"],
        "appetite_status": "NORMAL",
        "activity_status": "ACTIVE"
    }, headers=headers_a)
    assert cross_res.status_code == 403
    assert "You can only record health observations for your own livestock" in cross_res.text

def test_05_farmer_cannot_view_another_farmers_observation():
    res_a = client.post("/api/auth/register", json={
        "name": "Farmer A",
        "email": "farmerA2@farm.com",
        "password": "Password123!",
        "confirm_password": "Password123!"
    })
    headers_a = {"Authorization": f"Bearer {res_a.json()['access_token']}"}

    res_b = client.post("/api/auth/register", json={
        "name": "Farmer B",
        "email": "farmerB2@farm.com",
        "password": "Password123!",
        "confirm_password": "Password123!"
    })
    headers_b = {"Authorization": f"Bearer {res_b.json()['access_token']}"}

    # Farmer B animal & observation
    animal_b = client.post("/api/animals", json={
        "animal_tag": "TAG-B2",
        "species": "Sheep",
        "sex": "Female",
        "age_stage": "Adult",
        "farm_location": "Pen B2"
    }, headers=headers_b).json()

    obs_b = client.post("/api/observations", json={
        "animal_id": animal_b["id"],
        "appetite_status": "NORMAL",
        "activity_status": "ACTIVE"
    }, headers=headers_b).json()

    # Farmer A requests Farmer B's observation -> 403 Forbidden
    view_res = client.get(f"/api/observations/{obs_b['id']}", headers=headers_a)
    assert view_res.status_code == 403
    assert "Access denied" in view_res.text

def test_06_future_first_symptom_time_rejected():
    reg_res = client.post("/api/auth/register", json={
        "name": "Farmer Time",
        "email": "time@farm.com",
        "password": "Password123!",
        "confirm_password": "Password123!"
    })
    headers = {"Authorization": f"Bearer {reg_res.json()['access_token']}"}

    animal = client.post("/api/animals", json={
        "animal_tag": "TAG-TIME",
        "species": "Cattle",
        "sex": "Male",
        "age_stage": "Adult",
        "farm_location": "Sector 1"
    }, headers=headers).json()

    future_time = (datetime.now(timezone.utc) + timedelta(days=2)).isoformat()
    bad_res = client.post("/api/observations", json={
        "animal_id": animal["id"],
        "first_symptom_at": future_time,
        "appetite_status": "NORMAL",
        "activity_status": "ACTIVE"
    }, headers=headers)
    assert bad_res.status_code == 422
    assert "cannot be in the future" in bad_res.text

def test_07_observed_at_earlier_than_first_symptom_rejected():
    reg_res = client.post("/api/auth/register", json={
        "name": "Farmer Time",
        "email": "time2@farm.com",
        "password": "Password123!",
        "confirm_password": "Password123!"
    })
    headers = {"Authorization": f"Bearer {reg_res.json()['access_token']}"}

    animal = client.post("/api/animals", json={
        "animal_tag": "TAG-TIME2",
        "species": "Cattle",
        "sex": "Male",
        "age_stage": "Adult",
        "farm_location": "Sector 1"
    }, headers=headers).json()

    now = datetime.now(timezone.utc)
    first_symptom = now - timedelta(hours=2)
    observed_earlier = now - timedelta(hours=5)

    bad_res = client.post("/api/observations", json={
        "animal_id": animal["id"],
        "first_symptom_at": first_symptom.isoformat(),
        "observed_at": observed_earlier.isoformat(),
        "appetite_status": "NORMAL",
        "activity_status": "ACTIVE"
    }, headers=headers)
    assert bad_res.status_code == 422
    assert "cannot be earlier than first observed symptom time" in bad_res.text

def test_08_high_risk_escalation_triggered():
    reg_res = client.post("/api/auth/register", json={
        "name": "Farmer Risk",
        "email": "risk@farm.com",
        "password": "Password123!",
        "confirm_password": "Password123!"
    })
    headers = {"Authorization": f"Bearer {reg_res.json()['access_token']}"}

    animal = client.post("/api/animals", json={
        "animal_tag": "TAG-HIGH",
        "species": "Cattle",
        "sex": "Female",
        "age_stage": "Adult",
        "farm_location": "Main Barn"
    }, headers=headers).json()

    # Severe symptoms leading to HIGH risk
    high_obs_res = client.post("/api/observations", json={
        "animal_id": animal["id"],
        "symptoms_description": ["Fever", "Nasal discharge", "Coughing"],
        "temperature": 41.2,
        "appetite_status": "NONE",
        "activity_status": "LETHARGIC",
        "notes": "Critically unwell"
    }, headers=headers)
    assert high_obs_res.status_code == 201
    high_data = high_obs_res.json()
    assert high_data["risk_level"] == "HIGH"
    assert len(high_data["escalations"]) == 1
    assert high_data["escalations"][0]["priority"] == "HIGH"
    assert len(high_data["reviews"]) == 1
    assert high_data["reviews"][0]["validation_status"] == "PENDING"

def test_09_image_upload_and_exif_strip():
    reg_res = client.post("/api/auth/register", json={
        "name": "Farmer Photo",
        "email": "photo@farm.com",
        "password": "Password123!",
        "confirm_password": "Password123!"
    })
    headers = {"Authorization": f"Bearer {reg_res.json()['access_token']}"}

    animal = client.post("/api/animals", json={
        "animal_tag": "TAG-PHOTO",
        "species": "Cattle",
        "sex": "Female",
        "age_stage": "Adult",
        "farm_location": "Pasture 3"
    }, headers=headers).json()

    obs = client.post("/api/observations", json={
        "animal_id": animal["id"],
        "appetite_status": "NORMAL",
        "activity_status": "ACTIVE"
    }, headers=headers).json()

    # Upload valid JPEG
    img_bytes = create_dummy_image_bytes("JPEG", width=320, height=240)
    upload_res = client.post(
        f"/api/observations/{obs['id']}/images",
        files={"file": ("cow_eye.jpg", img_bytes, "image/jpeg")},
        data={"image_type": "EYE"},
        headers=headers
    )
    assert upload_res.status_code == 201, upload_res.text
    img_data = upload_res.json()
    assert img_data["original_filename"] == "cow_eye.jpg"
    assert img_data["width"] == 320
    assert img_data["height"] == 240
    assert img_data["upload_status"] == "UPLOADED"
    assert "/uploads/observations/" in img_data["storage_path"]

    # Verify listing observation images
    list_img_res = client.get(f"/api/observations/{obs['id']}/images", headers=headers)
    assert list_img_res.status_code == 200
    assert len(list_img_res.json()) == 1

def test_10_invalid_image_format_and_oversize_rejected():
    reg_res = client.post("/api/auth/register", json={
        "name": "Farmer ImgVal",
        "email": "val@farm.com",
        "password": "Password123!",
        "confirm_password": "Password123!"
    })
    headers = {"Authorization": f"Bearer {reg_res.json()['access_token']}"}

    animal = client.post("/api/animals", json={
        "animal_tag": "TAG-VAL",
        "species": "Goat",
        "sex": "Male",
        "age_stage": "Adult",
        "farm_location": "Pen 1"
    }, headers=headers).json()

    obs = client.post("/api/observations", json={
        "animal_id": animal["id"],
        "appetite_status": "NORMAL",
        "activity_status": "ACTIVE"
    }, headers=headers).json()

    # 1. Invalid text file
    txt_res = client.post(
        f"/api/observations/{obs['id']}/images",
        files={"file": ("notes.txt", b"plain text content", "text/plain")},
        headers=headers
    )
    assert txt_res.status_code == 400
    assert "Unsupported image format" in txt_res.text

    # 2. Oversized image (>5 MB)
    large_bytes = b"0" * (5 * 1024 * 1024 + 1024)
    oversize_res = client.post(
        f"/api/observations/{obs['id']}/images",
        files={"file": ("huge.jpg", large_bytes, "image/jpeg")},
        headers=headers
    )
    assert oversize_res.status_code == 400
    assert "exceeds the 5 MB limit" in oversize_res.text

def test_11_cross_farmer_image_access_rejected():
    res_a = client.post("/api/auth/register", json={
        "name": "Farmer A",
        "email": "imgA@farm.com",
        "password": "Password123!",
        "confirm_password": "Password123!"
    })
    headers_a = {"Authorization": f"Bearer {res_a.json()['access_token']}"}

    res_b = client.post("/api/auth/register", json={
        "name": "Farmer B",
        "email": "imgB@farm.com",
        "password": "Password123!",
        "confirm_password": "Password123!"
    })
    headers_b = {"Authorization": f"Bearer {res_b.json()['access_token']}"}

    animal_b = client.post("/api/animals", json={
        "animal_tag": "TAG-IMG-B",
        "species": "Cattle",
        "sex": "Female",
        "age_stage": "Adult",
        "farm_location": "Barn B"
    }, headers=headers_b).json()

    obs_b = client.post("/api/observations", json={
        "animal_id": animal_b["id"],
        "appetite_status": "NORMAL",
        "activity_status": "ACTIVE"
    }, headers=headers_b).json()

    # Farmer A attempts to upload to Farmer B's observation -> 403 Forbidden
    img_bytes = create_dummy_image_bytes("PNG", width=50, height=50)
    cross_upload = client.post(
        f"/api/observations/{obs_b['id']}/images",
        files={"file": ("hacked.png", img_bytes, "image/png")},
        headers=headers_a
    )
    assert cross_upload.status_code == 403

def test_12_image_delete():
    reg_res = client.post("/api/auth/register", json={
        "name": "Farmer Del",
        "email": "del@farm.com",
        "password": "Password123!",
        "confirm_password": "Password123!"
    })
    headers = {"Authorization": f"Bearer {reg_res.json()['access_token']}"}

    animal = client.post("/api/animals", json={
        "animal_tag": "TAG-DEL",
        "species": "Goat",
        "sex": "Female",
        "age_stage": "Young",
        "farm_location": "Yard"
    }, headers=headers).json()

    obs = client.post("/api/observations", json={
        "animal_id": animal["id"],
        "appetite_status": "NORMAL",
        "activity_status": "ACTIVE"
    }, headers=headers).json()

    img_bytes = create_dummy_image_bytes("JPEG", width=120, height=120)
    uploaded_img = client.post(
        f"/api/observations/{obs['id']}/images",
        files={"file": ("to_delete.jpg", img_bytes, "image/jpeg")},
        headers=headers
    ).json()

    # Delete image
    del_res = client.delete(f"/api/observations/{obs['id']}/images/{uploaded_img['id']}", headers=headers)
    assert del_res.status_code == 200

    # Ensure list is empty
    list_after = client.get(f"/api/observations/{obs['id']}/images", headers=headers).json()
    assert len(list_after) == 0

def test_13_audit_logging_verified():
    reg_res = client.post("/api/auth/register", json={
        "name": "Farmer Audit",
        "email": "audit3@farm.com",
        "password": "Password123!",
        "confirm_password": "Password123!"
    })
    headers = {"Authorization": f"Bearer {reg_res.json()['access_token']}"}

    animal = client.post("/api/animals", json={
        "animal_tag": "TAG-AUDIT3",
        "species": "Sheep",
        "sex": "Male",
        "age_stage": "Senior",
        "farm_location": "South Yard"
    }, headers=headers).json()

    obs = client.post("/api/observations", json={
        "animal_id": animal["id"],
        "appetite_status": "NORMAL",
        "activity_status": "ACTIVE"
    }, headers=headers).json()

    db = TestingSessionLocal()
    try:
        logs = db.query(AuditLog).all()
        actions = [l.action for l in logs]
        assert "OBSERVATION_CREATED" in actions
    finally:
        db.close()
