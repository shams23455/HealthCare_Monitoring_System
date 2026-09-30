# Livestock Health Observation and Expert Escalation System

A production-ready Progressive Web Application (PWA), REST API, and Machine Learning triage system designed for smallholder livestock farms operating in low-bandwidth, rural, or offline grazing environments.

[![Backend Tests](https://img.shields.io/badge/backend%20tests-52%2F52%20passing-brightgreen.svg)](#7-testing--verification)
[![Frontend Build](https://img.shields.io/badge/frontend%20build-passing-brightgreen.svg)](#7-testing--verification)
[![PWA Ready](https://img.shields.io/badge/PWA-offline--first-blue.svg)](#2-key-features)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100%2B-009688.svg)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18-61DAFB.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.2-3178C6.svg)](https://www.typescriptlang.org/)
[![Docker](https://img.shields.io/badge/Docker-compose--ready-2496ED.svg)](#9-docker--deployment-instructions)

> **Important Clinical & Ethical Notice**:  
> This system is an **observation recording, preliminary risk triage, and expert escalation platform**. It is **NOT** a replacement for licensed veterinary professionals and does **NOT** claim to provide a definitive veterinary disease diagnosis. Automated AI predictions never override certified human expert decisions. All imagery used is project-created or ethically sourced without human personal data or identifiable markers.

---

## 1. Problem Statement
Smallholder livestock farmers face severe economic vulnerability due to delayed disease recognition and lack of veterinary infrastructure in rural areas. When disease signs appear (cattle, sheep, goats, swine, equines), they are often reported late, allowing contagious outbreaks to spread across herds.

This system provides smallholder farmers and veterinarians with:
1. **Offline-First Observation Recording**: Create observations in remote pastures without cellular connectivity using local IndexedDB storage and Service Worker caching.
2. **Standardized Symptom & Vital Tracking**: Record structured symptoms with duration and severity, along with core vitals (temperature, appetite, activity).
3. **Consistent Image Validation & Privacy**: Capture animal photos with automatic resolution check, blur detection, and server-side EXIF GPS stripping.
4. **Pluggable Multi-Modal Risk Triage**: Configurable rule-based, lightweight ML, or hybrid risk assessment with calibrated confidence.
5. **Low-Confidence Safety Gate**: Observations with confidence below 60% automatically default to `REVIEW_REQUIRED`, avoiding false reassurance.
6. **Accelerated Expert Escalation**: Measure and reduce the primary milestone metric: **Time-from-First-Symptom-to-Useful-Review** ($\Delta T$).
7. **Systematic Error Auditing**: Analyze disagreements and failure cases across 11 standardized clinical and technical categories.

---

## 2. Key Features

- **Livestock Herd Registry**: Track animals by unique ear tag, species, breed, sex, growth stage (`Young`, `Adult`, `Elderly`), and paddock location.
- **Offline Progressive Web Application (PWA)**:
  - Instant loading and full offline capability via Service Worker caching.
  - Multi-store IndexedDB persistence (Dexie.js) caching herd profiles, observations, and photo Blobs.
  - Client-generated UUIDs (`client_observation_id`) ensure idempotent synchronization and zero duplicate records.
  - 5-state connectivity indicator (`ONLINE`, `OFFLINE`, `SYNCING`, `SYNC ERROR`, `SYNC COMPLETE`) with manual fallback sync.
- **Ethical Dataset & ML Pipeline**:
  - Leak-free group splitting (70% train / 15% validation / 15% test) grouped strictly by animal ID (`animal_id`).
  - Transparent 64-dimensional visual feature extraction (color moments, texture roughness, erythema inflammation index).
  - Real held-out test evaluation generating `metrics.json`, `confusion_matrix.png`, and `evaluation_report.txt`.
- **Pluggable Model Adapter Architecture**:
  - `RuleBasedRiskModel`: Deterministic, transparent rule baseline.
  - `MLRiskModel`: Lightweight image classifier.
  - `HybridRiskModel`: Multi-modal fusion combining visual signals, structured symptoms, and vitals.
  - Switchable via `MODEL_TYPE=rule_based|ml|hybrid` configuration.
- **Explainable Decision Output**: Farmer-friendly contributing factors, actionable recommendations, confidence scores, and non-diagnostic disclaimers.
- **Veterinary Expert Workspace**:
  - Prioritized queue ordered by urgency and elapsed time since `first_symptom_at`.
  - Side-by-side inspection: symptoms, vitals, high-res photo, AI confidence, and factors.
  - Review decisions: `VALIDATED`, `MODIFIED`, `REQUIRES_MORE_INFORMATION`, `NOT_ACTIONABLE`.
- **Before/After Experimentation Dashboard**:
  - Real-time tracking of Time-to-Useful-Review ($\Delta T$).
  - Empirical data-entry interface for baseline (manual) vs proposed (digital) workflow turnaround times.
- **11-Category Systematic Error Analysis**: Groups modifications and false alarms into structured categories for continuous model refinement.
- **Stakeholder Validation Suite**: Anonymous 1–5 Likert scale usability ratings across 6 operational dimensions.
- **Demonstration Suite**: 8 seeded demo cases covering normal, acute, offline, low-confidence, poor image, and review-completed states.

---

## 3. System Architecture & Tech Stack

```
Farmer (Field PWA)
  │
  ▼
React PWA (React 18 + TypeScript + Vite + Tailwind CSS)
  │
  ▼
Offline Storage (IndexedDB via Dexie.js)
  │
  ▼
Sync Queue (FIFO Queue + Service Worker Sync)
  │
  ▼
FastAPI API (Python 3.11+, Pydantic v2, JWT, Idempotency)
  │
  ▼
PostgreSQL / SQLite (Relational Storage & Schema)
  │
  ▼
Risk Assessment Layer (RuleSafeguards + Low-Confidence Intercept)
  │
  ▼
Image Model (Lightweight Feature Extractor + Scikit-Learn Classifier)
  │
  ▼
Expert Dashboard (Veterinary Prioritized Review Queue)
  │
  ▼
Expert Validation (Decisions: Validated, Modified, More Info)
  │
  ▼
Analytics & Error Analysis (Review Time Analytics & 11 Error Categories)
```

---

## 4. Repository Structure

```
.
├── backend/
│   ├── app/
│   │   ├── api/             # REST endpoints (auth, animals, observations, metrics, expert)
│   │   ├── core/            # Risk engines, model adapters, security, config
│   │   ├── db/              # SQLAlchemy session, init_db, seed_demo_data
│   │   ├── ml/              # Dataset generator, preprocessing, model, train, evaluate
│   │   ├── models/          # ORM models (User, Animal, Observation, Review, Experiment, etc.)
│   │   └── schemas/         # Pydantic v2 validation schemas
│   ├── tests/               # 52 automated pytest tests (100% passing)
│   ├── Dockerfile           # Production container for backend
│   └── requirements.txt     # Python dependencies
├── frontend/
│   ├── src/
│   │   ├── components/      # UI components, risk badges, explanation cards, navbar
│   │   ├── pages/           # Farmer, Expert, Admin, Auth views
│   │   ├── services/        # API client, offline Dexie DB, sync queue
│   │   └── types/           # Strict TypeScript interfaces
│   ├── Dockerfile           # Multi-stage container for frontend
│   └── nginx.conf           # SPA routing & compression configuration
├── data/
│   ├── raw/                 # Project livestock images
│   ├── processed/           # 224x224 normalized images
│   ├── train/               # Held-out training split (70%)
│   ├── validation/          # Validation split (15%)
│   ├── test/                # Held-out test split (15%)
│   └── metadata/            # metadata.csv with anonymized IDs, consent & labels
├── results/
│   ├── metrics.json         # Real empirical model evaluation metrics
│   ├── confusion_matrix.png # Confusion matrix plot
│   └── evaluation_report.txt# Detailed classification report
├── docs/                    # Complete architectural, clinical, and user documentation
├── database/
│   └── schema.sql           # PostgreSQL DDL with indexes and constraints
├── docker-compose.yml       # Production Compose specification (frontend, backend, db)
└── README.md
```

---

## 5. Prerequisites

- **Node.js**: v18.x or v20.x
- **Python**: v3.10+ (tested with Python 3.11 & 3.13)
- **PostgreSQL**: v14+ (optional for local SQLite development, required for production)
- **Docker & Docker Compose** (optional for containerized deployment)

---

## 6. Installation & Setup Instructions

### Step 1: Clone Repository
```bash
git clone https://github.com/shams23455/HealthCare_Monitoring_System.git
cd HealthCare_Monitoring_System
```

### Step 2: Backend Setup
```bash
cd backend
python -m venv .venv

# On Windows PowerShell:
.venv\Scripts\Activate.ps1
# On Linux/macOS:
source .venv/bin/activate

pip install -r requirements.txt
```

### Step 3: Environment Configuration
Copy the sample environment file:
```bash
cp .env.example .env
```
Default configuration values in `backend/.env`:
```env
PROJECT_NAME="Livestock Health Observation API"
ENVIRONMENT="development"
DATABASE_URL="sqlite:///./dev_livestock.db"
SECRET_KEY="livestock_development_secret_key_change_in_production"
MODEL_TYPE="hybrid"
MIN_CONFIDENCE=0.60
BACKEND_CORS_ORIGINS=["http://localhost:5173","http://127.0.0.1:5173","http://localhost:3000"]
```

### Step 4: Dataset Generation & ML Model Training
Run the ethical dataset pipeline and train the baseline classifier:
```bash
# 1. Generate project-created ethical livestock dataset and metadata.csv
python app/ml/dataset_generator.py

# 2. Preprocess images with leak-free animal-level group splitting
python app/ml/preprocessing.py

# 3. Train the baseline visual feature model
python app/ml/train.py

# 4. Evaluate against the held-out test split and generate results/
python app/ml/evaluate.py
```
This produces:
- `data/metadata/metadata.csv`
- `backend/app/ml/baseline_model.joblib`
- `results/metrics.json`
- `results/confusion_matrix.png`
- `results/evaluation_report.txt`

### Step 5: Database Seeding & Demo Data Initialization
```bash
# Seed initial symptoms, baseline users, and 8 demonstration cases
python app/db/seed_demo_data.py
```
**Default Seed Accounts**:
| Role | Email | Password |
| :--- | :--- | :--- |
| **Farmer** | `farmer@example.com` | `farmer123` |
| **Veterinary Expert** | `expert@example.com` | `expert123` |
| **Administrator** | `admin@example.com` | `admin123` |

### Step 6: Start Backend Server
```bash
uvicorn app.main:app --reload --port 8000
```
- Swagger Documentation: `http://localhost:8000/docs`
- Health Endpoint: `http://localhost:8000/api/health`

### Step 7: Frontend Setup & Startup
In a separate terminal:
```bash
cd frontend
npm install
npm run dev
```
- Web Application: `http://localhost:5173`

---

## 7. Testing & Verification

### Run Full Backend Automated Test Suite
```powershell
cd backend
& ".\.venv\Scripts\python.exe" -m pytest -v
```
**Result**: `52 passed in ~30s (100% Pass Rate)`  
Covers:
- Authentication & JWT validation
- Role-based access control (`FARMER`, `EXPERT`, `ADMIN`)
- Animal registration and ownership enforcement
- Multi-step observation wizard & clinical timestamps
- EXIF metadata stripping and privacy filtering
- Pluggable `ImageRiskModel` adapters (`rule_based`, `ml`, `hybrid`)
- Low-confidence safety rule (`MIN_CONFIDENCE=0.60`)
- Offline sync idempotency & duplicate prevention
- 11-category systematic error analysis API
- Before/After experiment metrics & review time analytics
- Stakeholder validation capture & summary calculation

### Run Frontend Production Build
```powershell
cd frontend
npm run build
```
**Result**: `✓ built in ~4s (0 TypeScript errors, 1,500+ modules transformed)`

---

## 8. Offline Demonstration Procedure

To verify offline functionality in your browser:
1. Open Google Chrome / Edge and navigate to `http://localhost:5173`.
2. Login as Farmer (`farmer@example.com` / `farmer123`).
3. Open DevTools (`F12`), switch to the **Network** tab, and toggle **Offline**.
4. Notice the header connectivity indicator switches from green **ONLINE** to amber **OFFLINE**.
5. Click **New Observation**:
   - Select an animal from the cached herd list.
   - Record `first_symptom_at` timestamp.
   - Select symptoms (e.g., *Fever*, *Reduced appetite*).
   - Attach an animal photograph.
6. Click **Submit Observation**:
   - Observation is stored instantly in local IndexedDB.
   - Preliminary on-device risk assessment is displayed.
7. Refresh the page while still offline: the observation record remains preserved in the local queue.
8. In DevTools Network tab, toggle back to **Online**:
   - The sync manager detects the network reconnection.
   - Status updates to **SYNCING** and then **SYNC COMPLETE**.
   - The backend ingests the observation and image idempotently.

---

## 9. Docker / Deployment Instructions

The repository is fully Dockerized for multi-container production deployment using PostgreSQL, FastAPI, and Nginx.

### Start All Services
```bash
docker-compose up -d --build
```

### Services Started:
- **`livestock_postgres`**: PostgreSQL 15 database on port `5432` with automated healthchecks.
- **`livestock_backend`**: FastAPI production application on port `8000`.
- **`livestock_frontend`**: React PWA served via Nginx on port `3000`.

### Verify Running Containers
```bash
docker-compose ps
```

### Stop Services
```bash
docker-compose down
```

---

## 10. Technical Documentation Index

Detailed specifications and clinical rationales are available in the `docs/` folder:
- [docs/architecture.md](docs/architecture.md): Complete layer-by-layer architectural blueprint.
- [docs/ai-ml-architecture.md](docs/ai-ml-architecture.md): ML model details, feature extraction, and adapter patterns.
- [docs/privacy-and-ethics.md](docs/privacy-and-ethics.md): Data privacy, EXIF stripping, and ethical dataset governance.
- [docs/risk_register.md](docs/risk_register.md): 10-category operational and clinical risk register.
- [docs/user-guide.md](docs/user-guide.md): Non-technical farmer guide in clear, accessible language.
- [docs/stakeholder-validation-report.md](docs/stakeholder-validation-report.md): Usability evaluation protocol and reporting template.
- [docs/offline-sync.md](docs/offline-sync.md): Offline storage architecture and synchronization protocol.
- [docs/edge-cases.md](docs/edge-cases.md): 5 reproducible failure and edge-case demonstrations.
- [docs/error-analysis.md](docs/error-analysis.md): 11 systematic error categories and analysis methodology.
- [docs/experiment.md](docs/experiment.md): Before-and-after experimental design and time-to-review analytics.
- [docs/image-capture-protocol.md](docs/image-capture-protocol.md): Guidelines for high-quality on-field photography.