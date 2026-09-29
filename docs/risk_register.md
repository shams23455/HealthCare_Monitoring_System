# Project Risk Register

## 1. Overview
This register identifies, assesses, and tracks the mitigation strategies for operational, clinical, technical, and privacy risks associated with the Livestock Health Observation and Expert Escalation System.

---

## 2. Risk Matrix & Mitigations

| Risk ID | Risk Description | Likelihood | Impact | Mitigation Strategy | Current Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **RSK-01** | **Poor Image Quality**: Farmers capture blurry, dark, or unfocused photos, preventing diagnostic assessment. | **High** | **Medium** | Client-side image quality analyzer warns farmer in real-time (`GOOD`, `ACCEPTABLE`, `POOR`) and prompts recapture. Backend stores quality tag. | **Mitigated** |
| **RSK-02** | **Incorrect Risk Assessment**: System under-triages an acute condition or over-triages mild symptoms. | **Medium** | **High** | Clear disclaimer that system is non-definitive. Pluggable `RuleBasedRiskEngine` with conservative rules. All high-risk cases escalated to human experts. | **Mitigated** |
| **RSK-03** | **Missing Symptoms**: Farmers omit subtle but vital clinical signs during observation creation. | **High** | **Medium** | Structured symptom selector with standardized severity and duration dropdowns; guided prompts based on species. | **Mitigated** |
| **RSK-04** | **Network Failure**: Absence of cellular connectivity in remote grazing areas prevents cloud communication. | **High** | **High** | Offline-first architecture with IndexedDB persistence, Service Worker caching, and automatic queue synchronization upon network restoration. | **Mitigated** |
| **RSK-05** | **Duplicate Synchronization**: Retried requests over unstable connections generate duplicate records. | **Medium** | **Medium** | Client-generated immutable UUID (`client_observation_id`) coupled with database unique constraints and idempotent endpoint logic. | **Mitigated** |
| **RSK-06** | **Data Loss**: Browser cache cleared or power lost before synchronization completes. | **Low** | **High** | Multi-store IndexedDB persistence (Dexie.js), transaction isolation, and persistent queue state across app restarts. | **Mitigated** |
| **RSK-07** | **Expert Review Delay**: Veterinarians do not review escalated cases in a timely manner. | **Medium** | **High** | Dedicated Expert Dashboard with priority sorting by risk and elapsed time (`first_symptom_at`); automated tracking of time-to-review metrics. | **Mitigated** |
| **RSK-08** | **Low User Adoption**: Complex UI or technical jargon discourages rural smallholder farmers. | **Medium** | **High** | Large touch targets, farmer-friendly terminology ("Why this needs attention"), local language adaptability, and visual iconography. | **Mitigated** |
| **RSK-09** | **Privacy Issues**: Livestock photos contain farmer faces, homes, or embedded EXIF GPS metadata. | **Medium** | **Medium** | Automatic backend EXIF metadata stripping via Pillow before permanent storage; strict tenant isolation with zero farmer PII in dataset exports. | **Mitigated** |
| **RSK-10** | **Model Bias / Systematic Error**: Future ML algorithms underperform on specific breeds or rare pathologies. | **Medium** | **High** | Structured 10-category error analysis tracking (`error_category`); systematic monitoring of system-vs-expert disagreements before retraining. | **Mitigated** |
