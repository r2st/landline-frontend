import { useQuery } from '@tanstack/react-query';
import { reportsApi } from '../api/client';

function asArray(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  return [];
}

// Each report query degrades to an empty array if the backend isn't ready.
// `range` is an optional { start, end } passed through as query params.
function reportQuery(key, fetcher, range) {
  return useQuery({
    queryKey: [key, range],
    queryFn: async () => {
      try {
        return asArray(await fetcher(range));
      } catch {
        return [];
      }
    },
    retry: false,
  });
}

export function useRetentionReport(range) {
  return reportQuery('report-retention', (r) => reportsApi.retention(r), range);
}

export function useRevenueFunnelReport(range) {
  return reportQuery('report-revenue-funnel', (r) => reportsApi.revenueFunnel(r), range);
}

export function useActivityHeatmapReport(range) {
  return reportQuery('report-activity-heatmap', (r) => reportsApi.activityHeatmap(r), range);
}

export function useTopClientsReport(range) {
  return reportQuery('report-top-clients', (r) => reportsApi.topClients(r), range);
}

// Lead-quality returns an object (grade distribution, counts), not an array, so
// it can't use reportQuery's asArray wrapper. Degrades to an empty object.
export function useLeadQualityReport(days = 30) {
  return useQuery({
    queryKey: ['report-lead-quality', days],
    queryFn: async () => {
      try {
        return await reportsApi.leadQuality({ days });
      } catch {
        return {};
      }
    },
    retry: false,
  });
}

// Daily autonomous-activity summary — returns { latest, history }. Degrades to
// an empty shape so the page renders even if the backend isn't ready.
export function useDailySummary(days = 30) {
  return useQuery({
    queryKey: ['report-daily-summary', days],
    queryFn: async () => {
      try {
        const data = await reportsApi.dailySummary(days);
        return { latest: data?.latest || null, history: data?.history || [] };
      } catch {
        return { latest: null, history: [] };
      }
    },
    retry: false,
  });
}
