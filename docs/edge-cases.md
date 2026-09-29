# Edge Cases & Failure Mode Handling

## 1. Overview
Field deployment in low-resource pastoral settings presents environmental and operational edge cases. The Livestock Health Observation System is specifically engineered to handle communication dropouts, partial synchronization, duplicate requests, and ambiguous clinical data safely.

---

## 2. Core Edge Cases

### EDGE CASE 1: No Internet During Observation Submission
- **Scenario**: A farmer completes an observation while herding livestock in a remote valley without cellular coverage.
- **System Behavior**:
  1. The application detects the offline state using `navigator.onLine` and failure of the health ping.
  2. The observation is assigned a client-generated UUID (`client_observation_id`).
  3. The full observation record is persisted in IndexedDB `observations` store with status `PENDING`.
  4. The photo blob is compressed and stored in `observationImages`.
  5. The synchronization task is enqueued in `syncQueue`.
  6. The farmer receives an immediate confirmation:  
     *"Photo saved offline. Waiting for internet connection."*
  7. The farmer can navigate away, shut down the browser, or record subsequent observations without losing data.

---

### EDGE CASE 2: Internet Disconnects During Active Synchronization
- **Scenario**: The device regains a fleeting 2G connection and begins uploading an observation, but the network drops midway through the HTTP transfer.
- **System Behavior**:
  1. The in-flight `fetch` request aborts or times out.
  2. The error handler catches the network disruption without crashing the UI.
  3. The sync item status transitions to `RETRYING`.
  4. The client schedules an exponential backoff retry (e.g. 2s, 4s, 8s).
  5. If max retries (3) are exceeded before network stabilization, the item transitions to `FAILED`.
  6. The record remains intact in IndexedDB.
  7. The UI displays:  
     *"Offline — Observations will sync automatically when connected"* along with a manual **"Sync Now"** button.

---

### EDGE CASE 3: Same Observation Synchronized Twice (Idempotency)
- **Scenario**: An observation request reaches the backend, is written to the database, but the client connection drops before receiving the HTTP 201 response. Upon reconnection, the client replays the sync queue item with the same `client_observation_id`.
- **System Behavior**:
  1. The backend endpoint queries the database for existing records:
     `SELECT id FROM observations WHERE recorded_by = :user_id AND client_observation_id = :client_id`
  2. The existing observation is identified.
  3. **No duplicate row is created.**
  4. The backend returns HTTP `200 OK` with the existing observation data and authoritative server UUID.
  5. The client clears the item from `syncQueue` and updates local status to `SYNCED`.
  6. Verified by automated backend integration tests (`test_duplicate_client_observation_id_idempotency` and `test_edge_case_duplicate_sync_idempotency_retry`).

---

### EDGE CASE 4: Poor-Quality Image Capture
- **Scenario**: The farmer captures a photo at dusk or while the animal is moving, resulting in severe motion blur or low contrast.
- **System Behavior**:
  1. The client-side image analyzer inspects pixel luminance variance and resolution.
  2. The photo is flagged with quality status `POOR`.
  3. The interface displays an amber warning banner:  
     *"Photo quality may be too low for reliable review. Please capture another photo if possible."*
  4. The farmer is offered a **"Retake Photo"** option before submission.
  5. If submitted regardless, the image is tagged with `image_quality: "POOR"` and quality notes on the backend.
  6. The system explicitly refrains from claiming disease from poor-quality visuals.

---

### EDGE CASE 5: Incomplete Information Preventing Expert Decision
- **Scenario**: A veterinary expert opens an escalated case, but the farmer did not record body temperature or the lesion is partially obscured by mud.
- **System Behavior**:
  1. The expert selects decision: `REQUIRES_MORE_INFORMATION`.
  2. The expert provides specific clinical instructions in `expert_notes` (e.g., *"Please wash the leg area, capture a close-up photo of the hoof sole, and take rectal temperature"*).
  3. The expert selects the relevant error category (e.g. `SYMPTOM_AMBIGUITY` or `IMAGE_QUALITY`).
  4. The observation record preserves the system's preliminary triage rating while capturing the expert's feedback.
  5. Both `expert_review_started_at` and `expert_review_completed_at` timestamps are logged, calculating elapsed review metrics.
  6. The farmer's dashboard updates to alert them that the expert requested clarifying details.
