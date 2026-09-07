from tests.conftest import test_client as client, TestingSessionLocal

def test_user_flow_and_risk_escalation():
    # 1. Register a new farmer
    reg_payload = {
        "name": "Test Farmer",
        "email": "testfarmer@example.com",
        "password": "farmerpassword123",
        "role": "FARMER",
        "phone": "+123456789"
    }
    reg_res = client.post("/api/auth/register", json=reg_payload)
    assert reg_res.status_code == 201, reg_res.text
    farmer_data = reg_res.json()["user"]
    assert farmer_data["email"] == "testfarmer@example.com"

    # 2. Login to get JWT access token
    login_payload = {
        "username": "testfarmer@example.com",
        "password": "farmerpassword123"
    }
    login_res = client.post("/api/auth/login", data=login_payload)
    assert login_res.status_code == 200, login_res.text
    token_data = login_res.json()
    access_token = token_data["access_token"]
    headers = {"Authorization": f"Bearer {access_token}"}

    # 3. Verify /auth/me
    me_res = client.get("/api/auth/me", headers=headers)
    assert me_res.status_code == 200
    assert me_res.json()["name"] == "Test Farmer"

    # 4. Register a livestock animal
    animal_payload = {
        "animal_tag": "COW-001",
        "species": "Cattle",
        "breed": "Holstein",
        "sex": "FEMALE",
        "age_stage": "ADULT",
        "farm_location": "Barn A - Pasture 2"
    }
    create_animal_res = client.post("/api/animals", json=animal_payload, headers=headers)
    assert create_animal_res.status_code == 201, create_animal_res.text
    animal_data = create_animal_res.json()
    animal_id = animal_data["id"]
    assert animal_data["animal_tag"] == "COW-001"

    # 5. List animals
    list_animals_res = client.get("/api/animals", headers=headers)
    assert list_animals_res.status_code == 200
    assert len(list_animals_res.json()) == 1

    # 6. Create normal/low-risk observation
    low_obs_payload = {
        "animal_id": animal_id,
        "symptoms_description": [],
        "temperature": 38.5,
        "appetite_status": "NORMAL",
        "activity_status": "NORMAL",
        "notes": "Healthy morning checkup"
    }
    obs_low_res = client.post("/api/observations", json=low_obs_payload, headers=headers)
    assert obs_low_res.status_code == 201, obs_low_res.text
    obs_low_data = obs_low_res.json()
    assert obs_low_data["risk_level"] == "LOW"
    assert len(obs_low_data["escalations"]) == 0

    # 7. Create high-risk observation (fever, poor appetite, lethargic)
    high_obs_payload = {
        "animal_id": animal_id,
        "symptoms_description": ["Fever", "Nasal discharge", "Coughing"],
        "temperature": 40.8,
        "appetite_status": "NONE",
        "activity_status": "LETHARGIC",
        "notes": "Severe coughing and high fever observed."
    }
    obs_high_res = client.post("/api/observations", json=high_obs_payload, headers=headers)
    assert obs_high_res.status_code == 201, obs_high_res.text
    obs_high_data = obs_high_res.json()
    assert obs_high_data["risk_level"] == "HIGH"
    # Auto escalation check
    assert len(obs_high_data["escalations"]) == 1
    assert obs_high_data["escalations"][0]["priority"] == "HIGH"
    assert obs_high_data["escalations"][0]["status"] == "OPEN"
    # Auto review request check
    assert len(obs_high_data["reviews"]) == 1
    assert obs_high_data["reviews"][0]["validation_status"] == "PENDING"
