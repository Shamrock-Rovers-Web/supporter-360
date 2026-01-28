import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import * as api from '../services/api';
import { SupporterType, EventType } from '@supporter360/shared';

export function useSearch(
  query: string,
  supporterTypes: SupporterType[] = [],
  limit = 20,
  offset = 0
) {
  return useQuery({
    queryKey: ['search', query, supporterTypes, limit, offset],
    queryFn: () => api.searchSupporters({
      q: query,
      supporter_types: supporterTypes.length > 0 ? supporterTypes : undefined,
      limit,
      offset,
    }),
    enabled: query.length > 0,
    staleTime: 30000, // 30 seconds - search results can change frequently
    gcTime: 300000, // 5 minutes - keep in cache for potential back-navigation
  });
}

export function useSupporterProfile(id: string) {
  return useQuery({
    queryKey: ['profile', id],
    queryFn: () => api.getSupporterProfile(id),
    enabled: !!id,
    staleTime: 60000, // 1 minute - profile data is relatively stable
    gcTime: 900000, // 15 minutes - keep profiles cached longer
    refetchOnWindowFocus: false, // Prevent unnecessary refetches
  });
}

export function useSupporterTimeline(
  id: string,
  eventTypes?: EventType[],
  limit = 50,
  offset = 0
) {
  return useQuery({
    queryKey: ['timeline', id, eventTypes, limit, offset],
    queryFn: () => api.getSupporterTimeline(id, eventTypes, limit, offset),
    enabled: !!id,
    staleTime: 120000, // 2 minutes - timeline events change less frequently
    gcTime: 600000, // 10 minutes - keep timeline data cached
    refetchOnWindowFocus: false,
  });
}

export function useMergeSupporters() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ sourceId, targetId, reason }: {
      sourceId: string;
      targetId: string;
      reason?: string;
    }) => api.mergeSupporters(sourceId, targetId, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['search'] });
      queryClient.invalidateQueries({ queryKey: ['profile'] });
    },
  });
}

export function useSearchForMerge(query: string) {
  return useQuery({
    queryKey: ['merge-search', query],
    queryFn: () => api.searchSupportersForMerge(query),
    enabled: query.length > 1,
    staleTime: 60000, // 1 minute - merge search results are stable
    gcTime: 300000, // 5 minutes
  });
}
