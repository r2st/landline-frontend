import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { discoveryApi, queryClient } from '../api/client';

export function useSearchCompanies() {
  return useMutation({
    mutationFn: async (data) => await discoveryApi.searchCompanies(data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      toast.success(`Found ${res.total} companies: ${res.imported} imported, ${res.already_existed} already existed`);
    },
    onError: (e) => toast.error(e?.response?.data?.detail || e?.message || 'Search failed'),
  });
}

export function useEnrichCompany() {
  return useMutation({
    mutationFn: async ({ id, data }) => await discoveryApi.enrichCompany(id, data || {}),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      const msg = res.contacts_count > 0
        ? `Enriched! Found ${res.contacts_count} contacts.`
        : `Enrichment: ${res.enrichment?.status || 'done'}`;
      toast.success(msg);
    },
    onError: (e) => toast.error(e?.response?.data?.detail || e?.message || 'Enrichment failed'),
  });
}
