import pytest
from datetime import date, timedelta
from app.models.user import User
from app.models.animal import Animal
from app.models.audit import AuditLog
from tests.conftest import test_client as client, TestingSessionLocal

def test_01_farmer_registration_success():
    payload = {
        "name": "Sarah Farmer",
        "email": "sarah@farm.com",
        "password": "Password123!",
        "confirm_password": "Password123!",
        "role": "FARMER",
        "phone": "+1987654321"
    }
    res = client.post("/api/auth/register", json=payload)
    assert res.status_code == 201, res.text
    data = res.json()
    assert "access_token" in data
    assert data["user"]["email"] == "sarah@farm.com"
    assert data["user"]["role"] == "FARMER"

def test_02_duplicate_email_rejection():
    payload = {
        "name": "Sarah Farmer",
        "email": "sarah@farm.com",
        "password": "Password123!",
        "confirm_password": "Password123!",
        "role": "FARMER"
    }
    res1 = client.post("/api/auth/register", json=payload)
    assert res1.status_code == 201

    res2 = client.post("/api/auth/register", json=payload)
    assert res2.status_code == 400
    assert "already exists" in res2.text

def test_03_public_registration_rejects_admin_and_expert():
    # Attempting to register as ADMIN
    admin_payload = {
        "name": "Malicious Admin",
        "email": "admin@fake.com",
        "password": "Password123!",
        "confirm_password": "Password123!",
        "role": "ADMIN"
    }
    res_admin = client.post("/api/auth/register", json=admin_payload)
    assert res_admin.status_code in [400, 422]

    # Attempting to register as EXPERT
    expert_payload = {
        "name": "Unverified Expert",
        "email": "expert@fake.com",
        "password": "Password123!",
        "confirm_password": "Password123!",
        "role": "EXPERT"
    }
    res_expert = client.post("/api/auth/register", json=expert_payload)
    assert res_expert.status_code in [400, 422]

def test_04_password_validation_rejection():
    # Mismatched passwords
    mismatch_payload = {
        "name": "Mismatch User",
        "email": "mismatch@farm.com",
        "password": "Password123!",
        "confirm_password": "DifferentPassword123!",
        "role": "FARMER"
    }
    res_mismatch = client.post("/api/auth/register", json=mismatch_payload)
    assert res_mismatch.status_code == 422

    # Password too short (<8 characters)
    short_payload = {
        "name": "Short Pass User",
        "email": "short@farm.com",
        "password": "short",
        "confirm_password": "short",
        "role": "FARMER"
    }
    res_short = client.post("/api/auth/register", json=short_payload)
    assert res_short.status_code == 422

def test_05_login_success_and_invalid_password_rejection():
    reg_payload = {
        "name": "John Farmer",
        "email": "john@farm.com",
        "password": "CorrectPassword123",
        "confirm_password": "CorrectPassword123",
        "role": "FARMER"
    }
    client.post("/api/auth/register", json=reg_payload)

    # Valid login
    login_res = client.post("/api/auth/login", data={"username": "john@farm.com", "password": "CorrectPassword123"})
    assert login_res.status_code == 200
    assert "access_token" in login_res.json()

    # Invalid password
    bad_res = client.post("/api/auth/login", data={"username": "john@farm.com", "password": "WrongPassword"})
    assert bad_res.status_code == 401
    assert "Incorrect email or password" in bad_res.text

def test_06_profile_view_and_update():
    reg_payload = {
        "name": "Old Name",
        "email": "profile@farm.com",
        "password": "Password123!",
        "confirm_password": "Password123!",
        "phone": "111-222-3333"
    }
    reg_res = client.post("/api/auth/register", json=reg_payload)
    token = reg_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # GET /api/auth/me
    me_res = client.get("/api/auth/me", headers=headers)
    assert me_res.status_code == 200
    assert me_res.json()["name"] == "Old Name"

    # PUT /api/auth/profile
    update_res = client.put("/api/auth/profile", json={"name": "New Name", "phone": "999-888-7777"}, headers=headers)
    assert update_res.status_code == 200
    assert update_res.json()["name"] == "New Name"
    assert update_res.json()["phone"] == "999-888-7777"
    assert update_res.json()["role"] == "FARMER"

