import { useQuery } from '@tanstack/react-query';
import { dashboardApi, emailApi } from '../api/client';

/**
 * Reuses existing dashboard hooks and adds analytics-specific data fetching.
 */

export function useAnalyticsMetrics() {
  return useQuery({
    queryKey: ['analytics-metrics'],
    queryFn: async () => {
      const data = await dashboardApi.getMetrics();
      const outreach = data.outreach || {};
      return {
        emails_sent: data.emails_sent || 0,
        emails_sent_last_week: outreach.sent_last_week || 0,
        emails_sent_prev_week: outreach.sent_prev_week || 0,
        open_rate: outreach.open_rate || 0,
        reply_rate: outreach.reply_rate || 0,
        click_rate: outreach.click_rate || 0,
        total_opens: outreach.total_opens || 0,
        total_replies: outreach.total_replies || 0,
        total_clicks: outreach.total_clicks || 0,
        pipeline: data.pipeline || [],
        industry_breakdown: data.industry_breakdown || [],
      };
    },
  });
}

export function useEmailTrendsAnalytics(days = 30) {
  return useQuery({
    queryKey: ['analytics-email-trends', days],
    queryFn: async () => {
      const data = await dashboardApi.getEmailTrends({ days });
      return Array.isArray(data) ? data : [];
    },
  });
}

export function useTopEngagedLeads(limit = 10) {
  return useQuery({
    queryKey: ['analytics-top-engaged', limit],
    queryFn: async () => {
      const data = await dashboardApi.getTopLeads({ limit });
      const leads = Array.isArray(data) ? data : [];
      // Sort by total interactions (opens + clicks + replies), falling back to score
      return leads
        .map((lead) => ({
          ...lead,
          total_interactions:
            (lead.opens || 0) + (lead.clicks || 0) + (lead.replies || 0) + (lead.score || 0),
        }))
        .sort((a, b) => b.total_interactions - a.total_interactions);
    },
  });
}

export function useRecentEmailActivity(limit = 20) {
  return useQuery({
    queryKey: ['analytics-recent-emails', limit],
    queryFn: async () => {
      const data = await dashboardApi.getRecentActivity({ limit });
      const items = Array.isArray(data) ? data : [];
      // Filter to email-related activity only
      return items.filter(
        (item) =>
          item.type === 'email_sent' ||
          item.type === 'email_opened' ||
          item.type === 'email_replied' ||
          item.type === 'email_clicked' ||
          item.type?.startsWith('email')
      );
    },
  });
}

export function useEmailSends(limit = 20) {
  return useQuery({
    queryKey: ['analytics-email-sends', limit],
    queryFn: async () => {
      const data = await emailApi.getSends({ page_size: limit });
      const items = data?.items || data;
      return Array.isArray(items) ? items : [];
    },
  });
}
