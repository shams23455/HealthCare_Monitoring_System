export type Role = 'FARMER' | 'EXPERT' | 'ADMIN';

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'UNKNOWN';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  phone?: string;
  created_at: string;
  updated_at: string;
}

export interface Animal {
  id: string;
  farmer_id: string;
  animal_tag: string;
  species: string;
  breed?: string;
  sex: 'Male' | 'Female' | 'Unknown';
  date_of_birth?: string;
  age_stage: 'Newborn' | 'Young' | 'Adult' | 'Senior' | 'Unknown' | string;
  farm_location: string;
  notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AnimalCreateInput {
  animal_tag: string;
  species: string;
  breed?: string;
  sex: string;
  date_of_birth?: string;
  age_stage: string;
  farm_location: string;
  notes?: string;
}

export interface AnimalUpdateInput {
  breed?: string;
  sex?: string;
  date_of_birth?: string;
  age_stage?: string;
  farm_location?: string;
  notes?: string;
  is_active?: boolean;
}

export interface Symptom {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
  created_at?: string;
}

export interface ObservationSymptom {
  id?: string;
  observation_id?: string;
  symptom_id?: string;
  symptom_name?: string;
  severity: 'Mild' | 'Moderate' | 'Severe' | string;
  duration: 'Less than 1 day' | '1–3 days' | '4–7 days' | 'More than 7 days' | 'Unknown' | string;
  created_at?: string;
}

export interface ImageRecord {
  id: string;
  observation_id: string;
  storage_path: string;
  original_filename?: string;
  file_size?: number;
  width?: number;
  height?: number;
  image_type: string;
  upload_status: 'PENDING' | 'UPLOADING' | 'UPLOADED' | 'FAILED';
  captured_at: string;
}

export interface DiseasePrediction {
  id: string;
  observation_id: string;
  predicted_condition: string;
  confidence_score: number;
  prediction_source: string;
  explanation: string;
  created_at: string;
}

export interface ExpertReview {
  id: string;
  observation_id: string;
  expert_id?: string;
  diagnosis?: string;
  validation_status: 'PENDING' | 'VALIDATED' | 'REJECTED' | 'INCONCLUSIVE';
  comments?: string;
  reviewed_at?: string;
}

export interface Escalation {
  id: string;
  observation_id: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  reason: string;
  status: 'OPEN' | 'IN_REVIEW' | 'RESOLVED';
  escalated_at: string;
  resolved_at?: string;
}

export interface Observation {
  id: string;
  client_observation_id?: string;
  animal_id: string;
  recorded_by: string;
  first_symptom_at: string;
  observation_date: string;
  observed_at: string;
  symptoms_description: string[];
  temperature?: number;
  temperature_unit?: string;
  appetite_status: string;
  activity_status: string;
  farm_location?: string;
  animal_location?: string;
  age_stage?: string;
  notes?: string;
  risk_level: RiskLevel;
  created_at: string;
  animal?: Animal;
  observation_symptoms?: ObservationSymptom[];
  images?: ImageRecord[];
  predictions?: DiseasePrediction[];
  reviews?: ExpertReview[];
  escalations?: Escalation[];
  sync_status?: 'SYNCED' | 'PENDING' | 'SYNCING' | 'FAILED';
  preliminary_risk?: RiskLevel;
}

export interface ObservationCreateInput {
  client_observation_id?: string;
  animal_id: string;
  first_symptom_at?: string;
  observed_at?: string;
  observation_date?: string;
  symptoms_description?: string[];
  structured_symptoms?: {
    symptom_id?: string;
    symptom_name?: string;
    severity: string;
    duration: string;
  }[];
  temperature?: number;
  temperature_unit?: string;
  appetite_status: string;
  activity_status: string;
  farm_location?: string;
  animal_location?: string;
  age_stage?: string;
  notes?: string;
}