def test_07_livestock_crud_and_validation():
    reg_res = client.post("/api/auth/register", json={
        "name": "Farmer Bob",
        "email": "bob@farm.com",
        "password": "Password123!",
        "confirm_password": "Password123!"
    })
    token = reg_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # 1. Create animal
    animal_payload = {
        "animal_tag": "TAG-101",
        "species": "Cattle",
        "breed": "Angus",
        "sex": "Female",
        "date_of_birth": str(date.today() - timedelta(days=365)),
        "age_stage": "Adult",
        "farm_location": "Pasture North",
        "notes": "Healthy breeding cow"
    }
    create_res = client.post("/api/animals", json=animal_payload, headers=headers)
    assert create_res.status_code == 201, create_res.text
    animal_data = create_res.json()
    animal_id = animal_data["id"]
    assert animal_data["animal_tag"] == "TAG-101"
    assert animal_data["notes"] == "Healthy breeding cow"
    assert animal_data["is_active"] is True

    # 2. Duplicate tag on same farm rejected
    dup_res = client.post("/api/animals", json=animal_payload, headers=headers)
    assert dup_res.status_code == 400
    assert "already exists on your farm" in dup_res.text

    # 3. List animals
    list_res = client.get("/api/animals", headers=headers)
    assert list_res.status_code == 200
    assert len(list_res.json()) == 1

    # 4. View animal detail
    get_res = client.get(f"/api/animals/{animal_id}", headers=headers)
    assert get_res.status_code == 200
    assert get_res.json()["animal_tag"] == "TAG-101"

    # 5. Update animal
    update_res = client.put(f"/api/animals/{animal_id}", json={
        "breed": "Black Angus",
        "farm_location": "Pasture South",
        "notes": "Moved to south pasture"
    }, headers=headers)
    assert update_res.status_code == 200
    assert update_res.json()["breed"] == "Black Angus"
    assert update_res.json()["farm_location"] == "Pasture South"

def test_08_invalid_animal_data_rejected():
    reg_res = client.post("/api/auth/register", json={
        "name": "Farmer Dan",
        "email": "dan@farm.com",
        "password": "Password123!",
        "confirm_password": "Password123!"
    })
    token = reg_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Future date of birth rejected
    future_date = str(date.today() + timedelta(days=10))
    res_future = client.post("/api/animals", json={
        "animal_tag": "TAG-FUTURE",
        "species": "Goat",
        "sex": "Male",
        "date_of_birth": future_date,
        "age_stage": "Young",
        "farm_location": "Barn 1"
    }, headers=headers)
    assert res_future.status_code == 422

    # Missing required farm_location rejected
    res_no_loc = client.post("/api/animals", json={
        "animal_tag": "TAG-NOLOC",
        "species": "Sheep",
        "sex": "Female",
        "age_stage": "Adult",
        "farm_location": "   "
    }, headers=headers)
    assert res_no_loc.status_code == 422

