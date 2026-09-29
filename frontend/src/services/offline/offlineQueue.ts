import { offlineDb, LocalObservation, LocalImage, SyncQueueItem } from './offlineDb';
import { compressImage } from './imageCompressor';
import { Animal, ObservationSymptom } from '@/types';

export interface PreliminaryRiskResult {
  risk_level: 'LOW' | 'MEDIUM' | 'HIGH';
  confidence: number;
  factors: string[];
  recommended_action: string;
}

// Client-side preliminary rule-based risk evaluation matching backend core/risk.py
export function evaluatePreliminaryRisk(
  symptoms: string[],
  temperature?: number,
  appetiteStatus = 'NORMAL',
  activityStatus = 'ACTIVE',
  ageStage?: string
): PreliminaryRiskResult {
  const sympLower = (symptoms || []).map((s) => s.toLowerCase());
  const highRisk = ['fever', 'nasal discharge', 'diarrhea', 'skin changes', 'swelling'];
  const modRisk = ['coughing', 'reduced appetite', 'reduced activity'];

  const matchedHigh = (symptoms || []).filter((s) => highRisk.some((hr) => s.toLowerCase().includes(hr)));
  const matchedMod = (symptoms || []).filter((s) => modRisk.some((mr) => s.toLowerCase().includes(mr)));

  const isHighTemp = temperature !== undefined && temperature >= 39.5;
  const isModTemp = temperature !== undefined && temperature >= 38.8 && temperature < 39.5;
  const isPoorAppetite = ['POOR', 'NONE', 'REDUCED'].includes(appetiteStatus.toUpperCase());
  const isLethargic = ['LETHARGIC', 'LOW', 'REDUCED'].includes(activityStatus.toUpperCase());

  let score = 0;
  const factors: string[] = [];

  if (matchedHigh.length > 0) {
    score += matchedHigh.length * 3;
    factors.push(`Severe clinical symptoms reported: ${matchedHigh.join(', ')}`);
  }
  if (matchedMod.length > 0) {
    score += matchedMod.length * 1.5;
    factors.push(`Moderate symptoms noted: ${matchedMod.join(', ')}`);
  }
  if (isHighTemp) {
    score += 3;
    factors.push(`Elevated body temperature (${temperature}°C)`);
  } else if (isModTemp) {
    score += 1.5;
    factors.push(`Mildly elevated temperature (${temperature}°C)`);
  }
  if (isPoorAppetite) {
    score += 2;
    factors.push(`Appetite status is ${appetiteStatus.toLowerCase()}`);
  }
  if (isLethargic) {
    score += 2;
    factors.push(`Animal activity is depressed (${activityStatus.toLowerCase()})`);
  }

  if (score >= 5 || matchedHigh.length >= 2 || (isHighTemp && isPoorAppetite)) {
    return {
      risk_level: 'HIGH',
      confidence: 0.85,
      factors,
      recommended_action: 'Isolate animal from herd immediately and submit observation for prompt veterinary review.'
    };
  }
  if (score >= 2.5 || matchedMod.length >= 2 || isPoorAppetite || isLethargic || isModTemp) {
    return {
      risk_level: 'MEDIUM',
      confidence: 0.70,
      factors,
      recommended_action: 'Monitor closely for 24-48 hours, ensure fresh water and shade, and re-record if symptoms persist.'
    };
  }
  return {
    risk_level: 'LOW',
    confidence: 0.90,
    factors: factors.length > 0 ? factors : ['Observation signs remain within normal herd parameters.'],
    recommended_action: 'Continue routine herd feeding and standard daily observation.'
  };
}

export interface EnqueueObservationParams {
  animal_id: string;
  animal_tag?: string;
  animal_species?: string;
  first_symptom_at: string;
  observed_at: string;
  symptoms_description: string[];
  structured_symptoms?: ObservationSymptom[];
  temperature?: number;
  temperature_unit?: string;
  appetite_status: string;
  activity_status: string;
  farm_location?: string;
  animal_location?: string;
  age_stage?: string;
  notes?: string;
  photoFile?: File | Blob | null;
}

/**
 * Enqueues an observation for offline storage and future synchronization.
 */
