import { useQuery, useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { outreachApi, queryClient } from '../api/client';

export function useSequences() {
  return useQuery({
    queryKey: ['sequences'],
    queryFn: async () => {
      return await outreachApi.getSequences();
    },
  });
}

export function useOutreachEvents(companyId) {
  return useQuery({
    queryKey: ['outreach-events', companyId],
    queryFn: async () => {
      const params = companyId ? { company_id: companyId } : {};
      return await outreachApi.getEvents(params);
    },
  });
}

export function useCreateSequence() {
  return useMutation({
    mutationFn: async (data) => {
      return await outreachApi.createSequence(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sequences'] });
      toast.success('Sequence created successfully');
    },
    onError: (error) => {
      toast.error(error?.response?.data?.detail || error?.message || 'Failed to create sequence');
    },
  });
}

export function useEnrollCompany() {
  return useMutation({
    mutationFn: async (data) => {
      return await outreachApi.enrollCompany(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outreach-events'] });
      toast.success('Company enrolled in sequence');
    },
    onError: (error) => {
      toast.error(error?.response?.data?.detail || error?.message || 'Failed to enroll company');
    },
  });
}
