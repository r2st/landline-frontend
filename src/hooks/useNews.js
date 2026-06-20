import { useQuery, useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { newsApi, queryClient } from '../api/client';

export function useNews(params = {}) {
  return useQuery({
    queryKey: ['news', params],
    queryFn: () => newsApi.getAll(params),
  });
}

export function useCheckCompanyNews() {
  return useMutation({
    mutationFn: (id) => newsApi.checkCompany(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['news'] });
      toast.success(`Found ${data.articles_found} articles for ${data.company}`);
    },
    onError: (e) => toast.error(e?.response?.data?.detail || 'News check failed'),
  });
}

export function useCheckAllNews() {
  return useMutation({
    mutationFn: (limit) => newsApi.checkAll(limit),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['news'] });
      toast.success(`Checked ${data.companies_checked} companies, found ${data.total_articles} articles`);
    },
    onError: (e) => toast.error(e?.response?.data?.detail || 'News check failed'),
  });
}

export function useMarkActioned() {
  return useMutation({
    mutationFn: (id) => newsApi.markActioned(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['news'] });
      toast.success('Marked as actioned');
    },
    onError: (e) => toast.error(e?.response?.data?.detail || 'Failed'),
  });
}
