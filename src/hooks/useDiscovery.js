import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { discoveryApi, queryClient } from '../api/client';

export function useSearchCompanies() {
  return useMutation({
    mutationFn: async (data) => await discoveryApi.searchCompanies(data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      // A rate-limited / unconfigured search is explained inline on the page,
      // not celebrated with a "found 0" toast.
      if (res?.search_status && res.search_status !== 'ok') return;
      toast.success(`Found ${res.total} companies: ${res.imported} added, ${res.already_existed} already in Prospect`);
    },
    // A 401 is our session, refused before anything reached Apollo; the raw
    // "Invalid or missing API key" detail reads as Apollo rejecting its key.
    onError: (e) => toast.error(
      e?.response?.status === 401
        ? 'Your session wasn’t accepted — refresh the page and search again.'
        : e?.response?.data?.detail || e?.message || 'Search failed'
    ),
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
