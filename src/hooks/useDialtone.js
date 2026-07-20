import { useQuery } from '@tanstack/react-query';
import { dialtoneApi, sendTimingApi } from '../api/client';

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

// ── Smart Send-Time Optimization (Feature 6) ─────────────────────────────────
// Each hook degrades to a safe empty/off shape so the results page always
// renders — even before the backend ships or when the optimizer has no data.

export function useSendTimingStatus() {
  return useQuery({
    queryKey: ['send-timing-status'],
    queryFn: async () => {
      try {
        return await sendTimingApi.status();
      } catch {
        return null;
      }
    },
    retry: false,
  });
}

export function useSendTimingExperiment() {
  return useQuery({
    queryKey: ['send-timing-experiment'],
    queryFn: async () => {
      try {
        return await sendTimingApi.experiment();
      } catch {
        return { arms: [], note: 'Experiment results are unavailable right now.' };
      }
    },
    retry: false,
  });
}

export function useSendTimingHeatmap() {
  return useQuery({
    queryKey: ['send-timing-heatmap'],
    queryFn: async () => {
      try {
        return await sendTimingApi.heatmap();
      } catch {
        return { has_data: false, cells: [] };
      }
    },
    retry: false,
  });
}

export function useSendTimingContacts(limit = 20) {
  return useQuery({
    queryKey: ['send-timing-contacts', limit],
    queryFn: async () => {
      try {
        return await sendTimingApi.contacts(limit);
      } catch {
        return { contacts: [], total: 0 };
      }
    },
    retry: false,
  });
}
