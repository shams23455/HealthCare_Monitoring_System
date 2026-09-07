from app.core.risk import evaluate_disease_risk

def test_risk_evaluation_low():
    risk, condition, score, explanation = evaluate_disease_risk(
        symptoms=[],
        temperature=38.2,
        appetite_status="NORMAL",
        activity_status="NORMAL"
    )
    assert risk == "LOW"

def test_risk_evaluation_high():
    risk, condition, score, explanation = evaluate_disease_risk(
        symptoms=["Fever", "Nasal discharge"],
        temperature=40.1,
        appetite_status="POOR",
        activity_status="LETHARGIC"
    )
    assert risk == "HIGH"
    assert score >= 0.8
