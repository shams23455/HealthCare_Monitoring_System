# System Architecture Overview

## Livestock Health Observation and Expert Escalation System

### 1. Architectural Philosophy
The system is built specifically for small livestock farms operating in low-bandwidth or offline rural environments. It combines a mobile-first Progressive Web Application (PWA) with an offline-first IndexedDB persistence engine on the client side, connected to a robust FastAPI + PostgreSQL backend.

The system is strictly designed as an **observation recording, preliminary risk triaging, and expert escalation tool**. It is **NOT** a replacement for a licensed veterinarian and does **NOT** provide a definitive medical disease diagnosis.

---

### 2. End-to-End System Pipeline

```
  +-----------------------------------------------------------------------+
  |                          FARMER ON-FIELD PWA                          |
  |                                                                       |
  |  [Farmer Observes Animal]                                             |
  |             |                                                         |
  |             v                                                         |
  |  [Select Animal & Record first_symptom_at]                            |
  |             |                                                         |
  |             v                                                         |
  |  [Capture Photo + Quality Check (GOOD / ACCEPTABLE / POOR)]           |
  |             |                                                         |
  |             v                                                         |
  |  [Select Structured Symptoms & Record Appetite/Activity]              |
  |             |                                                         |
  |             v                                                         |
  |  [IndexedDB Persistence: observations, images, syncQueue]             |
  |  (Tag with client_observation_id UUID)                                |
  |             |                                                         |
  |             v                                                         |
  |  [Sync Manager: Service Worker Sync / Fallback Online Sync]           |
  +-------------|---------------------------------------------------------+
                |
                | HTTPS / REST (Idempotent Sync Queue + JWT)
                v
  +-----------------------------------------------------------------------+
  |                         FASTAPI BACKEND SERVICE                       |
  |                                                                       |
  |  [POST /api/observations (Idempotency deduplication check)]           |
  |             |                                                         |
  |             v                                                         |
  |  [Pluggable RiskAssessmentEngine]                                     |
  |  (RuleBasedRiskEngine: transparent rule evaluation + explainability)  |
  |             |                                                         |
  |             v                                                         |
  |  [PostgreSQL Relational Storage & Automatic Escalation]               |
  |  (Stores system_confidence, factors, submitted_at, escalations)       |
  +-------------|---------------------------------------------------------+
                |
                | WebSocket / REST API
                v
  +-----------------------------------------------------------------------+
  |                     EXPERT VALIDATION DASHBOARD                       |
  |                                                                       |
  |  [Veterinary Expert Views Pending Observation Queue]                  |
  |             |                                                         |
  |             v                                                         |
  |  [POST /api/observations/{id}/start-review]                           |
  |  (Captures expert_review_started_at timestamp)                        |
  |             |                                                         |
  |             v                                                         |
  |  [Expert Decision Recorded:]                                          |
  |  - VALIDATED                                                          |
  |  - MODIFIED (preserves original system_risk_level for metrics)        |
  |  - REQUIRES_MORE_INFORMATION                                          |
  |  - NOT_ACTIONABLE                                                     |
  |  (Captures expert_review_completed_at timestamp)                      |
  +-------------|---------------------------------------------------------+
                |
                v
  +-----------------------------------------------------------------------+
  |                 METRICS ENGINE & ERROR ANALYSIS                       |
  |                                                                       |
  |  - Primary Metric: Time from first symptom to useful review           |
  |    (expert_review_completed_at - first_symptom_at)                    |
  |  - Disagreement & Systematic Error Analysis (10 Categories)           |
  |  - Anonymized Ethically Sourced Image Dataset Export                  |
  +-----------------------------------------------------------------------+
```

---

### 3. Key Components

#### A. Frontend PWA Architecture
- **React 18 + Vite + TypeScript**: Modular components, strict typing, responsive design for field devices.
- **IndexedDB via Dexie.js (`LivestockHealthOfflineDB_v2`)**: Local database stores:
  - `observations`: Full observation records with `client_observation_id` and sync statuses (`PENDING`, `SYNCING`, `SYNCED`, `FAILED`, `RETRYING`).
  - `observationImages`: Compressed image blobs with local metadata.
  - `syncQueue`: FIFO queue of mutation tasks with retry counters and backoff intervals.
  - `sync_metadata` / `appMetadata`: Persistent sync cursors, cache timestamps, and configuration flags.
- **Service Worker (`public/sw.js`)**: App shell caching and background sync registration (`livestock-sync-queue`).
- **Graceful Fallback**: Automatic network reconnection event listeners + manual "Sync Now" button when Background Sync API is unsupported.
- **Farmer-Centric UI**: Clear language ("Preliminary risk assessment", "Why this needs attention"), live image quality assessment badges, and 5-state connectivity indicator (`ONLINE`, `OFFLINE`, `SYNCING`, `SYNC ERROR`, `SYNC COMPLETE`).

#### B. Backend API (FastAPI)
- **FastAPI Core**: Asynchronous REST API with Pydantic v2 schemas and validation.
- **Security & Authorization**: Bcrypt password hashing, JWT Bearer tokens, strict Role-Based Access Control (`FARMER`, `EXPERT`, `ADMIN`).
- **Pluggable Risk Assessment Engine (`app.core.risk`)**:
  - `RiskAssessmentEngine`: Abstract base class defining `assess(input) -> RiskAssessmentResult`.
  - `RuleBasedRiskEngine`: Transparent baseline evaluating vital signs, clinical symptoms, and duration.
  - `MLModelRiskEngine`: Adapter for future trained inference models.
  - `HybridRiskEngine`: Composite engine combining rule safeguards with ML scoring.
- **Idempotent Sync Pipeline**: Scoped unique constraint on `(recorded_by, client_observation_id)` ensuring replay safety during offline retries.
- **Image Privacy & Quality Pipeline**: Automated EXIF geolocation and camera metadata stripping via Pillow, followed by resolution, contrast variance, and file size checks.

#### C. Database Architecture (PostgreSQL / SQLite in Dev)
- **Observations Table**: Tracks clinical timestamps (`first_symptom_at`, `observed_at`, `submitted_at`, `expert_review_started_at`, `expert_review_completed_at`), system confidence, and explanation factors.
- **Expert Reviews Table**: Stores original `system_risk_level`, `system_confidence`, `expert_decision`, `modified_risk_level`, `expert_notes`, and `error_category`.
- **Images Table**: Stores anonymized file references, dimensions, `image_quality` (`GOOD`, `ACCEPTABLE`, `POOR`), and quality warnings.
- **Escalations & Audit Logs**: Full forensic trail of state changes and role actions.

---

### 4. Primary Milestone Metric: Time-to-Useful-Review
The primary clinical milestone is reducing:
$$\Delta T = \text{expert\_review\_completed\_at} - \text{first\_symptom\_at}$$
By capturing `first_symptom_at` at the moment of observation rather than relying solely on server ingestion time, the system accurately measures true disease progression to veterinary intervention.
