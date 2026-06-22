import { useQuery, useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { pipelineApi, queryClient } from '../api/client';
import { STAGES } from '../lib/constants';
import { normalizePipelineItem } from '../lib/normalize';

// Fetch the pipeline as a flat scored list and group it into stage columns.
// country + min score are filtered server-side; max score + source client-side.
export function usePipeline(filters = {}) {
  return useQuery({
    queryKey: ['pipeline', filters],
    queryFn: async () => {
      const params = { page_size: 200 };
      if (filters.country) params.country = filters.country;
      if (filters.scoreMin) params.min_score = Number(filters.scoreMin);

      const data = await pipelineApi.getPipeline(params);
      const items = (data.items || []).map(normalizePipelineItem);

      const maxScore = filters.scoreMax ? Number(filters.scoreMax) : null;
      const source = filters.source || null;
      const filtered = items.filter((c) => {
        if (maxScore != null && (c.score ?? 0) > maxScore) return false;
        if (source && c.source !== source) return false;
        return true;
      });

      const grouped = {};
      for (const stage of STAGES) grouped[stage] = [];
      for (const c of filtered) {
        if (grouped[c.stage]) grouped[c.stage].push(c);
      }
      return grouped;
    },
  });
}

export function useTransitionStage() {
  return useMutation({
    mutationFn: async ({ id, stage }) => {
      return await pipelineApi.transitionStage(id, stage);
    },
    // Optimistically move the card between columns so drag-and-drop feels
    // instant. Snapshot every cached pipeline view (the key carries filters)
    // so we can roll back if the request fails.
    onMutate: async ({ id, stage }) => {
      await queryClient.cancelQueries({ queryKey: ['pipeline'] });
      const snapshots = queryClient.getQueriesData({ queryKey: ['pipeline'] });
      queryClient.setQueriesData({ queryKey: ['pipeline'] }, (grouped) => {
        if (!grouped) return grouped;
        let moved = null;
        const next = {};
        for (const [s, list] of Object.entries(grouped)) {
          const keep = [];
          for (const c of list) {
            if (String(c.id) === String(id)) moved = c;
            else keep.push(c);
          }
          next[s] = keep;
        }
        if (moved && next[stage]) next[stage] = [{ ...moved, stage }, ...next[stage]];
        return next;
      });
      return { snapshots };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      queryClient.invalidateQueries({ queryKey: ['company', result?.id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
      toast.success(`Moved to ${result.stage}`);
    },
    onError: (error, _vars, context) => {
      for (const [key, data] of context?.snapshots || []) {
        queryClient.setQueryData(key, data);
      }
      toast.error(error?.response?.data?.detail || error?.message || 'Failed to transition stage');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['pipeline'] });
    },
  });
}
