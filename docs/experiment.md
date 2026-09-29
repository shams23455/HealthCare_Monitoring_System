# Controlled Field Experiment Design

## 1. Objective
To systematically evaluate the clinical and operational effectiveness of the **Livestock Health Observation and Expert Escalation System** in comparison to traditional, manual veterinary notification workflows in low-resource farming communities.

---

## 2. Experimental Structure

```
                  +----------------------------------------------+
                  |         Participating Livestock Cohort       |
                  |         (Smallholder Cattle, Goats, Sheep)   |
                  +----------------------------------------------+
                                         |
                   +---------------------+---------------------+
                   |                                           |
                   v                                           v
       +-----------------------+                   +-----------------------+
       |   Control Workflow    |                   |   Intervention Group  |
       |  (Manual / Phone /    |                   |  (Offline-First PWA + |
       |   Paper Escalation)   |                   |   Structured Triage)  |
       +-----------+-----------+                   +-----------+-----------+
                   |                                           |
                   v                                           v
       +-----------------------+                   +-----------------------+
       | In-Person Vet Notice  |                   | Automated Escalation  |
       +-----------+-----------+                   +-----------+-----------+
                   |                                           |
                   v                                           v
       +-----------------------+                   +-----------------------+
       | Late Clinical Action  |                   | Early Expert Decision |
       +-----------------------+                   +-----------------------+
```

### Treatment Groups:
- **Baseline (Control)**: Standard practice—farmer notices signs, monitors without digital logs, makes periodic phone calls or travels to district extension center to seek veterinary aid.
- **Proposed (Intervention)**: Farmer records symptoms with `first_symptom_at`, takes standardized photos with quality validation, records vital signs offline, and synchronizes automatically for rapid expert review.

---

## 3. Comparative Evaluation Framework

| Metric / Dimension | Baseline (Manual Workflow) | Target (Proposed Digital System) | Measured Result (Field Trial) | Difference / Impact |
| :--- | :--- | :--- | :--- | :--- |
| **Primary Metric**: Time from first symptom to expert review | 48.0 – 72.0 hours (literature/survey benchmark) | **< 6.0 hours** | *To be populated after field trial* | *Calculated post-trial* |
| **Observation Ingestion Delay** (`submitted_at - observed_at`) | > 24.0 hours | **< 0.5 hours** (post-connectivity) | *To be populated after field trial* | *Calculated post-trial* |
| **Information Completeness** (Symptoms + Vitals + Image) | < 20% complete | **> 90% complete** | *To be populated after field trial* | *Calculated post-trial* |
| **Photo Attachment Rate with Quality Check** | < 5% (unstandardized) | **> 85% passed quality check** | *To be populated after field trial* | *Calculated post-trial* |
| **Escalation Triage Time** | > 12.0 hours | **< 5 minutes** (instant automated triage) | *To be populated after field trial* | *Calculated post-trial* |
| **Actionable Expert Recommendations Delivered** | Variable (often verbal) | **100% digitally recorded & audited** | *To be populated after field trial* | *Calculated post-trial* |

---

## 4. Methodology & Data Collection Safeguards

1. **Non-Invasive Protocol**: Observations do not disrupt ongoing agricultural operations or substitute necessary emergency veterinary interventions.
2. **Strict Privacy**: No personally identifiable information (PII) of farmers or human visual identifiers are collected.
3. **Audit Trail**: Every interaction is logged with timezone-aware ISO-8601 timestamps to ensure statistical verifiability.
4. **Trial Duration & Sample Size**: 
   - Sample cohort: 50–100 smallholder farms across target sub-counties.
   - Evaluation window: 12-week observational period.