export async function enqueueObservation(
  params: EnqueueObservationParams
): Promise<{ local_id: string; preliminary_risk: 'LOW' | 'MEDIUM' | 'HIGH'; result: PreliminaryRiskResult }> {
  // Generate client UUID for idempotency
  const local_id = crypto.randomUUID();
  const riskResult = evaluatePreliminaryRisk(
    params.symptoms_description,
    params.temperature,
    params.appetite_status,
    params.activity_status,
    params.age_stage
  );

  const localObs: LocalObservation = {
    local_id,
    animal_id: params.animal_id,
    animal_tag: params.animal_tag,
    animal_species: params.animal_species,
    first_symptom_at: params.first_symptom_at,
    observed_at: params.observed_at,
    symptoms_description: params.symptoms_description,
    structured_symptoms: params.structured_symptoms,
    temperature: params.temperature,
    temperature_unit: params.temperature_unit || 'C',
    appetite_status: params.appetite_status,
    activity_status: params.activity_status,
    farm_location: params.farm_location,
    animal_location: params.animal_location,
    age_stage: params.age_stage,
    notes: params.notes,
    sync_status: 'PENDING',
    preliminary_risk: riskResult.risk_level,
    system_confidence: riskResult.confidence,
    explanation_factors: riskResult.factors,
    recommended_action: riskResult.recommended_action,
    created_at: new Date().toISOString()
  };

  await offlineDb.transaction('rw', [offlineDb.observations, offlineDb.observationImages, offlineDb.syncQueue], async () => {
    // 1. Save local observation
    await offlineDb.observations.put(localObs);

    // 2. Add observation to sync queue
    await offlineDb.syncQueue.add({
      operation_type: 'CREATE_OBSERVATION',
      local_entity_id: local_id,
      status: 'PENDING',
      retry_count: 0,
      created_at: new Date().toISOString()
    });

    // 3. If photo attached, compress and save to observationImages store
    if (params.photoFile) {
      const imgId = crypto.randomUUID();
      let compressedBlob = params.photoFile;
      let width = 0;
      let height = 0;
      let imageQuality: 'GOOD' | 'ACCEPTABLE' | 'POOR' = 'GOOD';
      let qualityNotes = 'Clear photo';

      try {
        const comp = await compressImage(params.photoFile);
        compressedBlob = comp.blob;
        width = comp.width;
        height = comp.height;
        imageQuality = comp.qualityCheck.quality;
        qualityNotes = comp.qualityCheck.warning || comp.qualityCheck.details.join('; ');
      } catch (err) {
        console.warn('Image compression fallback to raw file:', err);
      }

      const localImg: LocalImage = {
        id: imgId,
        local_observation_id: local_id,
        blob: compressedBlob,
        filename: `photo_${local_id.slice(0, 8)}.jpg`,
        mime_type: 'image/jpeg',
        file_size: compressedBlob.size,
        width,
        height,
        image_quality: imageQuality,
        quality_notes: qualityNotes,
        sync_status: 'PENDING',
        created_at: new Date().toISOString()
      };

      await offlineDb.observationImages.put(localImg);

      // Queue image upload dependent on parent observation
      await offlineDb.syncQueue.add({
        operation_type: 'UPLOAD_IMAGE',
        local_entity_id: imgId,
        parent_local_id: local_id,
        status: 'PENDING',
        retry_count: 0,
        created_at: new Date().toISOString()
      });
    }
  });

  return { local_id, preliminary_risk: riskResult.risk_level, result: riskResult };
}

/**
 * Summarizes the current offline sync state.
 */
export async function getQueueSummary(): Promise<{
  pendingCount: number;
  syncingCount: number;
  failedCount: number;
  hasUnsynced: boolean;
}> {
  const pendingObs = await offlineDb.observations.where('sync_status').equals('PENDING').count();
  const syncingObs = await offlineDb.observations.where('sync_status').equals('SYNCING').count();
  const failedObs = await offlineDb.observations.where('sync_status').equals('FAILED').count();

  const pendingImg = await offlineDb.observationImages.where('sync_status').equals('PENDING').count();
  const failedImg = await offlineDb.observationImages.where('sync_status').equals('FAILED').count();

  const pendingCount = pendingObs + pendingImg;
  const failedCount = failedObs + failedImg;
  const syncingCount = syncingObs;

  return {
    pendingCount,
    syncingCount,
    failedCount,
    hasUnsynced: pendingCount > 0 || syncingCount > 0 || failedCount > 0
  };
}

/**
 * Resets failed items in the sync queue to PENDING so the farmer can retry.
 */
export async function resetFailedQueueItems(): Promise<void> {
  await offlineDb.transaction('rw', [offlineDb.observations, offlineDb.observationImages, offlineDb.syncQueue], async () => {
    // Reset observations
    const failedObs = await offlineDb.observations.where('sync_status').equals('FAILED').toArray();
    for (const obs of failedObs) {
      await offlineDb.observations.update(obs.local_id, { sync_status: 'PENDING', sync_error: undefined });
    }

    // Reset images
    const failedImgs = await offlineDb.observationImages.where('sync_status').equals('FAILED').toArray();
    for (const img of failedImgs) {
      await offlineDb.observationImages.update(img.id, { sync_status: 'PENDING' });
    }

    // Reset queue items
    const failedQueue = await offlineDb.syncQueue.where('status').equals('FAILED').toArray();
    for (const item of failedQueue) {
      if (item.id) {
        await offlineDb.syncQueue.update(item.id, { status: 'PENDING', retry_count: 0, error_message: undefined });
      }
    }
  });
}

/**
 * Caches animals to IndexedDB with a sync timestamp.
 */
export async function cacheAnimals(animals: Animal[]): Promise<void> {
  const now = new Date().toISOString();
  await offlineDb.transaction('rw', [offlineDb.animals, offlineDb.appMetadata], async () => {
    await offlineDb.animals.clear();
    for (const a of animals) {
      await offlineDb.animals.put({ ...a, synced_at: now });
    }
    await offlineDb.appMetadata.put({ key: 'animals_last_synced', value: now });
  });
}

/**
 * Gets cached animals from IndexedDB.
 */
export async function getCachedAnimals(): Promise<{ animals: Animal[]; lastSynced: string | null }> {
  const animals = await offlineDb.animals.toArray();
  const meta = await offlineDb.appMetadata.get('animals_last_synced');
  return {
    animals,
    lastSynced: meta?.value || null
  };
}