def test_09_farmer_data_isolation_enforced():
    """
    CRITICAL: Farmer A must NEVER be able to view, update, or deactivate Farmer B's animal.
    Backend must return 403 Forbidden.
    """
    # Register Farmer A
    res_a = client.post("/api/auth/register", json={
        "name": "Farmer Alice",
        "email": "alice@farm.com",
        "password": "Password123!",
        "confirm_password": "Password123!"
    })
    token_a = res_a.json()["access_token"]
    headers_a = {"Authorization": f"Bearer {token_a}"}

    # Register Farmer B
    res_b = client.post("/api/auth/register", json={
        "name": "Farmer Bob",
        "email": "bob@farm.com",
        "password": "Password123!",
        "confirm_password": "Password123!"
    })
    token_b = res_b.json()["access_token"]
    headers_b = {"Authorization": f"Bearer {token_b}"}

    # Farmer B creates an animal
    res_b_animal = client.post("/api/animals", json={
        "animal_tag": "BOB-COW-1",
        "species": "Cattle",
        "sex": "Female",
        "age_stage": "Adult",
        "farm_location": "Bob Pen 4"
    }, headers=headers_b)
    assert res_b_animal.status_code == 201
    bob_animal_id = res_b_animal.json()["id"]

    # Farmer A attempts to GET Farmer B's animal -> 403 Forbidden
    res_a_view = client.get(f"/api/animals/{bob_animal_id}", headers=headers_a)
    assert res_a_view.status_code == 403
    assert "Access denied" in res_a_view.text

    # Farmer A attempts to PUT Farmer B's animal -> 403 Forbidden
    res_a_update = client.put(f"/api/animals/{bob_animal_id}", json={"farm_location": "Stolen Pasture"}, headers=headers_a)
    assert res_a_update.status_code == 403

    # Farmer A attempts to PATCH deactivate Farmer B's animal -> 403 Forbidden
    res_a_deactivate = client.patch(f"/api/animals/{bob_animal_id}/deactivate", headers=headers_a)
    assert res_a_deactivate.status_code == 403

    # Farmer A lists animals -> must NOT see Farmer B's animal
    res_a_list = client.get("/api/animals", headers=headers_a)
    assert res_a_list.status_code == 200
    assert len(res_a_list.json()) == 0

def test_10_deactivate_animal_preserves_history():
    reg_res = client.post("/api/auth/register", json={
        "name": "Farmer Charlie",
        "email": "charlie@farm.com",
        "password": "Password123!",
        "confirm_password": "Password123!"
    })
    token = reg_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Create animal
    animal_res = client.post("/api/animals", json={
        "animal_tag": "DEACT-01",
        "species": "Sheep",
        "sex": "Male",
        "age_stage": "Senior",
        "farm_location": "Field 9"
    }, headers=headers)
    animal_id = animal_res.json()["id"]

    # Deactivate
    deact_res = client.patch(f"/api/animals/{animal_id}/deactivate", headers=headers)
    assert deact_res.status_code == 200
    assert deact_res.json()["is_active"] is False

    # Listed animals by default excludes inactive
    list_active = client.get("/api/animals", headers=headers)
    assert len(list_active.json()) == 0

    # Listed animals with include_inactive=True includes it
    list_all = client.get("/api/animals?include_inactive=true", headers=headers)
    assert len(list_all.json()) == 1
    assert list_all.json()[0]["is_active"] is False

def test_11_farmer_cannot_access_admin_endpoints():
    reg_res = client.post("/api/auth/register", json={
        "name": "Farmer David",
        "email": "david@farm.com",
        "password": "Password123!",
        "confirm_password": "Password123!"
    })
    token = reg_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Attempt to access admin-only endpoint
    admin_res = client.get("/api/admin/users", headers=headers)
    assert admin_res.status_code == 403

def test_12_audit_logging_verified():
    reg_res = client.post("/api/auth/register", json={
        "name": "Audited Farmer",
        "email": "audit@farm.com",
        "password": "Password123!",
        "confirm_password": "Password123!"
    })
    token = reg_res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # Create animal
    client.post("/api/animals", json={
        "animal_tag": "AUD-01",
        "species": "Buffalo",
        "sex": "Female",
        "age_stage": "Adult",
        "farm_location": "Lake Pen"
    }, headers=headers)

    # Check that audit log records were written to DB
    db = TestingSessionLocal()
    try:
        logs = db.query(AuditLog).all()
        actions = [log.action for log in logs]
        assert "USER_REGISTER" in actions
        assert "ANIMAL_CREATED" in actions
    finally:
        db.close()
