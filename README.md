# Livestock Health Monitoring and Disease Escalation System

A production-ready Progressive Web Application (PWA) and API designed for smallholder livestock farms that cannot afford expensive automated monitoring equipment.

[![Backend Tests](https://img.shields.io/badge/backend%20tests-37%2F37%20passing-brightgreen.svg)](#7-testing--verification)
[![Frontend Build](https://img.shields.io/badge/frontend%20build-passing-brightgreen.svg)](#7-testing--verification)
[![PWA Ready](https://img.shields.io/badge/PWA-offline--first-blue.svg)](#2-key-features)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100%2B-009688.svg)](https://fastapi.tiangolo.com/)
[![React](https://img.shields.io/badge/React-18-61DAFB.svg)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.2-3178C6.svg)](https://www.typescriptlang.org/)

---

## 1. Problem Statement
Small livestock farmers face severe economic losses due to delayed disease recognition and lack of consistent visual health records. When disease symptoms appear in livestock herds (cattle, goats, sheep, buffalo, swine), they are frequently reported late to veterinary officers, allowing contagious infections to spread across herds.

This system provides smallholder farmers with an easy-to-use, mobile-first interface to:
1. Register livestock animals and maintain life-cycle health records.
2. Record structured health observations with symptoms, severity, and duration.
3. Capture consistent animal photographs with automatic client-side compression and EXIF privacy stripping.
4. Calculate instant rule-based disease risk assessments (`LOW`, `MEDIUM`, `HIGH`, `UNKNOWN`).
5. Automatically escalate suspicious and high-risk cases to veterinary experts.
6. Work reliably in offline or low-bandwidth environments with automatic background synchronization and duplicate prevention.

---

## 2. Key Features

- **Livestock Registration & Tagging**: Register animals by ear tag/ID, species, breed, sex, growth stage, and farm location.
- **Structured Health Observations**: Record clinical symptoms from an active catalog with per-symptom severity (`Mild`, `Moderate`, `Severe`) and duration (`Less than 1 day` to `More than 7 days`).
- **Accurate Clinical Timestamps**: Track when symptoms were first noticed (`first_symptom_at`) versus checkup time (`observed_at`) to calculate elapsed duration to intervention.
- **Animal Photography Pipeline**: Format and size validation (JPEG, PNG, WEBP &le; 5 MB), EXIF metadata stripping for farmer privacy, and dimension extraction.
- **Rule-Based Disease Risk Engine**: Instant, transparent risk evaluation generating non-technical explanations and isolation advice.
- **Automatic Expert Escalation**: High-risk cases automatically generate high-priority escalations and route into the veterinary review queue.
- **Veterinary Expert Workspace**: Dedicated dashboard for veterinarians to inspect clinical symptoms and photographs, validate rule findings, and provide professional diagnoses.
- **Offline & Low-Bandwidth Mode (Phase 4)**:
  - Application shell loads completely offline via Service Worker caching.
  - Local database using Dexie.js (IndexedDB) caches animal profiles, observations, and photo blobs.
  - Client-generated UUIDs (`client_observation_id`) ensure idempotent synchronization and zero duplicate records.
  - Automatic background synchronization upon network reconnection with exponential backoff retry.
  - Preliminary on-device rule evaluation without misleading farmers before server validation.
- **Role-Based Access Control**: Strict multi-tenant data isolation and JWT authentication for `FARMER`, `EXPERT`, and `ADMIN` roles.

---

## 3. Tech Stack

### Frontend
- **Framework**: React 18 with Vite
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Routing**: React Router DOM v6
- **Offline Storage**: Dexie.js (IndexedDB)
- **PWA**: Service Worker (`sw.js`) + Web App Manifest (`manifest.json`)

### Backend
- **Framework**: Python 3.13 + FastAPI
- **Validation**: Pydantic v2
- **ORM**: SQLAlchemy 2.0
- **Image Processing**: Pillow (PIL)
- **Security**: JWT (`python-jose`) & password hashing (`passlib` + `bcrypt`)
- **Testing**: Pytest with in-memory SQLite isolation

### Database & Storage
- **Database**: PostgreSQL 14+ (Production) / SQLite (Testing)
- **Storage**: Local filesystem storage with static serving (`/uploads/observations/`) with Supabase Storage readiness

---

## 4. Project Monorepo Structure

```
HealthCare_Monitoring_System/
│
├── frontend/                        # React + TypeScript + Tailwind CSS PWA
│   ├── src/
│   │   ├── components/              # UI, Risk badges, Navigation, OfflineBanner
│   │   ├── pages/
│   │   │   ├── auth/                # LoginPage, RegisterPage
│   │   │   ├── farmer/              # Dashboard, AnimalsList, ObservationWizard, Detail
│   │   │   ├── expert/              # ExpertDashboard, ReviewListPage, ReviewDetail
│   │   │   └── admin/               # AdminDashboard, UserManagementPage
│   │   ├── hooks/                   # useNetworkStatus, useOffline
│   │   ├── services/
│   │   │   ├── api.ts               # REST API client with JWT interceptor
│   │   │   └── offline/             # Dexie DB, syncService, queue, imageCompressor
│   │   ├── types/                   # TypeScript interfaces
│   │   ├── utils/                   # Formatters, constants, symptom catalogs
│   │   ├── App.tsx                  # Main router with protected routes
│   │   └── main.tsx                 # PWA Service worker bootstrap
│   ├── public/                      # PWA manifest.json, sw.js, favicon.svg
│   ├── package.json
│   └── vite.config.ts
│
├── backend/                         # FastAPI Python Backend
│   ├── app/
│   │   ├── api/                     # Auth, Animals, Observations, Symptoms, Expert, Admin
│   │   ├── core/                    # Config, Security, Rule Risk Engine, Audit Trail
│   │   ├── models/                  # SQLAlchemy ORM models (User, Animal, Observation, etc.)
│   │   ├── schemas/                 # Pydantic validation schemas
│   │   ├── services/                # ImageStorageService (format, EXIF stripping)
│   │   ├── db/                      # Session, engine, and init_db seeder
│   │   └── main.py                  # FastAPI application entry point
│   ├── tests/                       # Automated pytest test suites (37 tests)
│   │   ├── conftest.py              # Test database fixtures and FastAPI client
│   │   ├── test_api_integration.py # Full user flow integration test
│   │   ├── test_health.py           # Health endpoint test
│   │   ├── test_phase2.py           # Auth, RBAC, and Animal CRUD tests (12 tests)
│   │   ├── test_phase3.py           # Observation, timestamps, symptoms & photo tests (13 tests)
│   │   ├── test_phase4.py           # Offline sync, idempotency, duplicate prevention (8 tests)
│   │   └── test_risk.py             # Rule-based risk engine unit tests (2 tests)
│   ├── requirements.txt             # Python dependencies
│   └── .env.example                 # Sample environment variables
│
├── database/
│   └── schema.sql                   # Complete PostgreSQL DDL schema with indexes
│
├── docs/
│   ├── architecture.md              # Technical architecture and component interactions
│   ├── observation_workflow.md      # 5-step health observation wizard specification
│   └── offline_mode.md              # Detailed offline architecture, Dexie design & sync queue
│
├── README.md                        # Master project documentation
└── .gitignore                       # Ignored build artifacts, virtual environments & secrets
```

---

## 5. Database Schema & Entities

1. `users`: User accounts, emails, hashed passwords, roles (`FARMER`, `EXPERT`, `ADMIN`), contact phone numbers.
2. `animals`: Livestock records linked to farmer ID, tag number, species, breed, sex, growth stage, farm location, and active status.
3. `symptoms`: Standard clinical symptom catalog seeded with 11 primary livestock signs.
4. `observations`: Health records linked to animal ID, recorded symptoms, timestamps (`first_symptom_at`, `observed_at`), temperature, appetite, activity, calculated risk level, and `client_observation_id`.
5. `observation_symptoms`: Many-to-many junction linking observations to symptoms with individual severity and duration.
6. `images`: Animal photograph metadata, original filename, dimensions (width/height), storage paths, and upload status.
7. `disease_predictions`: Rule-based condition predictions, confidence score, source, and explanation.
8. `expert_reviews`: Veterinary expert diagnosis, validation status (`PENDING`, `VALIDATED`, `REJECTED`), and clinical notes.
9. `escalations`: High-risk case priority (`HIGH`, `CRITICAL`), status (`OPEN`, `IN_REVIEW`, `RESOLVED`), and timestamps.
10. `audit_logs`: Immutable audit trail for security and traceability.

---

## 6. Local Setup Instructions

### Prerequisites
- Node.js (v18+)
- Python (v3.10+)
- PostgreSQL (v14+) running on `localhost:5432` (or SQLite fallback)

### 1. Backend Setup
```bash
cd backend
python -m venv .venv

# On Windows PowerShell:
.venv\Scripts\Activate.ps1
# On Linux/macOS:
source .venv/bin/activate

pip install -r requirements.txt
```

Create `backend/.env`:
```env
PROJECT_NAME="Livestock Health Monitoring API"
ENVIRONMENT="development"
API_V1_STR="/api"

DATABASE_URL="postgresql://postgres:postgres@localhost:5432/livestock_db"
SECRET_KEY="super-secret-key-change-this-in-production-livestock-health"
ALGORITHM="HS256"
ACCESS_TOKEN_EXPIRE_MINUTES=1440

BACKEND_CORS_ORIGINS=["http://localhost:5173","http://127.0.0.1:5173","http://localhost:3000"]
```

Run the backend server:
```bash
uvicorn app.main:app --reload --port 8000
```
- Interactive API Swagger Docs: `http://localhost:8000/docs`
- Health Endpoint: `http://localhost:8000/api/health`

Default Seed Accounts:
- **Farmer**: `farmer@example.com` / `farmer123`
- **Expert**: `expert@example.com` / `expert123`
- **Admin**: `admin@example.com` / `admin123`

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
- Access application: `http://localhost:5173`

---

## 7. Testing & Verification

### Run Backend Automated Tests
The repository includes 37 automated tests verifying end-to-end functionality across all phases:
```powershell
cd backend
& ".\.venv\Scripts\python.exe" -m pytest tests/ -v
```
**Output**: `37 passed in ~20s (100% Pass Rate)`

### Run Frontend Production Build
```powershell
cd frontend
npm run build
```
**Output**: `✓ built in ~4s (0 TypeScript errors, 0 build failures)`

---

## 8. API Endpoints Overview

| Method | Endpoint | Access | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Public | System and database health status |
| `POST` | `/api/auth/register` | Public | Farmer account registration (rejects ADMIN/EXPERT) |
| `POST` | `/api/auth/login` | Public | OAuth2 password login, returns JWT access token |
| `GET` | `/api/auth/me` | Authenticated | Current authenticated user profile |
| `PUT` | `/api/auth/profile` | Authenticated | Update user name and phone |
| `GET` | `/api/animals` | Farmer/Admin | List livestock owned by the authenticated farmer |
| `POST` | `/api/animals` | Farmer/Admin | Register a new livestock animal |
| `GET` | `/api/animals/{id}` | Farmer/Admin | Get animal details (enforces farmer ownership) |
| `PUT` | `/api/animals/{id}` | Farmer/Admin | Update animal details |
| `PATCH`| `/api/animals/{id}/deactivate` | Farmer/Admin | Soft deactivate animal while preserving history |
| `GET` | `/api/symptoms` | Authenticated | List active clinical symptoms catalog |
| `GET` | `/api/observations` | Farmer/Admin | List health observations for the current farmer |
| `POST` | `/api/observations` | Farmer/Admin | Create observation with idempotency token (`client_observation_id`) |
| `GET` | `/api/observations/{id}` | Farmer/Admin | Get detailed observation with symptoms, vitals & photos |
| `POST` | `/api/observations/{id}/images` | Farmer/Admin | Upload animal photo (format check, EXIF metadata stripping) |
| `GET` | `/api/observations/{id}/images` | Farmer/Admin | List photos attached to an observation |
| `DELETE`| `/api/observations/{id}/images/{img_id}` | Farmer/Admin | Delete observation photo |
| `GET` | `/api/expert/reviews` | Expert/Admin | List pending or completed veterinary expert reviews |
| `POST` | `/api/expert/reviews` | Expert/Admin | Submit expert diagnosis and resolve case escalation |
| `GET` | `/api/escalations` | Expert/Admin | List high-priority disease escalations |
| `GET` | `/api/admin/users` | Admin | List all registered users (Admin only) |

---

## 9. Technical Documentation Links

- [docs/architecture.md](docs/architecture.md): Full system architecture, component breakdown, and data isolation policies.
- [docs/observation_workflow.md](docs/observation_workflow.md): Detailed 5-step health observation wizard specification and clinical timestamps.
- [docs/offline_mode.md](docs/offline_mode.md): Complete offline mode architecture, Dexie.js IndexedDB schema, sync queue, and manual testing procedures.

---

## 10. Project Roadmap & Status

- **Phase 1: Foundation & Core Architecture** &rarr; **COMPLETE**
- **Phase 2: Authentication, Role Access & Livestock Management** &rarr; **COMPLETE**
- **Phase 3: Health Observation, Consistent Image Capture & Field Data Collection** &rarr; **COMPLETE**
- **Phase 4: Offline & Low-Bandwidth Livestock Health Observation** &rarr; **COMPLETE**
- **Phase 5: Deep Learning & Assisted Disease Recognition** &rarr; *Upcoming*