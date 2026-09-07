# Phase 3 Observation Workflow & Data Collection Guide

This guide details the farmer-facing health observation flow, image capture validation, timestamp tracking, and triage handoff implemented in Phase 3.

---

## 1. End-to-End Observation Lifecycle

```
             FARMER
                │
                ▼
        Select Animal (Tag, Species, Breed)
                │
                ▼
       Record First Symptom Timestamp
                │
                ▼
       Record Symptoms (Catalog & Custom)
                │
        ┌───────┼────────┐
        ▼       ▼        ▼
   Severity  Temperature Activity & Appetite
        │       │        │
        └───────┼────────┘
                ▼
          Farm & Pen Location
                │
                ▼
          Animal Photo (EXIF Stripped)
                │
                ▼   
        Structured Record (Pydantic / DB)
                │
                ▼
       Existing Risk Engine
                │
        ┌───────┼───────┐
        ▼       ▼       ▼
       LOW    MEDIUM   HIGH
                         │
                         ▼
                  Expert Review
```

---

## 2. The 5-Step Mobile Wizard

### Step 1: Select Animal
- Farmer picks from their active registered herd.
- Immediate summary preview showing: Ear Tag, Species, Breed, Sex, Growth Stage, and default Farm Location.
- Validation: Observation can only be recorded for an animal belonging to the authenticated farmer (`403 Forbidden` if mismatched).

### Step 2: Observed Symptoms & Severity
- Dynamic symptom chips loaded from `GET /api/symptoms`.
- Custom symptom entry for atypical signs.
- For each selected symptom:
  - **Severity**: `Mild`, `Moderate`, `Severe`
  - **Duration**: `Less than 1 day`, `1–3 days`, `4–7 days`, `More than 7 days`, `Unknown`

### Step 3: Timestamps, Vitals & Location
- **Timestamps**:
  - `first_symptom_at`: Estimated date/time when signs were first noticed.
  - `observed_at`: Examination date/time.
  - Validation: `first_symptom_at` cannot be in the future; `observed_at` cannot be earlier than `first_symptom_at`.
- **Vital Signs**:
  - Body Temperature: Optional numerical entry with `°C` / `°F` unit toggle. Validated against realistic ranges (25°C–48°C).
  - Appetite Status: `Normal / Eating well`, `Reduced / Picky eating`, `Not eating / Refusing feed`, `Unknown`.
  - Activity Level: `Normal / Energetic`, `Less active / Moving slowly`, `Very inactive / Lying down`, `Unknown`.
- **Location**:
  - `farm_location`: General pasture or farm section.
  - `animal_location`: Specific pen, stall, or enclosure.

### Step 4: Animal Photo Capture
- Native camera capture (`capture="environment"`) or file selector.
- Client-side checks: Accepted formats (JPEG, PNG, WEBP) and size (&le; 5 MB).
- Backend processing (`ImageStorageService`):
  - Strips EXIF metadata (camera model, GPS coordinates, device tags) to preserve farmer privacy.
  - Stores file under `backend/uploads/observations/`.
  - Calculates image dimensions (`width`, `height`) and stores metadata.

### Step 5: Review & Submit
- Comprehensive summary review before dispatching payload.
- Instant submission to `POST /api/observations`.
- Success screen displaying calculated Risk Assessment (`LOW`, `MEDIUM`, `HIGH`) and actionable guidance.

---

## 3. Timestamp Tracking Metric

To support future project goals measuring **"Time from first symptom to useful expert review"**, the system records:
1. `first_symptom_at`: First noticeable manifestation in the field.
2. `observed_at`: Digital observation logged by the farmer.
3. `escalated_at`: Timestamp when `HIGH` risk created the escalation case.
4. Future `reviewed_at`: Timestamp when the veterinary expert submits diagnosis.

Delta calculation: `T_delay = reviewed_at - first_symptom_at`.

---

## 4. Risk Engine Triage & Escalation

Observations are evaluated using the Phase 1 rule-based engine (`app/core/risk.py`):
- **LOW Risk**: Stable vitality, no critical symptoms. Farmer advised to continue routine daily monitoring.
- **MEDIUM Risk**: Mild symptoms or minor appetite/activity drop. Farmer advised to monitor closely for 24–48 hours.
- **HIGH Risk**: High fever (&ge;39.5°C), acute respiratory signs, multiple severe symptoms, or lethargy:
  - System automatically creates an `Escalation` (Priority: `HIGH`, Status: `OPEN`).
  - System creates an `ExpertReview` (Status: `PENDING`).
  - Surfaced immediately on the Veterinary Expert Workstation for priority review.
