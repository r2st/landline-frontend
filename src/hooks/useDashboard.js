import { useQuery } from '@tanstack/react-query';
import { dashboardApi, companiesApi } from '../api/client';

export function useDashboardMetrics() {
  return useQuery({
    queryKey: ['dashboard-metrics'],
    queryFn: async () => {
      const data = await dashboardApi.getMetrics();
      // Normalize the API response to the shape the Dashboard component expects
      return {
        total_leads: data.total_companies || 0,
        total_contacts: data.total_contacts || 0,
        total_scored: data.total_scored || 0,
        avg_score: data.avg_fit_score || 0,
        emails_sent: data.outreach?.total_sent || 0,
        leads_this_week: data.total_companies || 0,
        conversion_rate: 0,
        response_rate: data.outreach?.reply_rate || 0,
        pipeline: data.pipeline || [],
        outreach: data.outreach || {},
        score_distribution: data.score_distribution || [],
      };
    },
  });
}

export function useRecentActivity() {
  return useQuery({
    queryKey: ['recent-activity'],
    queryFn: async () => {
      // The backend doesn't have a dedicated recent activity endpoint,
      // so we'll return an empty array — the UI gracefully handles this.
      return [];
    },
  });
}

export function useTopLeads() {
  return useQuery({
    queryKey: ['top-leads'],
    queryFn: async () => {
      // Fetch companies sorted by stage (opportunity first)
      const data = await companiesApi.getAll({ page_size: 5, stage: 'opportunity' });
      const items = data.items || data;
      return Array.isArray(items) ? items : [];
    },
  });
}
