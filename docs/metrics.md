# Clinical & Technical Metrics Framework

## 1. Overview
The Livestock Health Observation and Escalation System is evaluated against a structured measurement framework. The fundamental objective of the platform is to dramatically compress the latency between the onset of animal illness and actionable veterinary triage, especially on low-resource farms without on-site veterinary staff.

> [!IMPORTANT]
> **Data Integrity Rule**: No actual project results or field numbers are fabricated. Metric fields are explicitly separated into `Baseline` (historical reference), `Target` (project goal), and `Measured Result` (populated strictly during formal field deployment).

---

## 2. Primary Milestone Metric

### Time from First Symptom to Useful Expert Review
$$\Delta T_{\text{clinical}} = \text{expert\_review\_completed\_at} - \text{first\_symptom\_at}$$

#### Definition of "Useful Expert Review":
A useful expert review occurs when a qualified veterinary expert has:
1. Accessed the observation through the secure portal.
2. Inspected the visual evidence, reported symptoms, temperature, and farm location.
3. Formally recorded an expert decision (`VALIDATED`, `MODIFIED`, `REQUIRES_MORE_INFORMATION`, or `NOT_ACTIONABLE`).
4. Provided actionable clinical guidance or next steps in `expert_notes`.
5. Triggered an immutable timestamp at submission (`expert_review_completed_at`).

### Comparison Metric:
| Measurement Dimension | Baseline (Manual Workflow) | Project Target (Digital Platform) | Measured Field Result |
| :--- | :--- | :--- | :--- |
| **Median Time-to-Useful-Review** | 48.0 – 72.0 hours (manual transport/travel) | **< 6.0 hours** | *To be measured in field pilot* |
| **Observation Ingestion Lag** (`submitted_at - observed_at`) | > 24 hours | **< 30 minutes** (post-connectivity) | *To be measured in field pilot* |
| **Expert Active Inspection Duration** (`completed_at - started_at`) | N/A | **< 10 minutes** per escalation | *To be measured in field pilot* |

---

## 3. Comprehensive Project Performance Metrics

| Metric Key | Metric Name | Category | Target | Measurement Method |
| :--- | :--- | :--- | :--- | :--- |
| `M-01` | **Time from First Symptom to Review** | Clinical | < 6.0 hrs | Backend timestamp differential |
| `M-02` | **Observation Completion Rate** | Farmer UX | > 95% | Initiated vs Submitted observation funnel |
| `M-03` | **Expert Review Completion Rate** | Operations | > 90% | Escalated vs Reviewed observation ratio |
| `M-04` | **Offline Sync Success Rate** | Resilience | > 98% | Completed sync tasks / Total sync attempts |
| `M-05` | **Sync Failure Rate** | Resilience | < 2% | Failed tasks after max retries / Total |
| `M-06` | **Duplicate Prevention Count** | Resilience | 100% deduplicated | Replayed `client_observation_id` occurrences handled idempotently |
| `M-07` | **Image Upload Success Rate** | Media | > 95% | Uploaded images / Associated observations |
| `M-08` | **Average Expert Review Time** | Operations | < 15 mins | Time between `expert_review_started_at` and `completed_at` |
| `M-09` | **Number of Escalated Observations** | Triaging | Monitored | Count of observations flagged `HIGH` or escalated |
| `M-10` | **Expert Modification Rate** | Triaging | < 25% | Observations where expert modified system risk level |
| `M-11` | **System/Expert Disagreement Rate** | Triaging | Monitored | Ratio of non-agreement reviews used for continuous error analysis |

---

## 4. API Endpoints for Metrics Retrieval

- `GET /api/metrics/review-time`: Returns aggregate minimum, maximum, and average clinical time-to-review metrics.
- `GET /api/metrics/error-analysis`: Returns agreement ratios, modification frequency, and systematic error distributions.
- `GET /api/metrics/dashboard`: Consolidated operational KPI summary for administrative oversight.
