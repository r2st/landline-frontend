import { useQuery, useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { interactionsApi, queryClient } from '../api/client';

function errMsg(e, fallback) {
  return e?.response?.data?.detail || e?.message || fallback;
}

function asArray(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  return [];
}

// Logged interactions (meetings, calls, notes) for a company. Empty on failure.
export function useCompanyInteractions(companyId) {
  return useQuery({
    queryKey: ['interactions', { company_id: companyId }],
    queryFn: async () => {
      try {
        return asArray(await interactionsApi.getByCompany(companyId));
      } catch {
        return [];
      }
    },
    enabled: !!companyId,
    retry: false,
  });
}

function invalidate() {
  queryClient.invalidateQueries({ queryKey: ['interactions'] });
  queryClient.invalidateQueries({ queryKey: ['company-health'] });
}

export function useCreateInteraction() {
  return useMutation({
    mutationFn: async (data) => await interactionsApi.create(data),
    onSuccess: () => { invalidate(); toast.success('Interaction logged'); },
    onError: (e) => toast.error(errMsg(e, 'Failed to log interaction')),
  });
}

export function useDeleteInteraction() {
  return useMutation({
    mutationFn: async (id) => await interactionsApi.remove(id),
    onSuccess: () => { invalidate(); toast.success('Interaction deleted'); },
    onError: (e) => toast.error(errMsg(e, 'Failed to delete interaction')),
  });
}
