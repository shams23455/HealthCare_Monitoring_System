import Dexie, { type Table } from 'dexie';
import { Animal, ObservationSymptom } from '@/types';

export interface LocalAnimal extends Animal {
  synced_at?: string;
}

export interface LocalObservation {
  local_id: string; // client UUID (idempotency token)
  server_id?: string;
  animal_id: string;
  animal_tag?: string;
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
  sync_status: 'PENDING' | 'SYNCING' | 'SYNCED' | 'FAILED';
  preliminary_risk?: 'LOW' | 'MEDIUM' | 'HIGH' | 'UNKNOWN';
  created_at: string;
  last_sync_attempt?: string;
  sync_error?: string;
}

export interface LocalImage {
  id: string; // UUID
  local_observation_id: string;
  server_image_id?: string;
  blob: Blob;
  filename: string;
  mime_type: string;
  file_size: number;
  width?: number;
  height?: number;
  sync_status: 'PENDING' | 'SYNCING' | 'SYNCED' | 'FAILED';
  created_at: string;
}

export interface SyncQueueItem {
  id?: number; // auto-increment
  operation_type: 'CREATE_OBSERVATION' | 'UPLOAD_IMAGE';
  local_entity_id: string; // references LocalObservation.local_id or LocalImage.id
  parent_local_id?: string; // for images: references parent observation local_id
  status: 'PENDING' | 'SYNCING' | 'SYNCED' | 'FAILED';
  retry_count: number;
  last_attempt_at?: string;
  error_message?: string;
  created_at: string;
}

export interface AppMetadata {
  key: string;
  value: any;
}

export class LivestockOfflineDatabase extends Dexie {
  animals!: Table<LocalAnimal, string>;
  observations!: Table<LocalObservation, string>;
  observationImages!: Table<LocalImage, string>;
  syncQueue!: Table<SyncQueueItem, number>;
  appMetadata!: Table<AppMetadata, string>;

  constructor() {
    super('LivestockHealthOfflineDB_v2');
    this.version(1).stores({
      animals: 'id, animal_tag, species, farmer_id, is_active, synced_at',
      observations: 'local_id, server_id, animal_id, sync_status, created_at',
      observationImages: 'id, local_observation_id, sync_status, created_at',
      syncQueue: '++id, operation_type, local_entity_id, parent_local_id, status, created_at',
      appMetadata: 'key'
    });
  }
}

export const offlineDb = new LivestockOfflineDatabase();
