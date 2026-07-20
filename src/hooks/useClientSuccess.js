import { useMutation, useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { clientSuccessAgentApi, queryClient } from '../api/client';

// The OpenRouter models offered in the config dropdown. Free-tier ids so the
// agent runs at zero cost; mirrors LLM_MODEL_OPTIONS on the backend. A custom
// id typed in still works — the backend accepts any string.
export const LLM_MODEL_OPTIONS = [
  { value: 'meta-llama/llama-3.3-70b-instruct:free', label: 'Llama 3.3 70B (free)' },
  { value: 'openai/gpt-oss-20b:free', label: 'GPT-OSS 20B (free)' },
  { value: 'openai/gpt-oss-120b:free', label: 'GPT-OSS 120B (free)' },
  { value: 'google/gemma-3-27b-it:free', label: 'Gemma 3 27B (free)' },
];

// Human-readable metadata for each action type — label, tint, and a one-line
// gloss for the queue.
export const ACTION_META = {
  checkin: { label: 'Check-in', color: 'blue', hint: 'A warm nudge to a cooling client.' },
  escalation: { label: 'Escalation', color: 'red', hint: 'Manager intervention needed.' },
  review_call: { label: 'Review call', color: 'purple', hint: 'Suggest booking a review call.' },
  celebration: { label: 'Celebration', color: 'green', hint: 'Congratulate a client win.' },
};

export function useAgentConfig() {
  return useQuery({
    queryKey: ['client-success-config'],
    queryFn: () => clientSuccessAgentApi.getConfig(),
    retry: false,
  });
}

export function useUpdateAgentConfig() {
  return useMutation({
    mutationFn: (body) => clientSuccessAgentApi.updateConfig(body),
    onSuccess: (config) => {
      queryClient.setQueryData(['client-success-config'], config);
      toast.success('Saved agent settings');
    },
    onError: (e) =>
      toast.error(e?.response?.data?.detail || e?.message || 'Could not save settings'),
  });
}

// The pending (and, when filtered, historical) action queue. Errors surface
// rather than degrading to an empty list — "nothing pending" and "the queue is
// down" must not look the same.
export function useAgentActions({ status, action_type, limit = 100 } = {}) {
  return useQuery({
    queryKey: ['client-success-actions', { status, action_type, limit }],
    queryFn: () => clientSuccessAgentApi.listActions({ status, action_type, limit }),
    keepPreviousData: true,
    refetchInterval: 60000,
    retry: false,
  });
}

function invalidateActions() {
  queryClient.invalidateQueries({ queryKey: ['client-success-actions'] });
  queryClient.invalidateQueries({ queryKey: ['client-success-stats'] });
}

export function useApproveAction() {
  return useMutation({
    mutationFn: (id) => clientSuccessAgentApi.approveAction(id),
    onSuccess: () => {
      invalidateActions();
      toast.success('Approved');
    },
    onError: (e) =>
      toast.error(e?.response?.data?.detail || e?.message || 'Could not approve'),
  });
}

export function useDismissAction() {
  return useMutation({
    mutationFn: (id) => clientSuccessAgentApi.dismissAction(id),
    onSuccess: () => {
      invalidateActions();
      toast.success('Dismissed');
    },
    onError: (e) =>
      toast.error(e?.response?.data?.detail || e?.message || 'Could not dismiss'),
  });
}

export function useAgentStats() {
  return useQuery({
    queryKey: ['client-success-stats'],
    queryFn: () => clientSuccessAgentApi.stats(),
    retry: false,
  });
}

export function useClientHealthOverview() {
  return useQuery({
    queryKey: ['client-success-health'],
    queryFn: () => clientSuccessAgentApi.healthOverview(),
    retry: false,
  });
}
