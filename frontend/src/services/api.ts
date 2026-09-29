import {
  Animal,
  AnimalCreateInput,
  AnimalUpdateInput,
  User,
  Symptom,
  Observation,
  ObservationCreateInput,
  ImageRecord,
  MetricsDashboardData,
  ReviewTimeMetrics,
  ErrorAnalysisMetrics
} from '@/types';

const API_BASE_URL = '/api';

export class ApiError extends Error {
  status?: number;
  constructor(message: string, status?: number) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem('livestock_token');
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });
  } catch (networkErr: any) {
    throw new ApiError('Unable to reach the server. Please check your internet connection or server status.', 0);
  }

  if (!response.ok) {
    let errorDetail = '';
    try {
      const errorData = await response.json();
      if (typeof errorData.detail === 'string') {
        errorDetail = errorData.detail;
      } else if (Array.isArray(errorData.detail)) {
        errorDetail = errorData.detail.map((d: any) => d.msg || 'Invalid field').join(', ');
      }
    } catch {
      // response wasn't JSON
    }

    if (response.status === 401) {
      localStorage.removeItem('livestock_token');
      localStorage.removeItem('livestock_user');
      if (!window.location.pathname.startsWith('/login')) {
        window.location.href = '/login';
      }
      throw new ApiError(errorDetail || 'Session expired or invalid credentials. Please log in.', 401);
    }

    if (response.status === 403) {
      throw new ApiError(errorDetail || "You don't have permission to perform this action.", 403);
    }

    if (response.status === 404) {
      throw new ApiError(errorDetail || 'The requested resource was not found.', 404);
    }

    if (response.status === 422) {
      throw new ApiError(errorDetail || 'Please check the information entered and try again.', 422);
    }

    if (response.status >= 500) {
      throw new ApiError(errorDetail || 'Server encountered an internal error. Please try again shortly.', response.status);
    }

    throw new ApiError(errorDetail || `Request failed with code ${response.status}`, response.status);
  }

  return response.json();
}

// ==========================================
// Authentication & Profile Endpoints
// ==========================================

export async function loginUser(email: string, password: string): Promise<{ access_token: string; user: User }> {
  const formData = new URLSearchParams();
  formData.append('username', email);
  formData.append('password', password);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });
  } catch {
    throw new ApiError('Network error: Unable to contact server. Please verify your connection.', 0);
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: 'Login failed' }));
    throw new ApiError(errorData.detail || 'Incorrect email or password.', response.status);
  }

  return response.json();
}

export async function registerFarmer(payload: {
  name: string;
  email: string;
  password: string;
  confirm_password?: string;
  phone?: string;
}): Promise<{ access_token: string; user: User }> {
  return apiFetch<{ access_token: string; user: User }>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      ...payload,
      role: 'FARMER',
    }),
  });
}

export async function getCurrentUser(): Promise<User> {
  return apiFetch<User>('/auth/me');
}

export async function updateProfile(data: { name?: string; phone?: string }): Promise<User> {
  return apiFetch<User>('/auth/profile', {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

// ==========================================
// Livestock Management Endpoints
// ==========================================

export async function getAnimals(includeInactive: boolean = false): Promise<Animal[]> {
  const query = includeInactive ? '?include_inactive=true' : '';
  return apiFetch<Animal[]>(`/animals${query}`);
}

export async function getAnimal(id: string): Promise<Animal> {
  return apiFetch<Animal>(`/animals/${id}`);
}

export async function createAnimal(data: AnimalCreateInput): Promise<Animal> {
  return apiFetch<Animal>('/animals', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateAnimal(id: string, data: AnimalUpdateInput): Promise<Animal> {
  return apiFetch<Animal>(`/animals/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deactivateAnimal(id: string): Promise<Animal> {
  return apiFetch<Animal>(`/animals/${id}/deactivate`, {
    method: 'PATCH',
  });
}

// ==========================================
// Phase 3: Symptoms, Observations & Images
// ==========================================

export async function getSymptoms(): Promise<Symptom[]> {
  return apiFetch<Symptom[]>('/symptoms');
}

export async function getObservations(): Promise<Observation[]> {
  return apiFetch<Observation[]>('/observations');
}

export async function getObservation(id: string): Promise<Observation> {
  return apiFetch<Observation>(`/observations/${id}`);
}

export async function createObservation(data: ObservationCreateInput): Promise<Observation> {
  return apiFetch<Observation>('/observations', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function uploadObservationImage(
  observationId: string,
  file: File,
  imageType: string = 'BODY'
): Promise<ImageRecord> {
  const token = localStorage.getItem('livestock_token');
  const formData = new FormData();
  formData.append('file', file);
  formData.append('image_type', imageType);

  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/observations/${observationId}/images`, {
      method: 'POST',
      headers,
      body: formData,
    });
  } catch {
    throw new ApiError('Network error: Failed to upload image to server.', 0);
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: 'Image upload failed' }));
    throw new ApiError(errorData.detail || `Upload failed with status ${response.status}`, response.status);
  }

  return response.json();
}

export async function getObservationImages(observationId: string): Promise<ImageRecord[]> {
  return apiFetch<ImageRecord[]>(`/observations/${observationId}/images`);
}

export async function deleteObservationImage(observationId: string, imageId: string): Promise<void> {
  const token = localStorage.getItem('livestock_token');
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}/observations/${observationId}/images/${imageId}`, {
    method: 'DELETE',
    headers,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: 'Failed to delete image' }));
    throw new ApiError(errorData.detail || 'Delete failed', response.status);
  }
}

// ==========================================
// Metrics & Expert Workflow Endpoints
// ==========================================

export async function startExpertReview(observationId: string): Promise<Observation> {
  return apiFetch<Observation>(`/observations/${observationId}/start-review`, {
    method: 'POST'
  });
}

export async function getReviewTimeMetrics(): Promise<ReviewTimeMetrics> {
  return apiFetch<ReviewTimeMetrics>('/metrics/review-time');
}

export async function getErrorAnalysisMetrics(): Promise<ErrorAnalysisMetrics> {
  return apiFetch<ErrorAnalysisMetrics>('/metrics/error-analysis');
}

export async function getMetricsDashboard(): Promise<MetricsDashboardData> {
  return apiFetch<MetricsDashboardData>('/metrics/dashboard');
}
