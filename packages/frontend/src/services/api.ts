import axios, { AxiosError } from 'axios';
import { SupporterType } from '@supporter360/shared';

const API_URL = import.meta.env.VITE_API_URL || '';
const API_KEY = import.meta.env.VITE_API_KEY || '';

export interface ApiError {
  error: string;
  code?: string;
  details?: any;
}

export interface SearchParams {
  q: string;
  supporter_types?: SupporterType[];
  limit?: number;
  offset?: number;
}

export interface SearchResponse {
  results: Array<{
    supporter_id: string;
    name: string | null;
    email: string | null;
    supporter_type: SupporterType;
    last_ticket_order_date: string | null;
    last_shop_order_date: string | null;
    membership_status: string | null;
  }>;
  total: number;
  has_more: boolean;
}

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'X-API-Key': API_KEY,
  },
});

// Unwrap the API response wrapper { success: true, data: ... }
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiError>) => {
    const message = error.response?.data?.error || error.message || 'An error occurred';
    return Promise.reject(new Error(message));
  }
);

export async function searchSupporters(params: SearchParams): Promise<SearchResponse> {
  const searchParams = new URLSearchParams();
  searchParams.set('q', params.q);
  if (params.supporter_types?.length) {
    params.supporter_types.forEach(t => searchParams.append('supporter_type', t));
  }
  if (params.limit) searchParams.set('limit', params.limit.toString());
  if (params.offset) searchParams.set('offset', params.offset.toString());

  const response = await apiClient.get<{ success: boolean; data: SearchResponse }>(`/search?${searchParams}`);
  return response.data.data;
}

export async function getSupporterProfile(id: string) {
  const response = await apiClient.get(`/supporters/${id}`);
  return response.data.data;
}

export async function getSupporterTimeline(id: string, eventTypes?: string[], limit?: number, offset?: number) {
  const params = new URLSearchParams();
  if (eventTypes?.length) {
    eventTypes.forEach(t => params.append('event_types', t));
  }
  if (limit) params.set('limit', limit.toString());
  if (offset) params.set('offset', offset.toString());

  const response = await apiClient.get<{ success: boolean; data: any }>(`/supporters/${id}/timeline?${params}`);
  return response.data.data;
}

export async function mergeSupporters(sourceId: string, targetId: string, reason?: string) {
  const response = await apiClient.post<{ success: boolean; data: any }>('/admin/merge', {
    source_id: sourceId,
    target_id: targetId,
    reason,
  });
  return response.data.data;
}

export async function searchSupportersForMerge(query: string): Promise<SearchResponse['results']> {
  const params = new URLSearchParams({ q: query, limit: '10' });
  const response = await apiClient.get<{ success: boolean; data: SearchResponse }>(`/search?${params}`);
  return response.data.data.results;
}
