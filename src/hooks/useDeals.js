import { useQuery, useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { dealsApi, queryClient } from '../api/client';

function errMsg(e, fallback) {
  return e?.response?.data?.detail || e?.message || fallback;
}

function asArray(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  return [];
}

// Deals for a single company (the Deals tab). Empty list if the API isn't up.
export function useCompanyDeals(companyId) {
  return useQuery({
    queryKey: ['deals', { company_id: companyId }],
    queryFn: async () => {
      try {
        return asArray(await dealsApi.getByCompany(companyId));
      } catch {
        return [];
      }
    },
    enabled: !!companyId,
    retry: false,
  });
}

// All deals (reports, command palette search).
export function useDeals(params = {}) {
  return useQuery({
    queryKey: ['deals', params],
    queryFn: async () => {
      try {
        return asArray(await dealsApi.list(params));
      } catch {
        return [];
      }
    },
    retry: false,
  });
}

// Pipeline metrics (total value, weighted, win rate, etc.)
export function useDealMetrics() {
  return useQuery({
    queryKey: ['deal-metrics'],
    queryFn: async () => {
      try {
        return await dealsApi.metrics();
      } catch {
        return null;
      }
    },
    retry: false,
  });
}

// Sequence attribution — deals + revenue credited to each outreach sequence.
export function useDealAttribution() {
  return useQuery({
    queryKey: ['deal-attribution'],
    queryFn: async () => {
      try {
        return await dealsApi.attribution();
      } catch {
        return null;
      }
    },
    retry: false,
  });
}

// Deal stages with probabilities
export function useDealStages() {
  return useQuery({
    queryKey: ['deal-stages'],
    queryFn: async () => {
      try {
        return await dealsApi.stages();
      } catch {
        return [];
      }
    },
    retry: false,
    staleTime: 60000,
  });
}

// Notes for a single deal
export function useDealNotes(dealId) {
  return useQuery({
    queryKey: ['deal-notes', dealId],
    queryFn: async () => {
      try {
        return await dealsApi.listNotes(dealId);
      } catch {
        return [];
      }
    },
    enabled: !!dealId,
    retry: false,
  });
}

// Activity timeline for a single deal
export function useDealActivity(dealId) {
  return useQuery({
    queryKey: ['deal-activity', dealId],
    queryFn: async () => {
      try {
        return await dealsApi.listActivity(dealId);
      } catch {
        return [];
      }
    },
    enabled: !!dealId,
    retry: false,
  });
}

function invalidate() {
  queryClient.invalidateQueries({ queryKey: ['deals'] });
  queryClient.invalidateQueries({ queryKey: ['deal-metrics'] });
  queryClient.invalidateQueries({ queryKey: ['client-overview'] });
  queryClient.invalidateQueries({ queryKey: ['clients'] });
}

export function useCreateDeal() {
  return useMutation({
    mutationFn: async (data) => await dealsApi.create(data),
    onSuccess: () => { invalidate(); toast.success('Deal created'); },
    onError: (e) => toast.error(errMsg(e, 'Failed to create deal')),
  });
}

export function useUpdateDeal() {
  return useMutation({
    mutationFn: async ({ id, data }) => await dealsApi.update(id, data),
    onSuccess: () => {
      invalidate();
      queryClient.invalidateQueries({ queryKey: ['deal-notes'] });
      queryClient.invalidateQueries({ queryKey: ['deal-activity'] });
      toast.success('Deal updated');
    },
    onError: (e) => toast.error(errMsg(e, 'Failed to update deal')),
  });
}

export function useDeleteDeal() {
  return useMutation({
    mutationFn: async (id) => await dealsApi.remove(id),
    onSuccess: () => { invalidate(); toast.success('Deal deleted'); },
    onError: (e) => toast.error(errMsg(e, 'Failed to delete deal')),
  });
}

export function useAddDealNote() {
  return useMutation({
    mutationFn: async ({ dealId, content }) => await dealsApi.addNote(dealId, { content }),
    onSuccess: (_data, { dealId }) => {
      queryClient.invalidateQueries({ queryKey: ['deal-notes', dealId] });
      queryClient.invalidateQueries({ queryKey: ['deal-activity', dealId] });
      toast.success('Note added');
    },
    onError: (e) => toast.error(errMsg(e, 'Failed to add note')),
  });
}
