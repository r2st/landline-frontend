import { useMutation, useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { placesDiscoveryApi, queryClient } from '../api/client';

// Google Places SMB discovery. Every call here spends real API credits, so
// nothing polls and nothing retries.
export function useDiscoveryResults(params = {}) {
  return useQuery({
    queryKey: ['places-results', params],
    queryFn: () => placesDiscoveryApi.results(params),
    keepPreviousData: true,
    retry: false,
  });
}

export function useDiscoveryStats() {
  return useQuery({
    queryKey: ['places-stats'],
    queryFn: () => placesDiscoveryApi.stats(),
    retry: false,
  });
}

export function useSavedSearches() {
  return useQuery({
    queryKey: ['places-searches'],
    queryFn: () => placesDiscoveryApi.savedSearches(),
    retry: false,
  });
}

function invalidateAll() {
  queryClient.invalidateQueries({ queryKey: ['places-results'] });
  queryClient.invalidateQueries({ queryKey: ['places-stats'] });
  queryClient.invalidateQueries({ queryKey: ['places-searches'] });
}

// `status` is surfaced rather than folded into the count on purpose: the API
// distinguishes rate_limited / budget_exhausted / error from a genuine zero,
// and reporting "found 0" for a throttled call would be a lie that costs a
// retry.
function reportSearch(data) {
  invalidateAll();
  if (data?.status === 'ok') {
    toast.success(
      data.created
        ? `Found ${data.found} — ${data.created} new, ${data.duplicates} already known`
        : `Found ${data.found}, all ${data.duplicates} already known`
    );
    return;
  }
  const messages = {
    rate_limited: 'Places rate-limited us — try again shortly. Nothing was lost.',
    budget_exhausted: 'API credit budget is exhausted — no search was run.',
    skipped: 'Search skipped.',
  };
  toast(messages[data?.status] || data?.error || `Search returned: ${data?.status}`, { icon: '⚠️' });
}

export function useRunSearch() {
  return useMutation({
    mutationFn: (body) => placesDiscoveryApi.search(body),
    onSuccess: reportSearch,
    onError: (e) => toast.error(e?.response?.data?.detail || e?.message || 'Search failed'),
  });
}

export function useRunSavedSearch() {
  return useMutation({
    mutationFn: (id) => placesDiscoveryApi.runSearch(id),
    onSuccess: reportSearch,
    onError: (e) => toast.error(e?.response?.data?.detail || e?.message || 'Search failed'),
  });
}

export function useCreateSearch() {
  return useMutation({
    mutationFn: (body) => placesDiscoveryApi.createSearch(body),
    onSuccess: () => {
      invalidateAll();
      toast.success('Search saved');
    },
    onError: (e) => toast.error(e?.response?.data?.detail || e?.message || 'Could not save'),
  });
}

export function useUpdateSearch() {
  return useMutation({
    mutationFn: ({ id, ...body }) => placesDiscoveryApi.updateSearch(id, body),
    onSuccess: () => invalidateAll(),
    onError: (e) => toast.error(e?.response?.data?.detail || e?.message || 'Could not update'),
  });
}

export function useDeleteSearch() {
  return useMutation({
    mutationFn: (id) => placesDiscoveryApi.deleteSearch(id),
    onSuccess: () => {
      invalidateAll();
      toast.success('Search deleted');
    },
    onError: (e) => toast.error(e?.response?.data?.detail || e?.message || 'Could not delete'),
  });
}

// Importing is what turns a staged business into a real company + contact.
// `enrich` spends a Hunter credit and blocks on a scrape, so it stays opt-in.
export function useImportBusiness() {
  return useMutation({
    mutationFn: ({ businessId, enrich }) => placesDiscoveryApi.importBusiness(businessId, { enrich }),
    onSuccess: (data) => {
      invalidateAll();
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      if (data?.status === 'ok' || data?.status === 'imported') {
        const bits = [data.created_company ? 'company created' : 'matched an existing company'];
        if (data.contacts_created) bits.push(`${data.contacts_created} contact(s)`);
        if (data.fit_score != null) bits.push(`fit ${data.fit_score}`);
        toast.success(`Imported — ${bits.join(', ')}`);
      } else {
        toast(data?.error || `Import returned: ${data?.status}`, { icon: '⚠️' });
      }
    },
    onError: (e) => toast.error(e?.response?.data?.detail || e?.message || 'Import failed'),
  });
}
