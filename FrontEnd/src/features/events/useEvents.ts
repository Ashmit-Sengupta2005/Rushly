import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/apiClient';
import { queryKeys } from '@/config/queryClient';
import type { EventOccurrenceDto, EventsScheduleResponse } from '@/types/api';

const EMPTY: EventOccurrenceDto[] = [];

/**
 * Raw sale windows for the next ~two weeks. Status (live/upcoming) is computed
 * from the clock in events.ts, so this only needs an occasional refresh.
 */
export function useEventSchedule() {
  const { data } = useQuery({
    queryKey: queryKeys.events.schedule,
    queryFn: async () =>
      (await apiClient.get<EventsScheduleResponse>('/events', { params: { days: 14 } })).occurrences,
    staleTime: 5 * 60_000,
    refetchInterval: 10 * 60_000,
  });
  return data ?? EMPTY;
}
