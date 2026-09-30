# System Architecture Overview

## Livestock Health Observation and Expert Escalation System

### 1. Architectural Philosophy & Safety-First Principle
The system is designed for livestock health monitoring in rural, low-bandwidth, and offline pastoral settings. It operates as an **observation recording, preliminary risk triage, and expert escalation platform**.

> **Safety Notice**: This system is **NOT** a replacement for licensed veterinary practitioners and does **NOT** provide a definitive veterinary medical diagnosis. Automated triage outputs are preliminary risk assessments designed to accelerate human expert review. AI predictions never override certified human expert decisions.

---

### 2. End-to-End System Pipeline

```
Farmer
  │
  ▼
React PWA (Frontend Layer)
  │
  ▼
Offline Storage (Offline Layer: IndexedDB)
  │
  ▼
Sync Queue (Sync Layer: FIFO Queue & Service Worker)
  │
  ▼
FastAPI API (Backend Layer: REST / JWT / Idempotency)
  │
  ▼
PostgreSQL (Database Layer: Relational Schema & State)
  │
  ▼
Risk Assessment Layer (Core Triage & Safety Thresholds)
  │
  ▼
Image Model (AI/ML Layer: Feature Extractor & Calibrated Classifier)
  │
  ▼
Expert Dashboard (Expert Layer: Priority Queue & Detail View)
  │
  ▼
Expert Validation (Expert Layer: Validated, Modified, More Info)
  │
  ▼
Analytics (Analytics Layer: Time-to-Useful-Review & Before/After)
  │
  ▼
Error Analysis (Analytics Layer: 11 Systematic Error Categories)
```

---

### 3. Detailed Architectural Layers

#### Layer 1: Frontend Layer (Farmer PWA)
- **Technology**: React 18, Vite, TypeScript, Tailwind CSS, Lucide icons.
- **Role**:
  - Intuitive, low-friction field interface optimized for mobile and low-literacy usage.
  - Guided observation workflow: animal selection, recording `first_symptom_at`, standardized symptom chips, vital signs (appetite, activity, temperature).
  - Client-side image pre-validation (resolution, blur, lighting) and EXIF privacy filtering.
  - Transparent explainability display: risk level badge, calibrated confidence score, contributing factors, non-diagnostic disclaimer, and actionable recommendation.
  - 5-state network connectivity indicator (`ONLINE`, `OFFLINE`, `SYNCING`, `SYNC ERROR`, `SYNC COMPLETE`).

#### Layer 2: Offline Layer (Local Storage)
- **Technology**: IndexedDB via Dexie.js (`LivestockHealthOfflineDB_v2`).
- **Data Stores**:
  - `observations`: Full observation records with client UUIDs (`client_observation_id`) and sync flags (`PENDING`, `SYNCING`, `SYNCED`, `FAILED`, `RETRYING`).
  - `observationImages`: Compressed image binary Blobs alongside local metadata.
  - `animals`: Cached local herd registry for instant offline tagging.
  - `symptoms`: Cached active symptom taxonomy.
  - `sync_metadata` & `appMetadata`: Persistent sync cursors, cache timestamps, and device settings.

#### Layer 3: Sync Queue Layer
- **Technology**: Persistent FIFO Queue (`syncQueue` in IndexedDB) + Service Worker Background Sync (`livestock-sync-queue`).
- **Features**:
  - Automatic synchronization triggered upon network reconnection events (`window.addEventListener('online')`).
  - Manual "Sync Now" trigger with visual spinner and status feedback for environments without Background Sync API support.
  - Exponential backoff retry logic for transient server failures.
  - Transaction isolation ensuring records are only marked `SYNCED` upon verified HTTP 200/201 backend receipt.

#### Layer 4: Backend Layer (API Gateway & Services)
- **Technology**: Python 3.11+, FastAPI, Pydantic v2, SQLAlchemy ORM, Uvicorn.
- **Responsibilities**:
  - RESTful endpoints with strict JWT Bearer authentication and Role-Based Access Control (`FARMER`, `EXPERT`, `ADMIN`).
  - Idempotent observation ingestion: client UUID (`client_observation_id`) combined with `recorded_by` prevents duplicate records during network retries.
  - Server-side image sanitization: automated stripping of EXIF GPS coordinates and camera metadata via Pillow before permanent storage.
  - Image quality classification (`GOOD`, `ACCEPTABLE`, `POOR`) based on resolution, Laplacian variance, and file size checks.

