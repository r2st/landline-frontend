import { useQuery, useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { outreachApi, queryClient } from '../api/client';
import { mockSequences, mockOutreachEvents } from '../lib/mockData';

export function useSequences() {
  return useQuery({
    queryKey: ['sequences'],
    queryFn: async () => {
      try {
        return await outreachApi.getSequences();
      } catch (error) {
        console.warn('API unavailable, using mock data');
        return mockSequences;
      }
    },
  });
}

export function useOutreachEvents(companyId) {
  return useQuery({
    queryKey: ['outreach-events', companyId],
    queryFn: async () => {
      try {
        const params = companyId ? { company_id: companyId } : {};
        return await outreachApi.getEvents(params);
      } catch (error) {
        console.warn('API unavailable, using mock data');
        if (companyId) {
          return mockOutreachEvents.filter(
            (e) => String(e.company_id) === String(companyId)
          );
        }
        return mockOutreachEvents;
      }
    },
  });
}

export function useCreateSequence() {
  return useMutation({
    mutationFn: async (data) => {
      try {
        return await outreachApi.createSequence(data);
      } catch (error) {
        console.warn('API unavailable — demo mode');
        toast('Demo mode — changes not persisted', { icon: '⚠️' });
        return {
          id: Date.now(),
          ...data,
          stats: { enrolled: 0, sent: 0, opened: 0, replied: 0 },
          created_at: new Date().toISOString(),
        };
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sequences'] });
      toast.success('Sequence created successfully');
    },
    onError: (error) => {
      toast.error(error?.message || 'Failed to create sequence');
    },
  });
}

export function useEnrollCompany() {
  return useMutation({
    mutationFn: async (data) => {
      try {
        return await outreachApi.enrollCompany(data);
      } catch (error) {
        console.warn('API unavailable — demo mode');
        toast('Demo mode — changes not persisted', { icon: '⚠️' });
        return { ...data, enrolled: true };
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outreach-events'] });
      toast.success('Company enrolled in sequence');
    },
    onError: (error) => {
      toast.error(error?.message || 'Failed to enroll company');
    },
  });
}
