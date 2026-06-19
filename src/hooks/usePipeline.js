import { useQuery, useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { pipelineApi, queryClient } from '../api/client';

export function usePipeline(filters = {}) {
  return useQuery({
    queryKey: ['pipeline', filters],
    queryFn: async () => {
      const data = await pipelineApi.getPipeline(filters);
      return data;
    },
  });
}

export function useTransitionStage() {
  return useMutation({
    mutationFn: async ({ id, stage }) => {
      return await pipelineApi.transitionStage(id, stage);
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['pipeline'] });
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      toast.success(`Stage updated to ${result.stage}`);
    },
    onError: (error) => {
      toast.error(error?.response?.data?.detail || error?.message || 'Failed to transition stage');
    },
  });
}
