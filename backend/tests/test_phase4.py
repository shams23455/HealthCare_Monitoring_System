import pytest
import io
from PIL import Image as PILImage
from datetime import datetime, timezone
from tests.conftest import test_client as client, TestingSessionLocal
from app.models.observation import Observation
from app.models.animal import Animal
from app.models.escalation import Escalation

def create_sample_jwt(client, email, name, role="FARMER"):
    reg_res = client.post("/api/auth/register", json={
        "name": name,
        "email": email,
        "password": "Password123!",
        "confirm_password": "Password123!",
        "role": role,
        "phone": "+123456789"
    })
    assert reg_res.status_code == 201, reg_res.text
    token = reg_res.json()["access_token"]
    user_id = reg_res.json()["user"]["id"]
    return {"Authorization": f"Bearer {token}"}, user_id

def create_sample_animal(client, headers, tag="ANIMAL-P4"):
    animal_res = client.post("/api/animals", json={
        "animal_tag": tag,
        "species": "Cattle",
        "breed": "Angus",
        "sex": "FEMALE",
        "age_stage": "ADULT",
        "farm_location": "Field North",
    }, headers=headers)
    assert animal_res.status_code == 201, animal_res.text
    return animal_res.json()["id"]

def create_test_image_bytes(fmt="JPEG", size=(200, 200), color="blue"):
    buf = io.BytesIO()
    img = PILImage.new("RGB", size, color=color)
    img.save(buf, format=fmt)
    buf.seek(0)
    return buf.read()


def test_01_client_observation_id_accepted():
    headers, _ = create_sample_jwt(client, "farmer_p4_1@farm.com", "Farmer Four 1")
    animal_id = create_sample_animal(client, headers, "P4-COW-01")

    client_uuid = "client-uuid-999-aaa"
    payload = {
        "client_observation_id": client_uuid,
        "animal_id": animal_id,
        "appetite_status": "NORMAL",
        "activity_status": "ACTIVE",
        "temperature": 38.5,
        "temperature_unit": "C",
        "symptoms_description": ["Other"],
        "notes": "Offline checkup queued by mobile device"
    }

    res = client.post("/api/observations", json=payload, headers=headers)
    assert res.status_code == 201, res.text
    data = res.json()
    assert data["client_observation_id"] == client_uuid
    assert data["animal_id"] == animal_id
    assert data["risk_level"] in ["LOW", "MEDIUM", "HIGH", "UNKNOWN"]


def test_02_duplicate_client_observation_id_idempotency():
    headers, _ = create_sample_jwt(client, "farmer_p4_2@farm.com", "Farmer Four 2")
    animal_id = create_sample_animal(client, headers, "P4-COW-02")

    client_uuid = "client-uuid-repeatable-002"
    payload = {
        "client_observation_id": client_uuid,
        "animal_id": animal_id,
        "appetite_status": "NORMAL",
        "activity_status": "ACTIVE",
        "temperature": 38.6,
        "temperature_unit": "C",
        "symptoms_description": ["Other"],
        "notes": "First submission attempt"
    }

    # 1. First submission
    res1 = client.post("/api/observations", json=payload, headers=headers)
    assert res1.status_code == 201, res1.text
    first_id = res1.json()["id"]

    # 2. Second submission (simulating retry or connection timeout replay)
    payload["notes"] = "Duplicate retry attempt"
    res2 = client.post("/api/observations", json=payload, headers=headers)
    assert res2.status_code in [200, 201], res2.text
    second_id = res2.json()["id"]

    # Verify identical observation ID returned
    assert first_id == second_id

    # Verify in DB that only 1 observation exists with this client_observation_id
    db = TestingSessionLocal()
    try:
        matching_count = db.query(Observation).filter(
            Observation.client_observation_id == client_uuid
        ).count()
        assert matching_count == 1, f"Expected 1 observation in DB, found {matching_count}"
    finally:
        db.close()


def test_03_duplicate_prevention_scoped_to_farmer():
    # Farmer A
    headers_a, _ = create_sample_jwt(client, "farmer_p4_a@farm.com", "Farmer A")
    animal_a = create_sample_animal(client, headers_a, "ANIMAL-A")

    # Farmer B
    headers_b, _ = create_sample_jwt(client, "farmer_p4_b@farm.com", "Farmer B")
    animal_b = create_sample_animal(client, headers_b, "ANIMAL-B")

    shared_client_uuid = "shared-uuid-111"

    # Farmer A creates observation
    res_a = client.post("/api/observations", json={
        "client_observation_id": shared_client_uuid,
        "animal_id": animal_a,
        "appetite_status": "NORMAL",
        "activity_status": "ACTIVE",
    }, headers=headers_a)
    assert res_a.status_code == 201
    id_a = res_a.json()["id"]

    # Farmer B creates observation with same client UUID for their own animal
    res_b = client.post("/api/observations", json={
        "client_observation_id": shared_client_uuid,
        "animal_id": animal_b,
        "appetite_status": "NORMAL",
        "activity_status": "ACTIVE",
    }, headers=headers_b)
    assert res_b.status_code == 201
    id_b = res_b.json()["id"]

    # Both observations must exist independently
    assert id_a != id_b


