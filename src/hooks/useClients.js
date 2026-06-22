import { useQuery } from '@tanstack/react-query';
import { clientsApi, companiesApi } from '../api/client';
import { normalizeCompanies } from '../lib/normalize';
import { healthStatusFromScore } from '../lib/constants';

// Coerce a list-ish payload ({items:[...]} or [...]) into an array.
function asArray(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  return [];
}

// Normalize a client row regardless of whether it came from the dedicated
// /clients endpoint or the fallback companies list. Surfaces health, deal
// value, last-contact and task-count fields the Clients table expects.
function normalizeClient(c) {
  const score = c.health_score ?? c.fit_score ?? c.score ?? null;
  return {
    ...c,
    id: c.id ?? c.company_id,
    name: c.name ?? c.company_name,
    health_score: score,
    health_status: c.health_status || healthStatusFromScore(score),
    deal_value: c.deal_value ?? c.total_deal_value ?? c.revenue ?? null,
    last_contact_at: c.last_contact_at ?? c.last_contacted_at ?? c.last_emailed_at ?? null,
    upcoming_tasks: c.upcoming_tasks ?? c.open_tasks ?? c.task_count ?? null,
  };
}

// The client dashboard's aggregate stats + chart series. Returns null fields
// (rendered as empty states) if the backend isn't ready yet.
export function useClientOverview() {
  return useQuery({
    queryKey: ['client-overview'],
    queryFn: async () => {
      try {
        const data = await clientsApi.getOverview();
        return {
          total_clients: data.total_clients ?? 0,
          total_revenue: data.total_revenue ?? 0,
          avg_health_score: data.avg_health_score ?? null,
          at_risk_count: data.at_risk_count ?? 0,
          revenue_over_time: asArray(data.revenue_over_time),
          health_distribution: asArray(data.health_distribution),
          retention_over_time: asArray(data.retention_over_time),
          upcoming_renewals: asArray(data.upcoming_renewals),
        };
      } catch {
        return {
          total_clients: 0,
          total_revenue: 0,
          avg_health_score: null,
          at_risk_count: 0,
          revenue_over_time: [],
          health_distribution: [],
          retention_over_time: [],
          upcoming_renewals: [],
        };
      }
    },
    retry: false,
  });
}

// Clients = companies in the customer stage, enriched with lifecycle data.
// Tries the dedicated /clients endpoint, then falls back to the companies list
// filtered by stage so the page is useful even before the API ships.
export function useClients() {
  return useQuery({
    queryKey: ['clients'],
    queryFn: async () => {
      try {
        const data = await clientsApi.list();
        return asArray(data).map(normalizeClient);
      } catch {
        // Fall back to the companies list filtered to the client stage. If that
        // also fails (backend not ready), degrade to an empty state rather than
        // surfacing an error.
        try {
          const data = await companiesApi.getAll({ stage: 'customer', page_size: 200 });
          return normalizeCompanies(asArray(data)).map(normalizeClient);
        } catch {
          return [];
        }
      }
    },
    retry: false,
  });
}
