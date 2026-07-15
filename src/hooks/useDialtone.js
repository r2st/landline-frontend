import { useQuery } from '@tanstack/react-query';
import { dialtoneApi } from '../api/client';

// Dialtone Console header — polls so the "live" feel holds up while the agent
// works. Degrades to a safe empty shape if the backend isn't ready.
export function useDialtoneConsole() {
  return useQuery({
    queryKey: ['dialtone-console'],
    queryFn: async () => {
      try {
        return await dialtoneApi.console();
      } catch {
        return {
          sending: { enabled: true },
          warmup: {},
          today: {},
          senders: [],
        };
      }
    },
    refetchInterval: 30000,
    retry: false,
  });
}

// Dialtone activity feed. `filters` is passed straight through as query params
// ({ start, end, types, status, contact_id, q, page, page_size }). Degrades to
// an empty feed so the page always renders.
export function useDialtoneActivity(filters) {
  return useQuery({
    queryKey: ['dialtone-activity', filters],
    queryFn: async () => {
      try {
        const data = await dialtoneApi.activity(filters);
        return {
          items: Array.isArray(data?.items) ? data.items : [],
          total: data?.total || 0,
          page: data?.page || 1,
          page_size: data?.page_size || 50,
        };
      } catch {
        return { items: [], total: 0, page: 1, page_size: 50 };
      }
    },
    refetchInterval: 30000,
    keepPreviousData: true,
    retry: false,
  });
}