def test_04_unauthorized_farmer_cannot_sync_for_another_farmers_animal():
    headers_owner, _ = create_sample_jwt(client, "owner_p4@farm.com", "Owner Farmer")
    animal_owner = create_sample_animal(client, headers_owner, "OWNER-COW")

    headers_attacker, _ = create_sample_jwt(client, "attacker_p4@farm.com", "Attacker Farmer")

    # Attacker tries to sync observation for owner's animal
    res = client.post("/api/observations", json={
        "client_observation_id": "malicious-sync-uuid",
        "animal_id": animal_owner,
        "appetite_status": "NORMAL",
        "activity_status": "ACTIVE",
    }, headers=headers_attacker)

    assert res.status_code == 403, res.text
    assert "only record health observations for your own livestock" in res.text


def test_05_normal_online_observation_without_client_id():
    headers, _ = create_sample_jwt(client, "farmer_online@farm.com", "Online Farmer")
    animal_id = create_sample_animal(client, headers, "ONLINE-COW")

    res = client.post("/api/observations", json={
        "animal_id": animal_id,
        "appetite_status": "NORMAL",
        "activity_status": "ACTIVE",
        "temperature": 38.2,
        "symptoms_description": []
    }, headers=headers)

    assert res.status_code == 201, res.text
    data = res.json()
    assert data["client_observation_id"] is None
    assert data["risk_level"] == "LOW"


def test_06_high_risk_escalation_with_client_observation_id():
    headers, _ = create_sample_jwt(client, "farmer_highrisk@farm.com", "High Risk Farmer")
    animal_id = create_sample_animal(client, headers, "SICK-COW")

    client_uuid = "client-high-risk-uuid"
    res = client.post("/api/observations", json={
        "client_observation_id": client_uuid,
        "animal_id": animal_id,
        "appetite_status": "NONE",
        "activity_status": "LETHARGIC",
        "temperature": 41.0,
        "symptoms_description": ["Fever", "Nasal discharge", "Diarrhea", "Difficulty walking"],
        "notes": "Emergency field check"
    }, headers=headers)

    assert res.status_code == 201, res.text
    data = res.json()
    assert data["risk_level"] == "HIGH"

    # Verify automatic escalation created in DB
    import uuid as py_uuid
    obs_uuid = py_uuid.UUID(data["id"])
    db = TestingSessionLocal()
    try:
        esc = db.query(Escalation).filter(Escalation.observation_id == obs_uuid).first()
        assert esc is not None, "Expected automatic escalation for HIGH risk observation"
        assert esc.status == "OPEN"
        assert esc.priority == "HIGH"
    finally:
        db.close()


def test_07_image_upload_for_synced_observation():
    headers, _ = create_sample_jwt(client, "farmer_img_sync@farm.com", "Photo Farmer")
    animal_id = create_sample_animal(client, headers, "PHOTO-COW")

    client_uuid = "client-photo-sync-uuid"
    obs_res = client.post("/api/observations", json={
        "client_observation_id": client_uuid,
        "animal_id": animal_id,
        "appetite_status": "NORMAL",
        "activity_status": "ACTIVE",
    }, headers=headers)
    assert obs_res.status_code == 201
    server_obs_id = obs_res.json()["id"]

    # Upload photo captured during offline session
    img_bytes = create_test_image_bytes(fmt="JPEG", size=(300, 300), color="green")
    img_res = client.post(
        f"/api/observations/{server_obs_id}/images",
        files={"file": ("offline_captured.jpg", img_bytes, "image/jpeg")},
        data={"image_type": "BODY"},
        headers=headers
    )
    assert img_res.status_code == 201, img_res.text
    img_data = img_res.json()
    assert img_data["observation_id"] == server_obs_id
    assert img_data["upload_status"] == "UPLOADED"


def test_08_duplicate_request_with_image_retry():
    headers, _ = create_sample_jwt(client, "farmer_img_retry@farm.com", "Retry Farmer")
    animal_id = create_sample_animal(client, headers, "RETRY-COW")

    client_uuid = "client-retry-flow-uuid"
    obs_payload = {
        "client_observation_id": client_uuid,
        "animal_id": animal_id,
        "appetite_status": "NORMAL",
        "activity_status": "ACTIVE",
    }

    # Step 1: Initial observation creation
    obs1 = client.post("/api/observations", json=obs_payload, headers=headers).json()
    server_id = obs1["id"]

    # Step 2: Sync engine replays observation before proceeding to image upload
    obs2 = client.post("/api/observations", json=obs_payload, headers=headers).json()
    assert obs2["id"] == server_id

    # Step 3: Sync engine uploads associated image
    img_bytes = create_test_image_bytes(fmt="JPEG", size=(150, 150), color="yellow")
    img_res = client.post(
        f"/api/observations/{server_id}/images",
        files={"file": ("sync_photo.jpg", img_bytes, "image/jpeg")},
        data={"image_type": "BODY"},
        headers=headers
    )
    assert img_res.status_code == 201
    assert img_res.json()["observation_id"] == server_id
