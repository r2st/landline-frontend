import { useQuery } from '@tanstack/react-query';
import { dashboardApi, outreachApi } from '../api/client';
import { mockMetrics, mockRecentActivity, mockCompanies } from '../lib/mockData';

export function useDashboardMetrics() {
  return useQuery({
    queryKey: ['dashboard-metrics'],
    queryFn: async () => {
      try {
        return await dashboardApi.getMetrics();
      } catch (error) {
        console.warn('API unavailable, using mock data');
        return mockMetrics;
      }
    },
  });
}

export function useRecentActivity() {
  return useQuery({
    queryKey: ['recent-activity'],
    queryFn: async () => {
      try {
        const data = await outreachApi.getEvents();
        return data;
      } catch (error) {
        console.warn('API unavailable, using mock data');
        return mockRecentActivity;
      }
    },
  });
}

export function useTopLeads() {
  return useQuery({
    queryKey: ['top-leads'],
    queryFn: async () => {
      try {
        const companies = await dashboardApi.getMetrics();
        if (companies?.top_leads) return companies.top_leads;
        throw new Error('No top leads from API');
      } catch (error) {
        console.warn('API unavailable, using mock data');
        return [...mockCompanies]
          .sort((a, b) => b.score - a.score)
          .slice(0, 5);
      }
    },
  });
}
