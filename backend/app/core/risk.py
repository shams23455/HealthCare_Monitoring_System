from typing import List, Dict, Any, Tuple

def evaluate_disease_risk(
    symptoms: List[str],
    temperature: float | None,
    appetite_status: str,
    activity_status: str
) -> Tuple[str, str, float, str]:
    """
    Evaluates livestock health observation and returns:
    (risk_level, predicted_condition, confidence_score, explanation)
    
    Risk Levels: LOW, MEDIUM, HIGH, UNKNOWN
    """
    symptoms_lower = [s.lower() for s in (symptoms or [])]
    high_risk_symptoms = {'fever', 'nasal discharge', 'diarrhea', 'skin changes', 'swelling'}
    moderate_risk_symptoms = {'coughing', 'reduced appetite', 'reduced activity'}
    
    matched_high = [s for s in symptoms_lower if any(hr in s for hr in high_risk_symptoms)]
    matched_mod = [s for s in symptoms_lower if any(mr in s for mr in moderate_risk_symptoms)]
    
    is_high_temp = temperature is not None and temperature >= 39.5
    is_mod_temp = temperature is not None and (38.8 <= temperature < 39.5)
    
    is_poor_appetite = appetite_status.upper() in ['POOR', 'NONE', 'REDUCED']
    is_lethargic = activity_status.upper() in ['LETHARGIC', 'LOW', 'REDUCED']
    
    # Calculate score
    score = 0
    score += len(matched_high) * 3
    score += len(matched_mod) * 1.5
    if is_high_temp:
        score += 3
    elif is_mod_temp:
        score += 1.5
    if is_poor_appetite:
        score += 2
    if is_lethargic:
        score += 2
        
    if score >= 5 or len(matched_high) >= 2 or (is_high_temp and is_poor_appetite):
        risk_level = "HIGH"
        condition = "Suspected Acute Respiratory or Infectious Condition"
        confidence = 0.85
        explanation = (
            "High risk detected due to combinations of systemic symptoms "
            f"({', '.join(symptoms) if symptoms else 'elevated metrics'}), "
            f"body temperature ({temperature}°C if recorded), and reduced activity/appetite. "
            "Case automatically escalated to veterinary expert for review."
        )
    elif score >= 2.5 or len(matched_mod) >= 2 or is_poor_appetite or is_lethargic or is_mod_temp:
        risk_level = "MEDIUM"
        condition = "Mild Livestock Distress or Early Symptom Onset"
        confidence = 0.70
        explanation = (
            "Moderate risk detected. The animal shows mild symptoms or changes in appetite/activity. "
            "Monitor closely for the next 24-48 hours and re-record observations if symptoms persist."
        )
    elif len(symptoms) == 0 and appetite_status.upper() in ['NORMAL', 'GOOD'] and activity_status.upper() in ['NORMAL', 'ACTIVE']:
        risk_level = "LOW"
        condition = "Normal Healthy State"
        confidence = 0.95
        explanation = "The animal shows healthy vitality, normal appetite, and no suspicious disease symptoms."
    else:
        risk_level = "LOW"
        condition = "Minor Variation / General Monitoring"
        confidence = 0.80
        explanation = "Observations appear generally stable. Continue routine daily monitoring."
        
    return risk_level, condition, confidence, explanation
