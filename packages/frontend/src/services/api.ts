import axios, { AxiosError } from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '';
const API_KEY = import.meta.env.VITE_API_KEY || '';

export interface ApiError {
  error: string;
  code?: string;
  details?: any;
}

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': API_KEY,
  },
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiError>) => {
    const message = error.response?.data?.error || error.message || 'An error occurred';
    return Promise.reject(new Error(message));
  }
);

export async function searchSupporters(query: string, field?: string) {
  const params = new URLSearchParams({ q: query });
  if (field) params.set('field', field);
  const response = await apiClient.get(`/search?${params}`);
  return response.data.data;
}

export async function getSupporterProfile(id: string) {
  const response = await apiClient.get(`/supporters/${id}`);
  return response.data.data;
}

export async function getSupporterTimeline(id: string, eventTypes?: string[]) {
  const params = new URLSearchParams();
  if (eventTypes?.length) {
    eventTypes.forEach(t => params.append('event_types', t));
  }
  const response = await apiClient.get(`/supporters/${id}/timeline?${params}`);
  return response.data.data;
}

export async function mergeSupporters(primaryId: string, secondaryId: string) {
  const response = await apiClient.post('/admin/merge', {
    primary_supporter_id: primaryId,
    secondary_supporter_id: secondaryId,
  });
  return response.data.data;
}
