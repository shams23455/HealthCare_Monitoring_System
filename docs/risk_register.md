# Project Risk Register

## Livestock Health Observation and Expert Escalation System

### 1. Overview
This register identifies, assesses, and tracks the mitigation strategies for operational, clinical, technical, and privacy risks associated with the Livestock Health Observation and Expert Escalation System. In accordance with safety-first clinical principles, automated risk triage never replaces certified veterinary authority and cannot override human expert determinations.

---

### 2. Risk Matrix & Mitigations (10 Key Categories)

| # | Risk | Likelihood | Impact | Mitigation | Current Status |
| :-: | :--- | :---: | :---: | :--- | :--- |
| **1** | **Incorrect system prediction** | Medium | High | • Pluggable hybrid architecture combining conservative clinical rule logic with image features.<br>• Prominent non-diagnostic disclaimer: "Preliminary risk assessment. Not a veterinary medical diagnosis."<br>• Acute symptoms (fever $\ge 40.5^\circ\text{C}$, severe dyspnea, acute lethargy) automatically trigger HIGH risk escalation regardless of image classifier predictions.<br>• System never overrides a human veterinarian's decision. | **Mitigated** |
| **2** | **Dataset bias** | Medium | Medium | • Group splitting by animal ID (`animal_id`) strictly isolates animals across train, validation, and test sets to eliminate data leakage.<br>• Stratified representation across cattle, sheep, goats, swine, and equines.<br>• Clear documentation in `metadata.csv` and evaluation reports highlighting project scope and baseline sample size limitations.<br>• Pre-deployment validation against regional breed distributions. | **Mitigated** |
| **3** | **Poor image quality** | High | Medium | • Real-time client-side image analyzer inspects resolution, blur variance, and exposure; tags photos as `GOOD`, `ACCEPTABLE`, or `POOR`.<br>• Displays farmer warning banner prompting photo recapture in optimal daylight before submission.<br>• Backend downgrades confidence and appends explanatory alert if poor quality photos are submitted. | **Mitigated** |
| **4** | **Low confidence** | Medium | High | • **Hard safety gate**: If composite system confidence falls below `MIN_CONFIDENCE` (default 0.60), risk level is automatically forced to `REVIEW_REQUIRED`.<br>• Clear farmer explanation: "Expert review recommended because system confidence is low."<br>• Prevents false reassurance or inappropriate triage under high ambiguity. | **Mitigated** |
| **5** | **Missing symptom information** | High | Medium | • Mobile-first UI uses structured mandatory selectors for core vital signs (appetite status, activity level, temperature when available).<br>• Standardized symptom chips organized by anatomical system.<br>• Incomplete vital entries default to conservative risk baselines and prompt follow-up during expert review. | **Mitigated** |
| **6** | **Network failure** | High | High | • Offline-first client architecture built with Dexie.js (IndexedDB) and Service Worker caching.<br>• Observation records, compressed image blobs, and mutations persist completely in local browser storage during disconnections.<br>• Real-time 5-state connectivity indicator (`ONLINE`, `OFFLINE`, `SYNCING`, `SYNC ERROR`, `SYNC COMPLETE`) keeps farmers informed. | **Mitigated** |
| **7** | **Data synchronization failure** | Medium | High | • Persistent FIFO sync queue (`syncQueue` in IndexedDB) with exponential backoff and retry counter.<br>• Background Sync API triggers automatic transfer upon reconnection, with a manual "Sync Now" button as an immediate fallback.<br>• Network timeouts and partial payload transfers roll back transaction state cleanly without corrupting local data. | **Mitigated** |
| **8** | **Duplicate records** | Medium | Medium | • Client-generated immutable UUID (`client_observation_id`) assigned at creation time.<br>• Database unique constraint on `(recorded_by, client_observation_id)`.<br>• Backend idempotency checks identify retried sync requests, return existing resource with HTTP 200, and prevent duplicate triage tickets or notifications. | **Mitigated** |
| **9** | **Expert review delay** | Medium | High | • Dedicated Veterinary Expert Dashboard sorts triage queue by urgency and elapsed time since `first_symptom_at`.<br>• Automatic escalation tickets created for all HIGH and REVIEW_REQUIRED cases.<br>• Analytics engine monitors primary milestone metric: Time-to-Useful-Review ($\Delta T$). | **Mitigated** |
| **10** | **Privacy/data issues** | Low | High | • Zero human faces or personal identifiers stored; ethical non-identifiable livestock imagery only.<br>• Backend image ingestion pipeline automatically strips EXIF GPS and camera metadata before saving to disk.<br>• Password hashing via bcrypt, JWT bearer token expiration, and strict role-based access control (`FARMER`, `EXPERT`, `ADMIN`).<br>• Full privacy review documented in `docs/privacy-and-ethics.md`. | **Mitigated** |

---

### 3. Monitoring & Review Schedule
- **Automated Verification**: End-to-end integration tests (`test_model_adapter.py`, `test_experiment_metrics.py`, `test_stage_enhancements.py`) run in CI to verify safety thresholds and deduplication.
- **Continuous Error Auditing**: Systematic error analysis dashboard groups every expert disagreement or review modification into 11 standardized categories to identify recurring failures.
