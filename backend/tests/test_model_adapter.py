import io
import pytest
from PIL import Image as PILImage
from app.core.risk import (
    ImageRiskModel,
    RuleBasedRiskModel,
    MLRiskModel,
    HybridRiskModel,
    get_model_adapter,
    RiskAssessmentResult,
)
from app.core.config import settings

def create_test_image(color=(120, 150, 90), size=(224, 224)):
    img = PILImage.new("RGB", size, color=color)
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    return buf.getvalue()

def test_model_adapter_factory():
    """Verify that get_model_adapter instantiates the correct adapter according to configuration."""
    rule_adapter = get_model_adapter("rule_based")
    assert isinstance(rule_adapter, RuleBasedRiskModel)
    assert isinstance(rule_adapter, ImageRiskModel)

    ml_adapter = get_model_adapter("ml")
    assert isinstance(ml_adapter, MLRiskModel)
    assert isinstance(ml_adapter, ImageRiskModel)

    hybrid_adapter = get_model_adapter("hybrid")
    assert isinstance(hybrid_adapter, HybridRiskModel)
    assert isinstance(hybrid_adapter, ImageRiskModel)

    # Unknown defaults safely to hybrid
    fallback_adapter = get_model_adapter("unknown_model_type")
    assert isinstance(fallback_adapter, HybridRiskModel)

def test_rule_based_model_adapter():
    """Verify RuleBasedRiskModel functions deterministically on clinical symptoms."""
    adapter = RuleBasedRiskModel()

    # Low risk observation
    low_res = adapter.predict(
        symptoms=[],
        temperature=38.4,
        appetite_status="NORMAL",
        activity_status="ACTIVE",
        age_stage="Adult"
    )
    assert isinstance(low_res, RiskAssessmentResult)
    assert low_res.risk_level == "LOW"
    assert low_res.confidence >= 0.8
    assert "healthy vitality" in low_res.explanation.lower()

    # High risk observation
    high_res = adapter.predict(
        symptoms=["Fever", "Nasal discharge", "Abnormal breathing"],
        temperature=40.5,
        appetite_status="POOR",
        activity_status="LETHARGIC",
        age_stage="Young"
    )
    assert high_res.risk_level == "HIGH"
    assert high_res.confidence >= 0.8
    assert len(high_res.factors) >= 2

def test_ml_risk_model_with_image():
    """Verify MLRiskModel analyzes image bytes and generates calibrated prediction."""
    adapter = MLRiskModel()
    img_bytes = create_test_image(color=(140, 160, 100))

    result = adapter.predict(
        image_bytes=img_bytes,
        image_quality="GOOD"
    )

    assert isinstance(result, RiskAssessmentResult)
    assert result.risk_level in ["LOW", "MEDIUM", "HIGH", "REVIEW_REQUIRED"]
    assert 0.0 <= result.confidence <= 1.0
    assert any("Visual" in f or "image" in f.lower() for f in result.factors)

def test_ml_risk_model_missing_image_safety():
    """Verify MLRiskModel safely flags review when no image is provided."""
    adapter = MLRiskModel()
    result = adapter.predict(image_bytes=None)

    assert result.risk_level == "REVIEW_REQUIRED"
    assert result.confidence <= settings.MIN_CONFIDENCE
    assert "image" in result.explanation.lower() or "missing" in result.explanation.lower()

def test_hybrid_risk_model_low_confidence_safety_rule():
    """
    PART 8: If confidence < MIN_CONFIDENCE (0.60),
    risk assessment must become REVIEW_REQUIRED and advise expert review.
    """
    adapter = HybridRiskModel()
    # Test image with poor quality to drive down confidence
    poor_img = create_test_image(color=(20, 20, 20), size=(100, 100))

    result = adapter.predict(
        image_bytes=poor_img,
        symptoms=["Reduced appetite"],
        temperature=39.0,
        appetite_status="NORMAL",
        activity_status="NORMAL",
        age_stage="Adult",
        image_quality="POOR"
    )

    # Poor quality drops confidence; if below MIN_CONFIDENCE, must be REVIEW_REQUIRED
    if result.confidence < settings.MIN_CONFIDENCE:
        assert result.risk_level == "REVIEW_REQUIRED"
        assert "confidence is low" in result.recommended_action.lower() or "review" in result.recommended_action.lower()

def test_hybrid_risk_model_acute_symptom_override():
    """
    Clinical safety rule: Acute high fever and lethargy must trigger HIGH risk
    regardless of image appearance. The AI must never suppress urgent symptoms.
    """
    adapter = HybridRiskModel()
    healthy_looking_img = create_test_image(color=(135, 170, 100))

    result = adapter.predict(
        image_bytes=healthy_looking_img,
        symptoms=["Fever", "Abnormal breathing"],
        temperature=40.8,
        appetite_status="POOR",
        activity_status="LETHARGIC",
        age_stage="Young",
        image_quality="GOOD"
    )

    assert result.risk_level == "HIGH"
    assert "high risk" in result.explanation.lower() or "acute" in result.explanation.lower() or "escalat" in result.explanation.lower()
    assert "expert" in result.recommended_action.lower() or "isolate" in result.recommended_action.lower()

def test_poor_image_quality_triggers_warning():
    """Verify poor image quality adds a warning factor and prompts recapture."""
    adapter = HybridRiskModel()
    img_bytes = create_test_image()

    result = adapter.predict(
        image_bytes=img_bytes,
        symptoms=["Coughing"],
        temperature=38.6,
        appetite_status="NORMAL",
        activity_status="NORMAL",
        image_quality="POOR"
    )

    assert any("POOR" in f or "image quality" in f.lower() for f in result.factors)
