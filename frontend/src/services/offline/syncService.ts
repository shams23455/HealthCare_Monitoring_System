import { offlineDb } from './offlineDb';
import { createObservation, uploadObservationImage, apiFetch } from '@/services/api';
import { ObservationCreateInput } from '@/types';

class SyncService {
  private isSyncing = false;
  private listeners: (() => void)[] = [];

  constructor() {
    // Listen for network coming back online
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        console.log('[SyncService] Network returned. Triggering automatic background sync.');
        this.syncAll();
      });
    }
  }

  public subscribe(callback: () => void) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((cb) => cb !== callback);
    };
  }

  private notify() {
    this.listeners.forEach((cb) => {
      try {
        cb();
      } catch (err) {
        console.error('[SyncService] Listener error:', err);
      }
    });
  }

  public getSyncState() {
    return { isSyncing: this.isSyncing };
  }

  /**
   * Performs lightweight connectivity check against backend health endpoint.
   */
  public async isBackendReachable(): Promise<boolean> {
    if (!navigator.onLine) return false;
    try {
      const res = await apiFetch<{ status: string }>('/health');
      return res?.status === 'ok';
    } catch {
      return false;
    }
  }

  /**
   * Main synchronization routine.
   * Processes observations first (for server ID assignment), then associated images.
   */
  public async syncAll(): Promise<{ success: boolean; syncedCount: number; failedCount: number }> {
    if (this.isSyncing) {
      return { success: false, syncedCount: 0, failedCount: 0 };
    }

    const reachable = await this.isBackendReachable();
    if (!reachable) {
      console.log('[SyncService] Backend unreachable, postponing sync.');
      return { success: false, syncedCount: 0, failedCount: 0 };
    }

    this.isSyncing = true;
    this.notify();

    let syncedCount = 0;
    let failedCount = 0;

    try {
      // 1. Process Observations First
      const obsQueue = await offlineDb.syncQueue
        .where('operation_type')
        .equals('CREATE_OBSERVATION')
        .and((item) => item.status === 'PENDING')
        .toArray();

      for (const item of obsQueue) {
        const localObs = await offlineDb.observations.get(item.local_entity_id);
        if (!localObs) {
          if (item.id) await offlineDb.syncQueue.delete(item.id);
          continue;
        }

        try {
          if (item.id) {
            await offlineDb.syncQueue.update(item.id, {
              status: 'SYNCING',
              last_attempt_at: new Date().toISOString()
            });
          }
          await offlineDb.observations.update(localObs.local_id, { sync_status: 'SYNCING' });
          this.notify();

          const payload: ObservationCreateInput & { client_observation_id: string } = {
            client_observation_id: localObs.local_id,
            animal_id: localObs.animal_id,
            first_symptom_at: localObs.first_symptom_at,
            observed_at: localObs.observed_at,
            symptoms_description: localObs.symptoms_description,
            structured_symptoms: localObs.structured_symptoms,
            temperature: localObs.temperature,
            temperature_unit: localObs.temperature_unit,
            appetite_status: localObs.appetite_status,
            activity_status: localObs.activity_status,
            farm_location: localObs.farm_location,
            animal_location: localObs.animal_location,
            age_stage: localObs.age_stage,
            notes: localObs.notes
          };

          const serverObs = await createObservation(payload);

          // Mark observation as SYNCED with server ID
          await offlineDb.observations.update(localObs.local_id, {
            server_id: serverObs.id,
            sync_status: 'SYNCED',
            last_sync_attempt: new Date().toISOString()
          });

          if (item.id) {
            await offlineDb.syncQueue.update(item.id, { status: 'SYNCED' });
          }
          syncedCount++;
        } catch (err: any) {
          console.error(`[SyncService] Failed to sync observation ${localObs.local_id}:`, err);
          const nextRetry = (item.retry_count || 0) + 1;
          const status = nextRetry >= 3 ? 'FAILED' : 'PENDING';
          if (status === 'FAILED') failedCount++;

          if (item.id) {
            await offlineDb.syncQueue.update(item.id, {
              status,
              retry_count: nextRetry,
              error_message: err?.message || 'Server rejected observation'
            });
          }
          await offlineDb.observations.update(localObs.local_id, {
            sync_status: status,
            sync_error: err?.message || 'Synchronization failed'
          });
        }
        this.notify();
      }

      // 2. Process Images for Synced Observations
      const imgQueue = await offlineDb.syncQueue
        .where('operation_type')
        .equals('UPLOAD_IMAGE')
        .and((item) => item.status === 'PENDING')
        .toArray();

      for (const item of imgQueue) {
        const localImg = await offlineDb.observationImages.get(item.local_entity_id);
        if (!localImg) {
          if (item.id) await offlineDb.syncQueue.delete(item.id);
          continue;
        }

        // Parent observation must be synced first to obtain server_id
        const parentObs = await offlineDb.observations.get(localImg.local_observation_id);
        if (!parentObs || !parentObs.server_id) {
          console.log(`[SyncService] Skipping image ${localImg.id} until observation is synced.`);
          continue;
        }

        try {
          if (item.id) {
            await offlineDb.syncQueue.update(item.id, {
              status: 'SYNCING',
              last_attempt_at: new Date().toISOString()
            });
          }
          await offlineDb.observationImages.update(localImg.id, { sync_status: 'SYNCING' });
          this.notify();

          // Convert Blob to File
          const file = new File([localImg.blob], localImg.filename, {
            type: localImg.mime_type
          });

          const serverImg = await uploadObservationImage(parentObs.server_id, file, 'BODY');

          await offlineDb.observationImages.update(localImg.id, {
            server_image_id: serverImg.id,
            sync_status: 'SYNCED'
          });

          if (item.id) {
            await offlineDb.syncQueue.update(item.id, { status: 'SYNCED' });
          }
          syncedCount++;
        } catch (err: any) {
          console.error(`[SyncService] Failed to upload image ${localImg.id}:`, err);
          const nextRetry = (item.retry_count || 0) + 1;
          const status = nextRetry >= 3 ? 'FAILED' : 'PENDING';
          if (status === 'FAILED') failedCount++;

          if (item.id) {
            await offlineDb.syncQueue.update(item.id, {
              status,
              retry_count: nextRetry,
              error_message: err?.message || 'Server rejected image'
            });
          }
          await offlineDb.observationImages.update(localImg.id, {
            sync_status: status
          });
        }
        this.notify();
      }
    } finally {
      this.isSyncing = false;
      this.notify();
    }

    return {
      success: failedCount === 0,
      syncedCount,
      failedCount
    };
  }
}

export const syncService = new SyncService();
