import { useQuery } from '@tanstack/react-query';
import { dashboardApi, tasksApi } from '../api/client';

export function useDashboardMetrics() {
  return useQuery({
    queryKey: ['dashboard-metrics'],
    queryFn: async () => {
      const data = await dashboardApi.getMetrics();
      // Normalize the API response to the shape the Dashboard component expects.
      return {
        total_leads: data.total_companies || 0,
        total_contacts: data.total_contacts || 0,
        total_scored: data.total_scored || 0,
        avg_score: data.avg_fit_score || 0,
        emails_sent: data.emails_sent || 0,
        leads_this_week: data.leads_this_week || 0,
        response_rate: data.outreach?.reply_rate || 0,
        open_rate: data.outreach?.open_rate || 0,
        pipeline: data.pipeline || [],
        outreach: data.outreach || {},
        score_distribution: data.score_distribution || [],
        industry_breakdown: data.industry_breakdown || [],
        tasks_due_today: data.tasks_due_today || 0,
        active_deals_count: data.active_deals_count || 0,
        active_deals_value: data.active_deals_value || 0,
        contacts_this_week: data.contacts_this_week || 0,
      };
    },
  });
}

export function useRecentActivity(limit = 12) {
  return useQuery({
    queryKey: ['recent-activity', limit],
    queryFn: async () => {
      const data = await dashboardApi.getRecentActivity({ limit });
      return Array.isArray(data) ? data : [];
    },
  });
}

export function useTopLeads(limit = 5) {
  return useQuery({
    queryKey: ['top-leads', limit],
    queryFn: async () => {
      const data = await dashboardApi.getTopLeads({ limit });
      return Array.isArray(data) ? data : [];
    },
  });
}

export function useEmailTrends(days = 30) {
  return useQuery({
    queryKey: ['email-trends', days],
    queryFn: async () => {
      const data = await dashboardApi.getEmailTrends({ days });
      return Array.isArray(data) ? data : [];
    },
  });
}

export function useUpcomingTasks(limit = 5) {
  return useQuery({
    queryKey: ['upcoming-tasks', limit],
    queryFn: async () => {
      try {
        const data = await tasksApi.list({ status: 'pending', limit, sort: 'due_date' });
        const items = data?.items || data;
        return Array.isArray(items) ? items : [];
      } catch {
        return [];
      }
    },
    staleTime: 60000,
  });
}
