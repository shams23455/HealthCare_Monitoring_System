import pytest
from tests.conftest import test_client as client

def get_auth_headers(role="ADMIN"):
    email = f"test_{role.lower()}@example.com"
    reg_res = client.post("/api/auth/register", json={
        "name": f"Test {role}",
        "email": email,
        "password": "Password123!",
        "confirm_password": "Password123!"
    })
    token = reg_res.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

def test_error_analysis_endpoint():
    """Verify GET /api/metrics/error-analysis returns all 11 systematic error categories and stats."""
    headers = get_auth_headers("ADMIN")
    res = client.get("/api/metrics/error-analysis", headers=headers)
    assert res.status_code == 200
    data = res.json()

    assert "total_cases" in data
    assert "correct_agreement_cases" in data
    assert "modified_cases" in data
    assert "low_confidence_cases" in data
    assert "systematic_error_categories" in data

    categories = data["systematic_error_categories"]
    expected_categories = [
        "POOR_IMAGE_QUALITY",
        "MISSING_SYMPTOMS",
        "INCORRECT_SYMPTOM_INFO",
        "ANIMAL_STAGE_MISSING",
        "LOCATION_MISSING",
        "LOW_CONFIDENCE",
        "RISK_OVER_ESTIMATION",
        "RISK_UNDER_ESTIMATION",
        "MODEL_EXPERT_DISAGREEMENT",
        "NETWORK_SYNC_FAILURE",
        "OTHER"
    ]
    for cat in expected_categories:
        assert cat in categories, f"Missing category: {cat}"

def test_experiment_measurements_and_analytics():
    """Verify Before/After experiment measurement recording and empirical analytics."""
    headers = get_auth_headers("ADMIN")

    # 1. Post a new baseline measurement
    baseline_payload = {
        "trial_type": "BASELINE",
        "case_id": "EXP-BASE-01",
        "species": "Cattle",
        "time_to_review_hours": 36.0,
        "notes": "Manual telephone escalation"
    }
    b_res = client.post("/api/metrics/experiment/measurements", json=baseline_payload, headers=headers)
    assert b_res.status_code == 201
    assert b_res.json()["trial_type"] == "BASELINE"
    assert b_res.json()["time_to_review_hours"] == 36.0

    # 2. Post a new proposed system measurement
    proposed_payload = {
        "trial_type": "PROPOSED",
        "case_id": "EXP-PROP-01",
        "species": "Cattle",
        "time_to_review_hours": 3.5,
        "notes": "PWA digital triage and escalation"
    }
    p_res = client.post("/api/metrics/experiment/measurements", json=proposed_payload, headers=headers)
    assert p_res.status_code == 201
    assert p_res.json()["trial_type"] == "PROPOSED"
    assert p_res.json()["time_to_review_hours"] == 3.5

    # 3. Get list of measurements
    list_res = client.get("/api/metrics/experiment/measurements", headers=headers)
    assert list_res.status_code == 200
    measurements = list_res.json()
    assert len(measurements) >= 2

    # 4. Get experiment analytics
    analytics_res = client.get("/api/metrics/experiment/analytics", headers=headers)
    assert analytics_res.status_code == 200
    analytics = analytics_res.json()
    assert "baseline" in analytics
    assert "proposed" in analytics
    assert "improvement" in analytics

    assert analytics["baseline"]["average_review_time_hours"] is not None
    assert analytics["proposed"]["average_review_time_hours"] is not None
    assert analytics["improvement"]["hours_saved"] is not None
    assert analytics["improvement"]["percentage_reduction"] is not None
    assert analytics["improvement"]["hours_saved"] > 0

def test_stakeholder_validation_feedback_and_summary():
    """Verify Stakeholder validation feedback capture and aggregate usability metrics."""
    headers = get_auth_headers("ADMIN")

    # 1. Record stakeholder feedback
    fb_payload = {
        "participant_type": "FARMER",
        "ease_observation_capture": 5,
        "ease_image_capture": 4,
        "clarity_explanation": 5,
        "ease_expert_review": 4,
        "usefulness_offline_mode": 5,
        "overall_usability": 5,
        "tasks_performed": "Created 3 observations in pasture without connectivity",
        "feedback_text": "Offline submission worked smoothly once synced."
    }
    fb_res = client.post("/api/metrics/stakeholder/feedback", json=fb_payload, headers=headers)
    assert fb_res.status_code == 201
    saved_fb = fb_res.json()
    assert saved_fb["participant_type"] == "FARMER"
    assert saved_fb["overall_usability"] == 5

    # 2. Get stakeholder summary
    summary_res = client.get("/api/metrics/stakeholder/summary", headers=headers)
    assert summary_res.status_code == 200
    summary = summary_res.json()
    assert summary["participant_count"] >= 1
    assert "average_ratings" in summary
    assert summary["average_ratings"]["overall_usability"] == 5.0
    assert "ease_observation_capture" in summary["average_ratings"]
