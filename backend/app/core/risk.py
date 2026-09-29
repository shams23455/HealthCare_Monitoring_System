from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import List, Dict, Any, Tuple, Optional

DISCLAIMER_TEXT = "Preliminary risk assessment. This is not a confirmed diagnosis."

@dataclass
class RiskAssessmentResult:
    """
    Transparent risk assessment result containing confidence,
    farmer-friendly explanations, and recommended immediate actions.
    """
    risk_level: str  # LOW, MEDIUM, HIGH, UNKNOWN
    predicted_condition: str
    confidence: float
    explanation: str
    factors: List[str] = field(default_factory=list)
    recommended_action: str = ""
    disclaimer: str = DISCLAIMER_TEXT

    def as_dict(self) -> Dict[str, Any]:
        return {
            "risk_level": self.risk_level,
            "predicted_condition": self.predicted_condition,
            "confidence": round(self.confidence, 2),
            "explanation": self.explanation,
            "factors": self.factors,
            "recommended_action": self.recommended_action,
            "disclaimer": self.disclaimer
        }

    def as_tuple(self) -> Tuple[str, str, float, str]:
        """Backward-compatible tuple: (risk_level, condition, confidence, explanation)"""
        return self.risk_level, self.predicted_condition, self.confidence, self.explanation


class RiskAssessmentEngine(ABC):
    """
    Abstract interface for all livestock health risk assessment engines.
    Allows transparent rule-based engines, future ML models, and hybrid engines
    to be swapped without altering the rest of the application.
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
        metadata: Optional[Dict[str, Any]] = None
    ) -> RiskAssessmentResult:
        """Evaluate observation signals and generate transparent assessment."""
        pass


class RuleBasedRiskEngine(RiskAssessmentEngine):
    """
    Deterministic, transparent rule-based risk evaluation baseline.
    Does NOT claim to be a deep learning model.
    Evaluates clinical symptoms, temperature, appetite, activity,
    age vulnerabilities, and image quality.
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
        metadata: Optional[Dict[str, Any]] = None
    ) -> RiskAssessmentResult:
        symptoms_list = symptoms or []
        symptoms_lower = [s.lower() for s in symptoms_list]

        matched_high = [s for s in symptoms_list if any(hr in s.lower() for hr in self.HIGH_RISK_SYMPTOMS)]
        matched_mod = [s for s in symptoms_list if any(mr in s.lower() for mr in self.MODERATE_RISK_SYMPTOMS)]

        is_high_temp = temperature is not None and temperature >= 39.5
        is_mod_temp = temperature is not None and (38.8 <= temperature < 39.5)

        is_poor_appetite = appetite_status.upper() in ['POOR', 'NONE', 'REDUCED']
        is_lethargic = activity_status.upper() in ['LETHARGIC', 'LOW', 'REDUCED']
        is_young_stage = (age_stage or "").lower() in ['newborn', 'young', 'calf', 'kid', 'lamb', 'piglet']

        # Transparent scoring calculation
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

        elif score >= 2.5 or len(matched_mod) >= 2 or is_poor_appetite or is_lethargic or is_mod_temp:
            risk_level = "MEDIUM"
            condition = "Mild Livestock Distress or Early Symptom Onset"
            confidence = 0.70
            explanation = (
                "Moderate risk detected. The animal shows mild symptoms or changes in appetite/activity. "
                "Monitor closely for the next 24-48 hours and re-record observations if symptoms persist."
            )
            recommended_action = "Monitor closely for 24-48 hours, ensure clean water and shelter, and re-record if symptoms worsen."

        elif len(symptoms_list) == 0 and appetite_status.upper() in ['NORMAL', 'GOOD'] and activity_status.upper() in ['NORMAL', 'ACTIVE']:
            risk_level = "LOW"
            condition = "Normal Healthy State"
            confidence = 0.95
            explanation = "The animal shows healthy vitality, normal appetite, and no suspicious disease symptoms."
            recommended_action = "Continue regular feeding and routine daily herd management."
            factors.append("No abnormal symptoms reported; vitality and feeding are normal.")

        else:
            risk_level = "LOW"
            condition = "Minor Variation / General Monitoring"
            confidence = 0.80
            explanation = "Observations appear generally stable. Continue routine daily monitoring."
            recommended_action = "Continue standard daily observations and shelter checks."
            if not factors:
                factors.append("Baseline observation parameters remain stable.")

        return RiskAssessmentResult(
            risk_level=risk_level,
            predicted_condition=condition,
            confidence=confidence,
            explanation=explanation,
            factors=factors,
            recommended_action=recommended_action,
            disclaimer=DISCLAIMER_TEXT
        )


class MLModelRiskEngine(RiskAssessmentEngine):
    """
    Extensible adapter placeholder for future Edge or Cloud ML inference models.
    Does NOT fake inference accuracy. Strictly documents interface requirements.
    """

    def __init__(self, model_path: Optional[str] = None):
        self.model_path = model_path
        self.is_loaded = False

    def assess(
        self,
        symptoms: List[str],
        temperature: Optional[float] = None,
        appetite_status: str = "NORMAL",
        activity_status: str = "NORMAL",
        age_stage: Optional[str] = None,
        image_quality: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> RiskAssessmentResult:
        if not self.is_loaded:
            raise NotImplementedError(
                "ML model inference is not active in this development stage. "
                "Please configure and use RuleBasedRiskEngine."
            )
        # Future ML forward-pass logic
        return RiskAssessmentResult(
            risk_level="UNKNOWN",
            predicted_condition="ML Assessment Pending Model Integration",
            confidence=0.50,
            explanation="Future computer vision / tabular model prediction.",
            factors=["ML engine placeholder active"],
            recommended_action="Refer to rule-based fallback."
        )


class HybridRiskEngine(RiskAssessmentEngine):
    """
    Composite risk engine combining rule-based heuristics with machine learning models.
    Falls back reliably to RuleBasedRiskEngine whenever ML inference is unavailable or low-confidence.
    """

    def __init__(
        self,
        rule_engine: Optional[RuleBasedRiskEngine] = None,
        ml_engine: Optional[MLModelRiskEngine] = None
    ):
        self.rule_engine = rule_engine or RuleBasedRiskEngine()
        self.ml_engine = ml_engine or MLModelRiskEngine()

    def assess(
        self,
        symptoms: List[str],
        temperature: Optional[float] = None,
        appetite_status: str = "NORMAL",
        activity_status: str = "NORMAL",
        age_stage: Optional[str] = None,
        image_quality: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> RiskAssessmentResult:
        # Currently default to transparent rule engine
        return self.rule_engine.assess(
            symptoms=symptoms,
            temperature=temperature,
            appetite_status=appetite_status,
            activity_status=activity_status,
            age_stage=age_stage,
            image_quality=image_quality,
            metadata=metadata
        )


# Singleton default engine
default_risk_engine = RuleBasedRiskEngine()


def evaluate_disease_risk(
    symptoms: List[str],
    temperature: float | None,
    appetite_status: str,
    activity_status: str,
    age_stage: Optional[str] = None,
    image_quality: Optional[str] = None
) -> Tuple[str, str, float, str]:
    """
    Evaluates livestock health observation and returns:
    (risk_level, predicted_condition, confidence_score, explanation)

    Backward-compatible entry point for existing API endpoints and test suites.
    """
    result = default_risk_engine.assess(
        symptoms=symptoms,
        temperature=temperature,
        appetite_status=appetite_status,
        activity_status=activity_status,
        age_stage=age_stage,
        image_quality=image_quality
    )
    return result.as_tuple()
