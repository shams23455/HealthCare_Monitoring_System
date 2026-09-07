# Livestock Health Monitoring and Disease Escalation System

A production-ready Progressive Web Application (PWA) and API designed for smallholder livestock farms that cannot afford expensive automated monitoring equipment.

---

## 1. Problem Statement
Small livestock farmers face major economic losses due to delayed disease diagnosis and inconsistent visual health records. When disease symptoms appear in livestock (cattle, goats, sheep, pigs, poultry), they are often reported late to veterinary officers, allowing contagious infections to spread across herds.

This system provides smallholder farmers with an easy-to-use mobile-first interface to register livestock animals, capture consistent health observations and visual records, instantly assess disease risk, and automatically escalate high-risk cases to veterinary experts.

---

## 2. Key Features

- **Livestock Registration & Tagging**: Register animals by ear tag/ID, species, breed, sex, growth stage, and farm location.
- **Structured Health Observation**: Record symptoms (fever, coughing, nasal discharge, diarrhea, skin changes, swelling), temperature, appetite status, and activity level.
- **Rule-Based Disease Risk Engine**: Automatically calculates risk level (`LOW`, `MEDIUM`, `HIGH`, `UNKNOWN`) and generates clear, non-technical explanations.
- **Automatic Expert Escalation**: High-risk observations automatically generate priority case escalations for veterinary review.
- **Veterinary Expert Workspace**: Dedicated dashboard for experts to inspect symptoms, validate rule predictions, and issue treatment advice.
- **Offline PWA Architecture**: Progressive Web App with Service Worker asset caching and IndexedDB offline store skeleton for field use without cellular connection.
- **Role-Based Access Control**: Secure JWT authentication supporting `FARMER`, `EXPERT`, and `ADMIN` roles.

---

## 3. Tech Stack

### Frontend
- **Framework**: React 18 with Vite
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Routing**: React Router DOM v6
- **Offline/PWA**: Service Worker + IndexedDB

### Backend
- **Framework**: Python 3.13 + FastAPI
- **Validation**: Pydantic v2
- **ORM**: SQLAlchemy 2.0
- **Security**: JWT (python-jose) & bcrypt (passlib)

### Database & Storage
- **Database**: PostgreSQL 18
- **Storage**: Supabase Storage / local file path schema for animal images

---

## 4. Project Monorepo Structure

```
livestock-health-monitor/
│
├── frontend/                  # React + TypeScript + Tailwind CSS PWA
│   ├── src/
│   │   ├── components/        # UI, Risk badges, Navigation, Offline status
│   │   ├── pages/             # Auth, Farmer, Expert, Admin pages
│   │   ├── layouts/           # Page layouts
│   │   ├── hooks/             # Custom hooks (useOffline)
│   │   ├── services/          # API client & IndexedDB store
│   │   ├── types/             # TypeScript types
│   │   ├── utils/             # Formatters, constants, symptom lists
│   │   └── App.tsx            # Main application router
│   ├── public/                # PWA manifest.json & sw.js
│   ├── package.json
│   └── vite.config.ts
│
├── backend/                   # FastAPI Backend
│   ├── app/
│   │   ├── api/               # Auth, Animals, Observations, Expert, Escalations, Health
│   │   ├── core/              # Config, Security, Rule-based Risk Engine
│   │   ├── models/            # SQLAlchemy ORM models
│   │   ├── schemas/           # Pydantic schemas
│   │   ├── db/                # Session and DB auto-initializer
│   │   └── main.py            # FastAPI entry point
│   ├── tests/                 # Pytest suite
│   ├── requirements.txt
│   └── .env.example
│
├── database/
│   └── schema.sql             # PostgreSQL DDL script
│
├── docs/
│   └── architecture.md        # Technical architecture documentation
│
├── README.md
└── .gitignore
```

---

## 5. Database Schema & Entities

