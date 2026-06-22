import { useQuery } from '@tanstack/react-query';
import { healthApi } from '../api/client';
import { healthStatusFromScore } from '../lib/constants';

function asArray(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  return [];
}

// Health score + history + key metrics for one company. Returns null if the
// backend isn't ready, so the widget can render a "not available" state.
export function useCompanyHealth(companyId) {
  return useQuery({
    queryKey: ['company-health', companyId],
    queryFn: async () => {
      try {
        const data = await healthApi.getForCompany(companyId);
        if (!data) return null;
        const score = data.score ?? data.health_score ?? null;
        return {
          score,
          status: data.status || healthStatusFromScore(score),
          days_since_last_contact: data.days_since_last_contact ?? null,
          response_rate: data.response_rate ?? null,
          meeting_frequency: data.meeting_frequency ?? null,
          history: asArray(data.history).map((h) => ({
            date: h.date ?? h.recorded_at,
            score: h.score ?? h.value,
          })),
        };
      } catch {
        return null;
      }
    },
    enabled: !!companyId,
    retry: false,
  });
}