#### Layer 5: Database Layer (Relational Storage)
- **Technology**: PostgreSQL 15+ (Production) / SQLite (Dev & Testing).
- **Relational Schema**:
  - `users`: Credentials (bcrypt), role, active status.
  - `animals`: Herd registry (species, tag, sex, age stage, location).
  - `observations`: Observations with clinical timestamps (`first_symptom_at`, `observed_at`, `submitted_at`, `expert_review_started_at`, `expert_review_completed_at`), system risk triage, confidence score, and explanation factors.
  - `images`: Image file references, dimensions, file size, quality tags, and privacy flags.
  - `expert_reviews`: Human veterinary decisions (`VALIDATED`, `MODIFIED`, `REQUIRES_MORE_INFORMATION`, `NOT_ACTIONABLE`), modified risk levels, expert notes, and `comparison_category`.
  - `escalations`: Escalation tickets with priority status and assignment metadata.
  - `experiment_measurements`: Empirical before-and-after baseline vs proposed review times.
  - `stakeholder_feedbacks`: 1–5 Likert scale usability ratings across six operational dimensions.
  - `audit_logs`: Immutable security and clinical audit trail.

#### Layer 6: AI/ML Layer (Pluggable Model Architecture)
- **Technology**: Scikit-Learn, NumPy, Pillow, SciPy.
- **Model Adapter Interface (`ImageRiskModel`)**:
  - `RuleBasedRiskModel`: Deterministic, transparent clinical baseline evaluating vitals and duration.
  - `MLRiskModel`: Lightweight image classifier extracting 64-dim visual features (spatial color moments, erythema index, texture roughness, lesion variance) and regularized logistic classification head with calibrated Platt-scaled confidence.
  - `HybridRiskModel`: Composite triage model fusing visual probabilities with structured symptoms and animal age stages.
- **Configuration Switch**: `MODEL_TYPE=rule_based|ml|hybrid` selected via environment variable.
- **Safety Gates**:
  - **Low-Confidence Intercept**: If composite confidence < `MIN_CONFIDENCE` (default 0.60), risk level is automatically forced to `REVIEW_REQUIRED`.
  - **Acute Symptom Override**: Critical signs (high fever, severe respiratory distress) trigger immediate HIGH risk escalation regardless of image classifier predictions.

#### Layer 7: Expert Layer (Veterinary Validation)
- **Technology**: Expert Review Dashboard & Triage Workbench.
- **Capabilities**:
  - Prioritized queue ordered by risk level and elapsed duration since `first_symptom_at`.
  - Side-by-side inspection: farmer symptoms, high-resolution photo, system factors, and confidence.
  - Timestamped review actions: `start-review` (locks ticket and records start time) and `submit-review` (records completion time).
  - Decisions: `VALIDATED`, `MODIFIED`, `REQUIRES_MORE_INFORMATION`, `NOT_ACTIONABLE`.
  - AI prediction preservation: System risk and confidence are never overwritten when an expert modifies a case.

#### Layer 8: Analytics & Error Analysis Layer
- **Technology**: Real-time aggregation engines & visualization dashboards.
- **Key Metrics**:
  - **Primary Project Metric**: Time-from-First-Symptom-to-Useful-Review:
    $$\Delta T = \text{expert\_review\_completed\_at} - \text{first\_symptom\_at}$$
  - **Empirical Before/After Comparison**: Mean, median, minimum, and maximum turnaround times comparing manual workflows to digital triage.
  - **11-Category Systematic Error Analysis**:
    1. Poor image quality
    2. Missing symptoms
    3. Incorrect symptom information
    4. Animal stage missing
    5. Location missing
    6. Low confidence
    7. Risk over-estimation
    8. Risk under-estimation
    9. Model/expert disagreement
    10. Network/sync failure
    11. Other
  - **Stakeholder Usability Engine**: Tracks empirical Likert scores across Ease of Observation, Image Capture, Explanation Clarity, Expert Review, Offline Utility, and Overall Usability.
