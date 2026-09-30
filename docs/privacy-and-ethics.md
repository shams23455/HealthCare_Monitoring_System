# Privacy, Data Protection & Ethics Framework

## 1. Ethical Principles & Purpose

The **Livestock Health Observation and Expert Escalation System** is engineered to empower rural livestock smallholders through structured health tracking and timely veterinary escalation. To maintain trust among farming communities and comply with data privacy standards, the system incorporates strict privacy-by-design and non-identifiable ethical data practices.

### Core Commitments:
1. **No Automated Diagnostic Authority**: The system explicitly provides *preliminary observation triage* rather than confirmed veterinary diagnoses. Decisions involving antibiotic administration, herd quarantine, or animal culling remain under licensed veterinary human authority.
2. **Strict Non-Human Animal Focus**: The system is designed solely for livestock animals (cattle, sheep, goats, buffalo, swine). No human medical data or human imagery is collected or processed.
3. **Data Minimization**: Only information clinically necessary for veterinary triage is gathered. Personal addresses, national identification numbers, and payment details are strictly excluded.
4. **Transparency & Explainability**: All risk scores provide plain-language explanations of why a case was flagged, ensuring farmers understand the rationale behind isolation and monitoring advice.

---

## 2. Image Privacy & EXIF Stripping Pipeline

When farmers capture photographs of livestock tissue, eyes, or lesions in the field:

### Client-Side Privacy:
- **EXIF Metadata Stripping**: Digital camera and mobile sensors embed geolocation GPS coordinates, device identifiers, and exact capture timestamps in EXIF headers. The client-side image processing pipeline automatically strips all EXIF metadata using Canvas re-encoding before data transmission.
- **Client Compression**: Photos are compressed to &le; 1080px resolution and &le; 1.5 MB in memory, minimizing battery and cellular bandwidth usage on rural 2G/3G connections.

### Server-Side Protection:
- **Format Validation**: Only valid JPEG, PNG, and WebP binary streams are accepted. File headers are verified using Pillow (PIL) to prevent executable payload injection.
- **Path Traversal Shield**: Uploaded files are assigned cryptographic UUID basenames (e.g. `d4927076db644f1d96fa4851ab1a0e66_animal.jpg`). File paths never retain user-supplied directory sequences.
- **Facial Privacy Guideline**: Photography protocol guidelines instruct farmers to frame exclusively the anatomical region of interest (e.g. eye, muzzle, hoof, skin lesion) without human faces or farm workers in the frame.

---

## 3. Dataset Anonymization & Ethical Sourcing

The machine learning dataset (`data/metadata/metadata.csv`) contains solely project-created, synthetic, or licensed non-identifiable animal imagery:

```
image_id,filename,animal_id,species,symptoms,animal_stage,location_region,image_quality,target_class,expert_label,risk_level,source_type,consent_status,anonymization_status
```

### Anonymization Rules:
- **Masked Farm Identifiers**: Specific homestead GPS coordinates and farm names are generalized to regional agricultural zones (e.g. `Northern Valley`, `Eastern Basin`).
- **Cryptographic Animal IDs**: Animal database primary keys are non-reversibly hashed using SHA-256 (`ANON-ANIMAL-XXXXXX`) to prevent tracking across commercial transactions.
- **Farmer Identity Decoupling**: Dataset export endpoints (`/api/metrics/dataset/images`) completely strip user account IDs, farmer names, and telephone numbers.
- **No Private Livestock Commercial Metrics**: Milk yield volumes, animal monetary valuations, and pedigree certificates are not included in training or evaluation datasets.

---

## 4. Security & Role-Based Access Control (RBAC)

The system implements defense-in-depth across the API and storage tiers:

1. **Authentication**: Stateless JSON Web Tokens (JWT) signed with HMAC-SHA256 (`HS256`).
2. **Password Protection**: Salted and hashed passwords using `bcrypt` (12 rounds) via `passlib`. Plaintext passwords are never logged or stored.
3. **Role Segregation**:
   - `FARMER`: Can only view, create, and update observations for animals tagged under their own farm account. Accessing other farmers' animal records returns HTTP `403 Forbidden`.
   - `EXPERT`: Authorized to inspect escalated cases across herds, access clinical photographs, and record validated diagnoses and advice.
   - `ADMIN`: Authorized for user lifecycle management, experiment analytics inspection, and audit log analysis.
4. **Audit Logging**: Sensitive actions (`OBSERVATION_CREATED`, `IMAGE_UPLOADED`, `EXPERT_REVIEW_SUBMITTED`, `OBSERVATION_IDEMPOTENT_REPLAY`) are immutably recorded in `audit_logs` with timestamps and acting user IDs.

---

## 5. Dataset Limitations & Ethical AI Boundaries

- **Triage vs Diagnosis**: Machine learning classifiers provide preliminary risk guidance. High model confidence should never prevent a farmer from consulting a veterinarian if clinical signs persist.
- **Low-Confidence Safety Intercept**: When visual classifier confidence falls below `MIN_CONFIDENCE=0.60`, the system automatically suppresses automated conclusions, marks the observation as `REVIEW_REQUIRED`, and requests veterinary review.
- **Representative Data Diversity**: Small pilot datasets cannot cover all regional livestock breeds or exotic disease mutations. The system is designed with a pluggable adapter (`ImageRiskModel`) to integrate validated multi-breed datasets iteratively as veterinary validation progresses.
