# System Architecture Overview

## Livestock Health Monitoring and Disease Escalation System

### 1. Architectural Philosophy
The system is built specifically for small livestock farms operating in low-bandwidth or offline rural environments. It combines a mobile-first Progressive Web Application (PWA) on the client side with a robust FastAPI + PostgreSQL backend.

---

### 2. High-Level System Architecture

```
+-----------------------------------------------------------------------+
|                           FARMER / EXPERT CLIENT                      |
|                                                                       |
|   +---------------------------------------------------------------+   |
|   |                      React + Vite + Tailwind                  |   |
|   +---------------------------------------------------------------+   |
|   | Service Worker (Offline Cache)  | IndexedDB Store (Sync Queue)|   |
|   +---------------------------------------------------------------+   |
+-----------------------------------||----------------------------------+
                                    || HTTP / REST (JWT Auth)
+-----------------------------------\/----------------------------------+
|                            BACKEND API SERVICE                        |
|                                                                       |
|   +---------------------------------------------------------------+   |
|   |                        FastAPI Server                         |   |
|   +---------------------------------------------------------------+   |
|   |  JWT Authentication  |  RBAC Middleware  | Rule-Based Risk    |   |
|   |  & Pydantic Schemas  |                   | Engine (Extensible)|   |
|   +---------------------------------------------------------------+   |
+-----------------------------------||----------------------------------+
                                    || SQLAlchemy ORM
+-----------------------------------\/----------------------------------+
|                            DATABASE LAYER                             |
|                                                                       |
|   +---------------------------------------------------------------+   |
|   |                  PostgreSQL 18 Database                       |   |
|   |  Users | Animals | Observations | Escalations | Audit Logs    |   |
|   +---------------------------------------------------------------+   |
+-----------------------------------------------------------------------+
```

---

### 3. Key Components

#### A. Frontend PWA Architecture
- **React + Vite + TypeScript**: Provides fast rendering, strong type safety, and clean UI components.
- **Offline First Foundation**: Uses a custom Service Worker to cache static assets and an `IndexedDB` key-value store to queue observations captured in areas without cellular coverage.
- **Farmer-Centric UI**: Designed with simple terminology ("Animals monitored", "Needs attention", "Waiting for expert"), clear status badges, and large touch elements for field use.

#### B. Backend API (FastAPI)
- **FastAPI Framework**: High performance asynchronous web framework with native data validation via Pydantic.
- **Security & Authorization**: Password hashing using `bcrypt`, stateful sessionless authentication using JSON Web Tokens (JWT), and role-based route protection (`FARMER`, `EXPERT`, `ADMIN`).
- **Rule-Based Risk Calculation Engine**: Evaluates recorded observations (body temperature, appetite status, activity level, and specific symptoms) to compute an initial risk level (`LOW`, `MEDIUM`, `HIGH`, `UNKNOWN`) and automatically flag high-risk cases for expert escalation. Designed to easily drop in trained ML models (e.g. computer vision image classifiers) in future phases.

#### C. Relational Database Layer (PostgreSQL)
- Relational schema enforcing referential integrity across 8 core entities: `users`, `animals`, `observations`, `images`, `disease_predictions`, `expert_reviews`, `escalations`, and `audit_logs`.
- Indexes optimized for common field queries (e.g. querying observations by `animal_id` or pending reviews by `validation_status`).

---

### 4. Disease Risk & Escalation Workflow

1. **Record**: Farmer logs an observation including temperature, appetite, activity, symptoms, and optional photos.
2. **Assess**: Rule engine instantly evaluates symptom combinations (e.g., High fever + coughing = HIGH risk).
3. **Escalate**: If risk is `HIGH`, the system automatically generates an `ESCALATION` entry with priority `HIGH` and creates a pending `EXPERT_REVIEW`.
4. **Review**: Expert logs into their dashboard, views pending escalations, inspects symptoms and images, and provides a professional diagnosis & recommendations.
5. **Update**: Farmer receives understandable explanations on their dashboard.

---

### 5. Offline-First Synchronization Architecture (Phase 4)

1. **Local Storage Layer**: Built on Dexie.js (`LivestockHealthOfflineDB_v2`) with five local stores: `animals`, `observations`, `observationImages`, `syncQueue`, and `appMetadata`.
2. **Idempotency Guarantee**: Every observation created offline is tagged with a client-generated UUID (`client_observation_id`). A unique database constraint scoped to the farmer (`uk_farmer_client_observation`) prevents duplicate observation records during retries or sync replays.
3. **Sequential Sync Pipeline**:
   - Observations are synced first via `POST /api/observations` to acquire the authoritative server primary key (`observation_id`).
   - Locally captured and compressed photo blobs are then streamed sequentially via `POST /api/observations/{id}/images`.
4. **Network Detection & Retry**: The `useNetworkStatus` hook detects online/offline transitions and verifies backend reachability via `GET /api/health`. Failed operations use exponential backoff up to 3 retries before marking as `FAILED`, giving the farmer clear "Retry Failed" control.

