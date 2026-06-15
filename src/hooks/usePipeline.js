import { useQuery, useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { pipelineApi, queryClient } from '../api/client';
import { mockPipelineData } from '../lib/mockData';

export function usePipeline(filters = {}) {
  return useQuery({
    queryKey: ['pipeline', filters],
    queryFn: async () => {
      try {
        const data = await pipelineApi.getPipeline(filters);
        return data;
      } catch (error) {
        console.warn('API unavailable, using mock data');
        if (!filters || Object.keys(filters).length === 0) {
          return mockPipelineData;
        }
        const result = {};
        for (const [stage, companies] of Object.entries(mockPipelineData)) {
          let filtered = [...companies];
          if (filters.country) {
            filtered = filtered.filter((c) => c.country === filters.country);
          }
          if (filters.source) {
            filtered = filtered.filter((c) => c.source === filters.source);
          }
          if (filters.scoreMin != null) {
            filtered = filtered.filter((c) => c.score >= Number(filters.scoreMin));
          }
          if (filters.scoreMax != null) {
            filtered = filtered.filter((c) => c.score <= Number(filters.scoreMax));
          }
          result[stage] = filtered;
        }
        return result;
      }
    },
  });
}

export function useTransitionStage() {
  return useMutation({
    mutationFn: async ({ id, stage }) => {
      try {
        return await pipelineApi.transitionStage(id, stage);
      } catch (error) {
        console.warn('API unavailable — demo mode');
        toast('Demo mode — changes not persisted', { icon: '⚠️' });
        return { id, stage };
      }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['pipeline'] });
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      toast.success(`Stage updated to ${result.stage}`);
    },
    onError: (error) => {
      toast.error(error?.message || 'Failed to transition stage');
    },
  });
}
