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

// Enroll a single contact in a sequence. Pass { contact_id, sequence_id }.
export function useEnrollContact() {
  return useMutation({
    mutationFn: async (data) => {
      return await outreachApi.enrollContact(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outreach-events'] });
      queryClient.invalidateQueries({ queryKey: ['enrollments'] });
    },
    onError: (error) => {
      // 409 = already enrolled in that sequence; surface the backend message.
      toast.error(error?.response?.data?.detail || error?.message || 'Failed to enroll contact');
    },
  });
}

export function useUpdateSequenceStatus() {
  return useMutation({
    mutationFn: async ({ id, status }) => {
      return await outreachApi.updateSequenceStatus(id, status);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sequences'] });
      toast.success('Sequence status updated');
    },
    onError: (error) => {
      toast.error(error?.response?.data?.detail || error?.message || 'Failed to update sequence status');
    },
  });
}

export function useEnrollBatch() {
  return useMutation({
    mutationFn: async ({ sequenceId, contactIds }) => {
      return await outreachApi.enrollBatch(sequenceId, contactIds);
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['sequences'] });
      queryClient.invalidateQueries({ queryKey: ['outreach-events'] });
      const msg = `Enrolled ${res.enrolled_count} contact${res.enrolled_count !== 1 ? 's' : ''}${res.skipped_count ? ` (${res.skipped_count} skipped)` : ''}`;
      toast.success(msg);
    },
    onError: (error) => {
      toast.error(error?.response?.data?.detail || error?.message || 'Failed to enroll contacts');
    },
  });
}
