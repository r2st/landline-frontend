import { useQuery, useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { followUpsApi, queryClient } from '../api/client';

function errMsg(e, fallback) {
  return e?.response?.data?.detail || e?.message || fallback;
}

export function useFollowUps(filters = {}) {
  return useQuery({
    queryKey: ['follow-ups', filters],
    queryFn: async () => {
      const data = await followUpsApi.list(filters);
      return Array.isArray(data) ? data : [];
    },
  });
}

export function useStaleContacts(days = 30) {
  return useQuery({
    queryKey: ['stale-contacts', days],
    queryFn: async () => {
      const data = await followUpsApi.staleContacts({ days });
      return Array.isArray(data) ? data : [];
    },
  });
}

function invalidate() {
  queryClient.invalidateQueries({ queryKey: ['follow-ups'] });
  queryClient.invalidateQueries({ queryKey: ['stale-contacts'] });
}

export function useCreateFollowUp() {
  return useMutation({
    mutationFn: async (data) => await followUpsApi.create(data),
    onSuccess: () => {
      invalidate();
      toast.success('Follow-up scheduled');
    },
    onError: (e) => toast.error(errMsg(e, 'Failed to schedule follow-up')),
  });
}

export function useUpdateFollowUp() {
  return useMutation({
    mutationFn: async ({ id, data }) => await followUpsApi.update(id, data),
    onSuccess: (_r, variables) => {
      invalidate();
      const status = variables?.data?.status;
      toast.success(
        status === 'completed' ? 'Follow-up completed'
          : status === 'dismissed' ? 'Follow-up dismissed'
          : 'Follow-up updated'
      );
    },
    onError: (e) => toast.error(errMsg(e, 'Failed to update follow-up')),
  });
}

export function useDeleteFollowUp() {
  return useMutation({
    mutationFn: async (id) => await followUpsApi.remove(id),
    onSuccess: () => {
      invalidate();
      toast.success('Follow-up deleted');
    },
    onError: (e) => toast.error(errMsg(e, 'Failed to delete follow-up')),
  });
}