1. `users`: User authentication, email, hashed password, role (`FARMER`, `EXPERT`, `ADMIN`), phone.
2. `animals`: Livestock records linked to farmer ID, tag number, species, breed, sex, growth stage, location.
3. `observations`: Health records linked to animal ID, recorded symptoms, temperature, appetite, activity, calculated risk level.
4. `images`: Animal photo metadata and upload status.
5. `disease_predictions`: Disease condition predictions, confidence score, source, and explanation.
6. `expert_reviews`: Veterinary expert diagnosis, validation status (`PENDING`, `VALIDATED`, `REJECTED`), comments.
7. `escalations`: High-risk case priority, status (`OPEN`, `IN_REVIEW`, `RESOLVED`), timestamps.
8. `audit_logs`: Traceable system audit history.

---

## 6. Environment Variables

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

---

## 7. Local Setup Instructions

### Prerequisites
- Node.js (v18+)
- Python (v3.10+)
- PostgreSQL (v14+) running on `localhost:5432`

### 1. Database Setup
Ensure PostgreSQL service is running on your machine.
The backend will automatically create the `livestock_db` database and all required tables on first launch, seeding default accounts:
- **Farmer**: `farmer@example.com` / `farmer123`
- **Expert**: `expert@example.com` / `expert123`
- **Admin**: `admin@example.com` / `admin123`

To manually run the DDL schema:
```bash
psql -U postgres -d livestock_db -f database/schema.sql
```

### 2. Backend Execution
```bash
cd backend
python -m venv .venv
# On Windows PowerShell:
.venv\Scripts\Activate.ps1
# On Linux/macOS:
source .venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
- Interactive API Docs: `http://localhost:8000/docs`
- Health Endpoint: `http://localhost:8000/api/health`

### 3. Frontend Execution
```bash
cd frontend
npm install
npm run dev
```
- Open browser at `http://localhost:5173`

---

## 8. API Overview

- `GET /api/health`: Health status check
- `POST /api/auth/register`: Account registration
- `POST /api/auth/login`: OAuth2 password login (JWT)
- `GET /api/auth/me`: Current user profile
- `GET /api/animals`: List animals for current farmer
- `POST /api/animals`: Register new animal
- `GET /api/animals/{id}`: Get animal details
- `GET /api/symptoms`: Active clinical symptoms catalog (Phase 3)
- `GET /api/observations`: List health observations
- `POST /api/observations`: Record structured observation with symptoms, severity, timestamps & vitals
- `GET /api/observations/{id}`: Get observation details with structured symptoms
- `POST /api/observations/{id}/images`: Upload animal photo (validates format/size, strips EXIF)
- `GET /api/observations/{id}/images`: List attached observation photos
- `DELETE /api/observations/{id}/images/{image_id}`: Delete observation photo
- `GET /api/expert/reviews`: Expert pending/completed reviews
- `POST /api/expert/reviews`: Submit expert diagnosis & resolve escalation
- `GET /api/escalations`: List high-priority escalations

---

## 9. Future Roadmap

### Phase 1 & 2: Core Platform, Auth, Livestock & Risk Engine (Completed)
- JWT auth, RBAC, livestock CRUD, Phase 1 rule-based risk evaluation & escalation.

### Phase 3: Health Observation, Consistent Image Capture & Field Data Collection (Completed)
- Structured symptom recording with per-symptom severity and duration.
- Clinical timestamps (`first_symptom_at` & `observed_at`) for time-to-review metrics.
- 5-step mobile wizard, EXIF privacy stripping, and image gallery.

### Phase 4: Offline & Low-Bandwidth Livestock Health Observation (Completed)
- Full IndexedDB offline storage using Dexie (`animals`, `observations`, `observationImages`, `syncQueue`).
- Client-side image compression and blob storage for zero-connectivity field observations.
- Client-generated UUID idempotency (`client_observation_id`) with farmer-scoped duplicate prevention.
- Automatic network recovery sync and manual "Sync Now" / "Retry Failed" controls.
- Preliminary rule-based risk evaluation on-device without misleading farmers.
- 37/37 automated backend tests passing across all suites.
- Complete documentation in [docs/offline_mode.md](docs/offline_mode.md).

### Phase 5: Deep Learning & Assisted Disease Recognition (Upcoming)
- Computer vision assistive model integration for animal lesion & posture classification.
- Multimodal veterinary risk scoring.
#   H e a l t h C a r e _ M o n i t o r i n g _ S y s t e m  
 