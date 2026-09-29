# Systematic Error Analysis & Clinical Review

## 1. Overview
Automated risk scoring systems in veterinary triage must undergo continuous scrutiny to prevent systematic diagnostic blind spots and bias. Rather than treating discrepancies as isolated software bugs, the platform implements a **structured error categorization taxonomy**.

Whenever a veterinary expert disagrees with the preliminary system risk level or modifies an assessment, they tag the discrepancy with an authoritative category.

---

## 2. The 10 Systematic Error Categories

| Error Category Code | Display Name | Clinical / Operational Definition | Mitigation Strategy |
| :--- | :--- | :--- | :--- |
| `IMAGE_QUALITY` | Poor / Inadequate Image Quality | The captured image is too blurry, underexposed, or distant to assess lesions or ocular discharge. | Enhance client-side image quality checks and guided framing prompts. |
| `SYMPTOM_MISSING` | Critical Symptom Unreported | The farmer omitted a pivotal symptom present in the animal (e.g. unnoticed nasal discharge). | Introduce guided symptom checklists tailored to the selected species. |
| `SYMPTOM_AMBIGUITY` | Ambiguous / Conflicting Symptoms | Reported symptoms conflict or are too generic to distinguish between conditions. | Provide severity and onset duration refinement tools in UI. |
| `LOCATION_MISSING` | Incomplete Geographical Context | Farm or pasture location is missing, impairing regional epidemiological tracking. | Auto-capture device GPS coordinates with farmer consent. |
| `STAGE_MISSING` | Incomplete Age / Stage Context | Animal growth stage (e.g. newborn vs lactating) was missing, distorting risk evaluation. | Require age stage selection during initial animal registration. |
| `RISK_OVER_ESTIMATION` | System Over-Estimation | System assigned `HIGH` risk to a benign, self-limiting condition, overwhelming the expert queue. | Calibrate rule weights for transient mild symptoms. |
| `RISK_UNDER_ESTIMATION` | System Under-Estimation | System assigned `LOW` or `MEDIUM` to an acute, life-threatening condition. | **High Priority**: Add emergency symptom triggers for immediate escalation. |
| `SYNC_FAILURE` | Synchronization Failure / Stale Data | Network latency delayed the transmission of an acute observation. | Optimize sync retry backoff and background synchronization triggers. |
| `EXPERT_MODIFICATION` | Clinical Judgment Override | Expert adjusted triage level based on nuanced holistic evaluation. | Record expert notes to refine the rule engine baseline. |
| `OTHER` | Unclassified Anomaly | Uncategorized observation anomaly. | Periodically audit for emerging failure patterns. |

---

## 3. Disagreement Tracking Schema

When an expert completes a review via `POST /api/observations/{id}/expert-review`:

```json
{
  "expert_decision": "MODIFIED",
  "modified_risk_level": "HIGH",
  "error_category": "RISK_UNDER_ESTIMATION",
  "expert_notes": "Farmer noted mild cough, but animal is an infant calf showing signs of rapid decompensation.",
  "diagnosis": "Bovine Bronchopneumonia",
  "comments": "Upgraded from MEDIUM to HIGH risk due to age vulnerability."
}
```

The system preserves:
1. `system_risk_level`: The immutable preliminary rating calculated by the engine (`MEDIUM`).
2. `modified_risk_level`: The expert's clinical adjustment (`HIGH`).
3. `is_agreement`: Automatically flagged `false`.
4. `error_category`: Tagged as `RISK_UNDER_ESTIMATION`.

---

## 4. Error Analysis Reporting API

The backend exposes `GET /api/metrics/error-analysis` which calculates:
- Total reviews evaluated
- Global agreement rate:
  $$\text{Agreement Rate} = \frac{\text{Count}(\text{Agreement})}{\text{Total Validated Reviews}}$$
- Disagreement rate:
  $$\text{Disagreement Rate} = 1.0 - \text{Agreement Rate}$$
- Frequency histogram across all 10 error categories.

This data directly feeds into the **Expert Dashboard Analytics View** and provides empirical guidance for refining triage rules.
