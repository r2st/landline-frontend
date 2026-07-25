import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { dialtoneApi, sendTimingApi } from '../api/client';

// Dialtone Console header — polls so the "live" feel holds up while the agent
// works. `timeframe` scopes the tallies (and the vs-previous-period deltas the
// response carries with them); it's part of the query key so switching windows
// doesn't serve the last one's numbers. Degrades to a safe empty shape if the
// backend isn't ready.
export function useDialtoneConsole(timeframe) {
  return useQuery({
    queryKey: ['dialtone-console', timeframe],
    queryFn: async () => {
      try {
        return await dialtoneApi.console(timeframe);
      } catch {
        return {
          sending: { enabled: true },
          warmup: {},
          stats: {},
          today: {},
          senders: [],
          timeframe,
          deltas: {},
          rates: {},
        };
      }
    },
    refetchInterval: 30000,
    // Hold the last window's numbers on screen while the new one loads, so
    // switching timeframes reads as the figures changing rather than the whole
    // header blanking to zeros. (v5 spelling — a bare `keepPreviousData: true`
    // is a v4 option and silently does nothing here.)
    placeholderData: keepPreviousData,
    retry: false,
  });
}

// Warm-lead phone-enrichment roll-up for the Console card, scoped to the same
// timeframe as the rest of the page's stats. Degrades to a safe zeroed shape so
// the card renders "nothing enriched yet" rather than blanking out when the
// backend isn't ready.
export function usePhoneEnrichment(recentLimit = 8, timeframe) {
  return useQuery({
    queryKey: ['dialtone-phone-enrichment', recentLimit, timeframe],
    queryFn: async () => {
      try {
        return await dialtoneApi.phoneEnrichment(recentLimit, timeframe);
      } catch {
        return { enriched: 0, attempts: 0, hit_rate: 0, apollo: 0, company: 0, recent: [] };
      }
    },
    refetchInterval: 60000,
    placeholderData: keepPreviousData,
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
    // The feed follows the selected timeframe, so it re-keys on every window
    // change too — same reason as the header above.
    placeholderData: keepPreviousData,
    retry: false,
  });
}

// ── Smart Send-Time Optimization (Feature 6) ─────────────────────────────────
// ── Smart Send-Time Optimization (Feature 6) ─────────────────────────
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
