# Offline-First Operation & Synchronization

## 1. Overview
In low-resource rural livestock settings, cellular network access is frequently intermittent or completely absent during field inspections. The Livestock Health Observation System is built from the ground up on an **offline-first paradigm**, ensuring farmers can record complete observations without connectivity loss.

---

## 2. IndexedDB Architecture

The client utilizes IndexedDB managed through Dexie.js (`LivestockHealthOfflineDB_v2`). The database schema contains dedicated stores for persistence:

| Store Name | Primary Key | Indexes | Purpose |
| :--- | :--- | :--- | :--- |
| `observations` | `client_observation_id` | `sync_status`, `animal_id`, `created_at` | Stores offline and cached observations |
| `observationImages` | `id` | `client_observation_id`, `upload_status` | Stores local compressed image blobs |
| `syncQueue` | `id` | `type`, `status`, `retry_count`, `created_at` | FIFO queue for pending synchronization tasks |
| `sync_metadata` / `appMetadata`| `key` | None | Stores sync cursors, timestamps, and preferences |

### Client-Generated UUID (`client_observation_id`)
When an observation is initiated offline:
1. The browser generates a unique RFC-4122 v4 UUID (`client_observation_id`).
2. This identifier remains immutable across retries, re-syncs, and offline updates.
3. The backend enforces a unique constraint on `(recorded_by, client_observation_id)`.

---

## 3. Synchronization Lifecycle & States

Every offline observation progresses through a defined state machine:

```
[Farmer Records Observation]
           |
           v
      [ PENDING ] (Persisted in IndexedDB observations & syncQueue)
           |
           v
    [Connection Restored]
           |
           v
      [ SYNCING ] (Observation JSON uploaded via POST /api/observations)
      /         \
   Success      Failure / Network drop
    /             \
   v               v
Observation     [ RETRYING ] (Exponential backoff: 2s, 4s, 8s...)
Created            |
   |            Max Retries Exceeded
   v               |
[Photo Upload]     v
(Stream blob)   [ FAILED ] (Clear error shown, farmer can "Retry")
   |
Success
   v
[ SYNCED ] (Server authoritative ID linked, local queue cleared)
```

### Sync Status Definitions:
- `PENDING`: Stored locally in IndexedDB, waiting for network connectivity.
- `SYNCING`: Request in-flight to FastAPI backend.
- `SYNCED`: Successfully created and verified on server.
- `FAILED`: Encountered persistent error (e.g. invalid foreign key or server failure) requiring user intervention.
- `RETRYING`: Transient network error encountered; queued for automatic backoff attempt.

---

## 4. Service Worker & Background Sync

### Service Worker (`public/sw.js`)
- **Application Shell Caching**: Pre-caches HTML, CSS, JavaScript bundles, icons, and UI assets via Cache API on install and activate events.
- **Offline Route Availability**: Intercepts `fetch` events, serving cached shell assets when offline and falling back to network when online.
- **Background Sync API**:
  - Registers a one-off sync event tag: `livestock-sync-queue`.
  - When the browser regains connectivity, the service worker wakes up and triggers sync queue processing even if the web app tab is in the background.

### Graceful Fallback for Browsers Without Background Sync
Because the Background Sync API is not universally supported in all mobile browsers (notably iOS Safari):
1. **Network Status Listeners**: The web app monitors `window.addEventListener('online', ...)`.
2. **Heartbeat Verification**: On the `online` event, the client performs a lightweight `GET /api/health` ping to verify active internet throughput rather than just a local router connection.
3. **Automatic Queue Flush**: Upon health confirmation, `syncService.processQueue()` triggers immediately.
4. **Manual Trigger**: The farmer interface features an on-screen **"Sync Now"** button in both the header and the offline banner.

---

## 5. Idempotent Synchronization & Duplicate Protection

Network dropouts frequently happen during the response phase of an HTTP request (the server created the record, but the client never received the 201 Created acknowledgment). 

### Backend Protection:
When the client retries the request with the identical `client_observation_id`:
1. The FastAPI endpoint checks the database:
   ```sql
   SELECT * FROM observations 
   WHERE recorded_by = :farmer_id 
     AND client_observation_id = :client_obs_id;
   ```
2. If an existing record is found, the backend returns:
   - Status: `200 OK`
   - Payload: The existing observation entity, including its assigned server ID and risk evaluation.
3. **No duplicate row is created.**
4. If an image upload was queued, it seamlessly associates the photo with the existing server observation ID.
