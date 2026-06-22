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

function invalidate() {
  queryClient.invalidateQueries({ queryKey: ['deals'] });
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
    onSuccess: () => { invalidate(); toast.success('Deal updated'); },
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
