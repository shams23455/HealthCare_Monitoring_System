export type Role = 'FARMER' | 'EXPERT' | 'ADMIN';

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'REVIEW_REQUIRED' | 'UNKNOWN';

export type ComparisonCategory =
  | 'AGREEMENT'
  | 'EXPERT_MODIFIED'
  | 'LOW_CONFIDENCE'
  | 'INSUFFICIENT_INFORMATION'
  | 'IMAGE_QUALITY_ISSUE';

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

export type SyncStatus = 'PENDING' | 'SYNCING' | 'SYNCED' | 'FAILED' | 'RETRYING';

export type ExpertDecision = 'VALIDATED' | 'MODIFIED' | 'REQUIRES_MORE_INFORMATION' | 'NOT_ACTIONABLE';

export type ErrorCategory =
  | 'POOR_IMAGE_QUALITY'
  | 'IMAGE_QUALITY'
  | 'MISSING_SYMPTOMS'
  | 'SYMPTOM_MISSING'
  | 'INCORRECT_SYMPTOM_INFO'
  | 'SYMPTOM_AMBIGUITY'
  | 'ANIMAL_STAGE_MISSING'
  | 'STAGE_MISSING'
  | 'LOCATION_MISSING'
  | 'LOW_CONFIDENCE'
  | 'RISK_OVER_ESTIMATION'
  | 'RISK_UNDER_ESTIMATION'
  | 'MODEL_EXPERT_DISAGREEMENT'
  | 'EXPERT_MODIFICATION'
  | 'NETWORK_SYNC_FAILURE'
  | 'SYNC_FAILURE'
  | 'OTHER';

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
  image_quality?: 'GOOD' | 'ACCEPTABLE' | 'POOR';
  quality_notes?: string;
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
  validation_status: 'PENDING' | 'VALIDATED' | 'REJECTED' | 'INCONCLUSIVE' | string;
  expert_decision?: ExpertDecision;
  system_risk_level?: string;
  system_confidence?: string;
  modified_risk_level?: string;
  comments?: string;
  expert_notes?: string;
  comparison_category?: ComparisonCategory;
  error_category?: ErrorCategory;
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
  submitted_at?: string;
  expert_review_started_at?: string;
  expert_review_completed_at?: string;
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
  system_confidence?: number;
  explanation_factors?: string[];
  recommended_action?: string;
  created_at: string;
  animal?: Animal;
  observation_symptoms?: ObservationSymptom[];
  images?: ImageRecord[];
  predictions?: DiseasePrediction[];
  reviews?: ExpertReview[];
  escalations?: Escalation[];
  sync_status?: SyncStatus;
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

export interface ReviewTimeMetrics {
  metric_name: string;
  formula: string;
  average_time_hours?: number | null;
  measured_value_hours?: number | null;
  average_turnaround_hours?: number | null;
  sample_size?: number;
  median_time_hours?: number | null;
  min_time_hours?: number | null;
  max_time_hours?: number | null;
  number_of_completed_reviews?: number;
  number_of_pending_reviews?: number;
  unit?: string;
  disclaimer?: string;
  baseline_value?: string;
  target_value?: string;
  measurement_period?: string;
  note?: string;
}

export interface ErrorAnalysisMetrics {
  total_cases?: number;
  total_expert_reviews?: number;
  correct_agreement_cases?: number;
  modified_cases?: number;
  low_confidence_cases?: number;
  image_quality_errors?: number;
  missing_information_cases?: number;
  disagreement_rate_percent?: number;
  systematic_error_categories?: Record<string, number>;
  category_breakdown?: Record<string, number>;
  comparison_categories_summary?: Record<string, number>;
  system_expert_agreement_count?: number;
  system_expert_disagreement_count?: number;
  expert_modifications_count?: number;
  requires_more_info_count?: number;
  evaluation_disclaimer?: string;
}

export interface ExperimentAnalytics {
  metric_name: string;
  baseline: {
    name: string;
    sample_size: number;
    average_review_time_hours: number | null;
    median_review_time_hours: number | null;
    min_hours: number | null;
    max_hours: number | null;
    source_status: string;
  };
  proposed: {
    name: string;
    sample_size: number;
    average_review_time_hours: number | null;
    median_review_time_hours: number | null;
    min_hours: number | null;
    max_hours: number | null;
    completed_reviews: number;
    pending_reviews: number;
    source_status: string;
  };
  improvement: {
    hours_saved: number | null;
    percentage_reduction: number | null;
    status: string;
  };
  disclaimer: string;
}

export interface ExperimentMeasurement {
  id: string;
  trial_type: 'BASELINE' | 'PROPOSED';
  case_id?: string;
  species?: string;
  first_symptom_at?: string;
  expert_review_at?: string;
  time_to_review_hours: number;
  notes?: string;
  source: string;
  created_at: string;
}

export interface StakeholderFeedback {
  id: string;
  participant_type: 'FARMER' | 'FARM_STAFF' | 'EXPERT';
  ease_observation_capture: number;
  ease_image_capture: number;
  clarity_explanation: number;
  ease_expert_review: number;
  usefulness_offline_mode: number;
  overall_usability: number;
  tasks_performed?: string;
  feedback_text?: string;
  created_at: string;
}

export interface StakeholderValidationSummary {
  validation_status: string;
  participant_count: number;
  average_ratings: {
    ease_observation_capture: number | null;
    ease_image_capture: number | null;
    clarity_explanation: number | null;
    ease_expert_review: number | null;
    usefulness_offline_mode: number | null;
    overall_usability: number | null;
  };
  participant_breakdown: Record<string, number>;
  recent_feedback: {
    participant_type: string;
    overall_usability: number;
    feedback_text: string;
  }[];
  note: string;
}

export interface MetricsDashboardData {
  total_observations: number;
  high_risk_observations: number;
  pending_reviews: number;
  completed_reviews: number;
  escalated_cases: number;
  average_review_time_hours: number | null;
  expert_modifications: number;
  observations_requiring_more_information: number;
  duplicate_preventions_count: number;
  image_quality_stats: {
    good: number;
    acceptable: number;
    poor: number;
  };
}
