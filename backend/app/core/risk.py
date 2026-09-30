"""
Risk Assessment Engine & Model Adapter Architecture.
Provides the pluggable ImageRiskModel interface and implementations:
- RuleBasedRiskModel
- MLRiskModel
- HybridRiskModel
Selectable via configuration (MODEL_TYPE=rule_based|ml|hybrid, MIN_CONFIDENCE=0.60).
Includes:
- Low-confidence safety rule (risk_level = REVIEW_REQUIRED when confidence < threshold)
- Explainable decision output with farmer-friendly contributing factors
- Clinical safety nets ensuring acute symptoms override benign visual classifications
- Backward compatibility with existing endpoints and tests.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import List, Dict, Any, Tuple, Optional
import os

from app.core.config import settings

DISCLAIMER_TEXT = "Preliminary risk assessment. This is not a confirmed veterinary medical diagnosis."


@dataclass
class RiskAssessmentResult:
    """
    Transparent risk assessment result containing confidence,
    farmer-friendly explanations, and recommended immediate actions.
    """
    risk_level: str  # LOW, MEDIUM, HIGH, REVIEW_REQUIRED, UNKNOWN
    predicted_condition: str
    confidence: float
    explanation: str
    factors: List[str] = field(default_factory=list)
    recommended_action: str = ""
    confidence_interpretation: str = ""
    expert_review_status: str = "OPTIONAL"  # OPTIONAL, RECOMMENDED, ESCALATED, REQUIRED
    disclaimer: str = DISCLAIMER_TEXT
    model_type_used: str = "rule_based"

    def as_dict(self) -> Dict[str, Any]:
        return {
            "risk_level": self.risk_level,
            "predicted_condition": self.predicted_condition,
            "confidence": round(self.confidence, 2),
            "explanation": self.explanation,
            "factors": self.factors,
            "recommended_action": self.recommended_action,
            "confidence_interpretation": self.confidence_interpretation,
            "expert_review_status": self.expert_review_status,
            "disclaimer": self.disclaimer,
            "model_type_used": self.model_type_used
        }

    def as_tuple(self) -> Tuple[str, str, float, str]:
        """Backward-compatible tuple: (risk_level, condition, confidence, explanation)"""
        return self.risk_level, self.predicted_condition, self.confidence, self.explanation


def interpret_confidence(confidence: float, threshold: float = 0.60) -> str:
    """Return transparent non-misleading confidence interpretation."""
    if confidence < threshold:
        return f"Low confidence ({int(confidence * 100)}%). System confidence is below the {int(threshold * 100)}% reliability safety threshold. Automated conclusion deferred."
    elif confidence < 0.75:
        return f"Moderate confidence ({int(confidence * 100)}%). Assessment is preliminary; monitor closely."
    else:
        return f"High confidence ({int(confidence * 100)}%). Key clinical signals correlate with observed pattern."


class ImageRiskModel(ABC):
    """
    Abstract interface for livestock image and clinical risk assessment models.
    Allows transparent rule-based, ML, and hybrid composite models to be swapped
    via configuration without modifying caller workflows.
    """

    @abstractmethod
    def assess(
        self,
        symptoms: List[str],
        temperature: Optional[float] = None,
        appetite_status: str = "NORMAL",
        activity_status: str = "NORMAL",
        age_stage: Optional[str] = None,
        image_quality: Optional[str] = None,
        image_path: Optional[str] = None,
        image_bytes: Optional[bytes] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> RiskAssessmentResult:
        """Evaluate observation signals and generate transparent assessment."""
        pass

    def predict(
        self,
        symptoms: Optional[List[str]] = None,
        temperature: Optional[float] = None,
        appetite_status: str = "NORMAL",
        activity_status: str = "NORMAL",
        age_stage: Optional[str] = None,
        image_quality: Optional[str] = None,
        image_path: Optional[str] = None,
        image_bytes: Optional[bytes] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> RiskAssessmentResult:
        """Alias for assess() adhering to standard model naming conventions."""
        return self.assess(
            symptoms=symptoms or [],
            temperature=temperature,
            appetite_status=appetite_status,
            activity_status=activity_status,
            age_stage=age_stage,
            image_quality=image_quality,
            image_path=image_path,
            image_bytes=image_bytes,
            metadata=metadata
        )


class RuleBasedRiskModel(ImageRiskModel):
    """
    Deterministic, transparent rule-based risk evaluation baseline.
    Evaluates clinical symptoms, temperature, appetite, activity,
    age stage vulnerabilities, and image quality.
    """

    HIGH_RISK_SYMPTOMS = {'fever', 'nasal discharge', 'diarrhea', 'skin changes', 'swelling'}
    MODERATE_RISK_SYMPTOMS = {'coughing', 'reduced appetite', 'reduced activity'}

    def assess(
        self,
        symptoms: List[str],
        temperature: Optional[float] = None,
        appetite_status: str = "NORMAL",
        activity_status: str = "NORMAL",
        age_stage: Optional[str] = None,
        image_quality: Optional[str] = None,
        image_path: Optional[str] = None,
        image_bytes: Optional[bytes] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> RiskAssessmentResult:
        symptoms_list = symptoms or []
        matched_high = [s for s in symptoms_list if any(hr in s.lower() for hr in self.HIGH_RISK_SYMPTOMS)]
        matched_mod = [s for s in symptoms_list if any(mr in s.lower() for mr in self.MODERATE_RISK_SYMPTOMS)]

        is_high_temp = temperature is not None and temperature >= 39.5
        is_mod_temp = temperature is not None and (38.8 <= temperature < 39.5)

        is_poor_appetite = appetite_status.upper() in ['POOR', 'NONE', 'REDUCED']
        is_lethargic = activity_status.upper() in ['LETHARGIC', 'LOW', 'REDUCED']
        is_young_stage = (age_stage or "").lower() in ['newborn', 'young', 'calf', 'kid', 'lamb', 'piglet']

        score = 0.0
        factors: List[str] = []

        if matched_high:
            score += len(matched_high) * 3.0
            factors.append(f"Severe clinical symptoms reported: {', '.join(matched_high)}")

        if matched_mod:
            score += len(matched_mod) * 1.5
            factors.append(f"Moderate clinical symptoms noted: {', '.join(matched_mod)}")

        if is_high_temp:
            score += 3.0
            factors.append(f"Elevated body temperature detected ({temperature}°C)")
        elif is_mod_temp:
            score += 1.5
            factors.append(f"Mildly elevated body temperature ({temperature}°C)")

        if is_poor_appetite:
            score += 2.0
            factors.append(f"Appetite status is {appetite_status.lower()} (reluctant to feed)")

        if is_lethargic:
            score += 2.0
            factors.append(f"Activity level is depressed / {activity_status.lower()}")

        if is_young_stage:
            score += 0.5
            factors.append(f"Animal age stage ({age_stage}) has increased physiological vulnerability")

        if image_quality:
            iq_upper = image_quality.upper()
            if iq_upper == "POOR":
                factors.append("Attached photograph has low quality; manual in-person inspection advised")
            elif iq_upper in ["GOOD", "ACCEPTABLE"]:
                factors.append(f"Attached photograph quality is {iq_upper.lower()} for visual triage")

        # Determine level, condition, confidence, and action
        min_conf = settings.MIN_CONFIDENCE

        if score >= 5.0 or len(matched_high) >= 2 or (is_high_temp and is_poor_appetite):
            risk_level = "HIGH"
            condition = "Suspected Acute Respiratory or Infectious Condition"
            confidence = 0.85
            explanation = (
                "High risk detected due to combinations of systemic symptoms "
                f"({', '.join(symptoms_list) if symptoms_list else 'elevated metrics'}), "
                f"body temperature ({temperature}°C if recorded), and reduced activity/appetite. "
                "Case automatically escalated to veterinary expert for review."
            )
            recommended_action = "Isolate animal from herd immediately and submit observation for prompt veterinary expert review."
            expert_status = "ESCALATED"

        elif score >= 2.5 or len(matched_mod) >= 2 or is_poor_appetite or is_lethargic or is_mod_temp:
            risk_level = "MEDIUM"
            condition = "Mild Livestock Distress or Early Symptom Onset"
            confidence = 0.70
            explanation = (
                "Moderate risk detected. The animal shows mild symptoms or changes in appetite/activity. "
                "Monitor closely for the next 24-48 hours and re-record observations if symptoms persist."
            )
            recommended_action = "Monitor closely for 24-48 hours, ensure clean water and shelter, and re-record if symptoms worsen."
            expert_status = "RECOMMENDED"

        elif len(symptoms_list) == 0 and appetite_status.upper() in ['NORMAL', 'GOOD'] and activity_status.upper() in ['NORMAL', 'ACTIVE']:
            risk_level = "LOW"
            condition = "Normal Healthy State"
            confidence = 0.95
            explanation = "The animal shows healthy vitality, normal appetite, and no suspicious disease symptoms."
            recommended_action = "Continue regular feeding and routine daily herd management."
            factors.append("No abnormal symptoms reported; vitality and feeding are normal.")
            expert_status = "OPTIONAL"

        else:
            # Low signals or ambiguous state
            risk_level = "LOW"
            condition = "Minor Variation / General Monitoring"
            confidence = 0.80
            explanation = "Observations appear generally stable. Continue routine daily monitoring."
            recommended_action = "Continue standard daily observations and shelter checks."
            if not factors:
                factors.append("Baseline observation parameters remain stable.")
            expert_status = "OPTIONAL"

        # Apply low-confidence safety rule
        if confidence < min_conf:
            risk_level = "REVIEW_REQUIRED"
            factors.append(f"System confidence ({int(confidence * 100)}%) is below safety threshold ({int(min_conf * 100)}%)")
            explanation = "Automated assessment inconclusive due to low confidence. Case routed for expert evaluation."
            recommended_action = "Expert review recommended because system confidence is low."
            expert_status = "REQUIRED"

        return RiskAssessmentResult(
            risk_level=risk_level,
            predicted_condition=condition,
            confidence=confidence,
            explanation=explanation,
            factors=factors,
            recommended_action=recommended_action,
            confidence_interpretation=interpret_confidence(confidence, min_conf),
            expert_review_status=expert_status,
            disclaimer=DISCLAIMER_TEXT,
            model_type_used="rule_based"
        )


class MLRiskModel(ImageRiskModel):
    """
    Image-based ML classifier adapter using the lightweight LivestockBaselineClassifier.
    Applies strict confidence calibration and safety intercept.
    """

    def __init__(self):
        # Lazy import to keep module lightweight
        from app.ml.model import LivestockBaselineClassifier, baseline_image_model
        self.classifier = baseline_image_model or LivestockBaselineClassifier()

    def assess(
        self,
        symptoms: List[str],
        temperature: Optional[float] = None,
        appetite_status: str = "NORMAL",
        activity_status: str = "NORMAL",
        age_stage: Optional[str] = None,
        image_quality: Optional[str] = None,
        image_path: Optional[str] = None,
        image_bytes: Optional[bytes] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> RiskAssessmentResult:
        min_conf = settings.MIN_CONFIDENCE
        factors: List[str] = []

        # Check if an image is provided
        target_img = image_path or image_bytes
        if not target_img:
            # Fallback if no photo attached
            return RiskAssessmentResult(
                risk_level="REVIEW_REQUIRED",
                predicted_condition="Image Not Available for ML Inference",
                confidence=0.50,
                explanation="No image attached for visual classification. Please submit an observation photograph or use rule-based assessment.",
                factors=["Visual evidence missing"],
                recommended_action="Capture and upload animal photograph for visual triage.",
                confidence_interpretation=interpret_confidence(0.50, min_conf),
                expert_review_status="REQUIRED",
                disclaimer=DISCLAIMER_TEXT,
                model_type_used="ml"
            )

        try:
            pred_res = self.classifier.predict(target_img)
            pred_class = pred_res["prediction"]
            confidence = pred_res["confidence"]
            preliminary_risk = pred_res["preliminary_risk"]

            factors.append(f"Visual feature classification: '{pred_class}' ({int(confidence * 100)}% confidence)")
            if image_quality:
                factors.append(f"Image quality rated: {image_quality}")

            # Low-confidence safety rule
            if confidence < min_conf:
                risk_level = "REVIEW_REQUIRED"
                condition = "Low-Confidence Visual Classification"
                explanation = "System confidence is below the safety threshold. The model avoided a strong automated conclusion."
                recommended_action = "Expert review recommended because system confidence is low."
                expert_status = "REQUIRED"
                factors.append(f"Confidence {int(confidence * 100)}% < threshold {int(min_conf * 100)}%")
            else:
                risk_level = preliminary_risk
                condition = f"Visual Indication: {pred_class}"
                explanation = pred_res["explanation"]
                if risk_level == "HIGH":
                    recommended_action = "Isolate animal and request prompt veterinary review."
                    expert_status = "ESCALATED"
                elif risk_level == "MEDIUM":
                    recommended_action = "Monitor animal daily and record visual progression."
                    expert_status = "RECOMMENDED"
                else:
                    recommended_action = "Continue routine herd monitoring."
                    expert_status = "OPTIONAL"

            return RiskAssessmentResult(
                risk_level=risk_level,
                predicted_condition=condition,
                confidence=confidence,
                explanation=explanation,
                factors=factors,
                recommended_action=recommended_action,
                confidence_interpretation=interpret_confidence(confidence, min_conf),
                expert_review_status=expert_status,
                disclaimer=DISCLAIMER_TEXT,
                model_type_used="ml"
            )
        except Exception as e:
            return RiskAssessmentResult(
                risk_level="REVIEW_REQUIRED",
                predicted_condition="Visual Classifier Error",
                confidence=0.50,
                explanation=f"Error evaluating image: {str(e)}. Deferring to veterinary review.",
                factors=[f"ML processing exception: {str(e)}"],
                recommended_action="Expert review recommended because automated processing encountered an error.",
                confidence_interpretation=interpret_confidence(0.50, min_conf),
                expert_review_status="REQUIRED",
                disclaimer=DISCLAIMER_TEXT,
                model_type_used="ml"
            )


class HybridRiskModel(ImageRiskModel):
    """
    Composite risk engine combining rule-based heuristics with visual ML models.
    Applies clinical safety rules:
    - Acute symptoms (fever, discharge, swelling) escalate risk regardless of visual prediction.
    - If image is POOR quality, warns user and suggests recapture.
    - If confidence < MIN_CONFIDENCE, flags REVIEW_REQUIRED.
    - AI prediction is distinct and NEVER overrides expert decisions.
    """

    def __init__(
        self,
        rule_model: Optional[RuleBasedRiskModel] = None,
        ml_model: Optional[MLRiskModel] = None
    ):
        self.rule_model = rule_model or RuleBasedRiskModel()
        self.ml_model = ml_model or MLRiskModel()

    def assess(
        self,
        symptoms: List[str],
        temperature: Optional[float] = None,
        appetite_status: str = "NORMAL",
        activity_status: str = "NORMAL",
        age_stage: Optional[str] = None,
        image_quality: Optional[str] = None,
        image_path: Optional[str] = None,
        image_bytes: Optional[bytes] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> RiskAssessmentResult:
        min_conf = settings.MIN_CONFIDENCE

        # 1. Evaluate Rule-based signals
        rule_result = self.rule_model.assess(
            symptoms=symptoms,
            temperature=temperature,
            appetite_status=appetite_status,
            activity_status=activity_status,
            age_stage=age_stage,
            image_quality=image_quality,
            metadata=metadata
        )

        factors = list(rule_result.factors)

        # 2. Evaluate Visual ML signals if image is provided
        ml_result: Optional[RiskAssessmentResult] = None
        has_image = bool(image_path or image_bytes)
        if has_image:
            try:
                ml_result = self.ml_model.assess(
                    symptoms=symptoms,
                    temperature=temperature,
                    appetite_status=appetite_status,
                    activity_status=activity_status,
                    age_stage=age_stage,
                    image_quality=image_quality,
                    image_path=image_path,
                    image_bytes=image_bytes,
                    metadata=metadata
                )
                for f in ml_result.factors:
                    if f not in factors:
                        factors.append(f)
            except Exception:
                ml_result = None

        # Check poor image quality safety case
        is_poor_image = (image_quality or "").upper() == "POOR"
        if is_poor_image:
            factors.append("Low image quality detected (blur/low resolution); recapture advised")

        # 3. Hybrid synthesis
        if ml_result and ml_result.risk_level != "REVIEW_REQUIRED":
            # Weighted confidence combining clinical observations and visual features
            combined_conf = round(0.55 * rule_result.confidence + 0.45 * ml_result.confidence, 2)
            
            # Clinical safety net: high rule risk always overrides benign visual prediction
            if rule_result.risk_level == "HIGH" or ml_result.risk_level == "HIGH":
                final_risk = "HIGH"
                condition = rule_result.predicted_condition if rule_result.risk_level == "HIGH" else ml_result.predicted_condition
                action = "Isolate animal from herd immediately and submit observation for prompt veterinary expert review."
                expert_status = "ESCALATED"
                explanation = (
                    f"Hybrid evaluation indicates elevated risk. Structured symptoms and visual patterns "
                    f"show clinical concern ({condition}). Case escalated for veterinary review."
                )
            elif rule_result.risk_level == "MEDIUM" or ml_result.risk_level == "MEDIUM":
                final_risk = "MEDIUM"
                condition = "Mild Livestock Distress or Early Symptom Onset"
                action = "Monitor closely for 24-48 hours, ensure clean water and shelter, and re-record if symptoms worsen."
                expert_status = "RECOMMENDED"
                explanation = (
                    "Moderate risk detected from combined clinical signals and visual indicators. "
                    "Routine monitoring with expert escalation if symptoms progress."
                )
            else:
                final_risk = "LOW"
                condition = "Normal Healthy State"
                action = "Continue regular feeding and routine daily herd management."
                expert_status = "OPTIONAL"
                explanation = "Animal shows stable clinical vitality and normal visual coat/tissue appearance."
        else:
            # Defer to rule engine when image inference is missing or low-confidence
            final_risk = rule_result.risk_level
            condition = rule_result.predicted_condition
            combined_conf = rule_result.confidence
            action = rule_result.recommended_action
            expert_status = rule_result.expert_review_status
            explanation = rule_result.explanation

        # 4. Low-confidence safety rule
        if combined_conf < min_conf:
            final_risk = "REVIEW_REQUIRED"
            factors.append(f"Combined confidence ({int(combined_conf * 100)}%) is below safety threshold ({int(min_conf * 100)}%)")
            explanation = "Expert review recommended because system confidence is low."
            action = "Send this observation for expert review because system confidence is low."
            expert_status = "REQUIRED"

        # 5. Image quality override
        if is_poor_image and final_risk == "LOW":
            final_risk = "MEDIUM"
            action = "Poor photograph quality prevents reliable visual triage. Re-capture a clear photo in good light or request in-person review."
            expert_status = "RECOMMENDED"

        return RiskAssessmentResult(
            risk_level=final_risk,
            predicted_condition=condition,
            confidence=combined_conf,
            explanation=explanation,
            factors=factors,
            recommended_action=action,
            confidence_interpretation=interpret_confidence(combined_conf, min_conf),
            expert_review_status=expert_status,
            disclaimer=DISCLAIMER_TEXT,
            model_type_used="hybrid"
        )


def get_risk_model(model_type: Optional[str] = None) -> ImageRiskModel:
    """
    Factory function returning the configured risk model adapter.
    Selectable via settings.MODEL_TYPE: 'rule_based', 'ml', or 'hybrid'.
    """
    selected = (model_type or getattr(settings, "MODEL_TYPE", "hybrid")).lower()
    if selected in ["rule_based", "rule", "rules"]:
        return RuleBasedRiskModel()
    elif selected in ["ml", "ml_model", "machine_learning"]:
        return MLRiskModel()
    elif selected in ["hybrid", "composite"]:
        return HybridRiskModel()
    else:
        return HybridRiskModel()


get_model_adapter = get_risk_model

# Default engine alias and backward-compatible singleton
default_risk_engine = get_risk_model()
RiskAssessmentEngine = ImageRiskModel
RuleBasedRiskEngine = RuleBasedRiskModel
MLModelRiskEngine = MLRiskModel
HybridRiskEngine = HybridRiskModel
RuleBasedRiskModelAdapter = RuleBasedRiskModel
MLRiskModelAdapter = MLRiskModel
HybridRiskModelAdapter = HybridRiskModel


def evaluate_disease_risk(
    symptoms: List[str],
    temperature: float | None,
    appetite_status: str,
    activity_status: str,
    age_stage: Optional[str] = None,
    image_quality: Optional[str] = None,
    image_path: Optional[str] = None
) -> Tuple[str, str, float, str]:
    """
    Evaluates livestock health observation and returns:
    (risk_level, predicted_condition, confidence_score, explanation)
    Backward-compatible entry point for existing API endpoints and test suites.
    """
    engine = get_risk_model()
    result = engine.assess(
        symptoms=symptoms,
        temperature=temperature,
        appetite_status=appetite_status,
        activity_status=activity_status,
        age_stage=age_stage,
        image_quality=image_quality,
        image_path=image_path
    )
    return result.as_tuple()
