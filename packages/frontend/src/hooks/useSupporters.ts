import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '../services/api';

export function useSearch(query: string, field?: string) {
  return useQuery({
    queryKey: ['search', query, field],
    queryFn: () => api.searchSupporters(query, field),
    enabled: query.length > 0,
    staleTime: 5000,
  });
}

export function useSupporterProfile(id: string) {
  return useQuery({
    queryKey: ['profile', id],
    queryFn: () => api.getSupporterProfile(id),
    enabled: !!id,
  });
}

export function useSupporterTimeline(id: string, eventTypes?: string[]) {
  return useQuery({
    queryKey: ['timeline', id, eventTypes],
    queryFn: () => api.getSupporterTimeline(id, eventTypes),
    enabled: !!id,
  });
}

export function useMergeSupporters() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ primaryId, secondaryId }: { primaryId: string; secondaryId: string }) =>
      api.mergeSupporters(primaryId, secondaryId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['search'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });
}
