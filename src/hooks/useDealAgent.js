import { useMutation, useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { dealAgentApi, queryClient } from '../api/client';

// The five pipeline stages the staleness thresholds are keyed by, in order.
// Mirrors STAGE_ORDER on the backend so the config form always offers every
// stage even before the agent has stored a per-stage value.
export const DEAL_STAGES = [
  'qualification',
  'discovery',
  'proposal',
  'negotiation',
  'closing',
];

// The action types the agent produces, with UI-friendly labels.
export const ACTION_TYPE_META = {
  auto_followup: { label: 'Follow-up', hint: 'A drafted email ready to send' },
  suggestion: { label: 'Suggestion', hint: 'A recommended next step' },
  stage_change: { label: 'Stage advance', hint: 'Moved the deal forward' },
  at_risk_flag: { label: 'At risk', hint: 'Flagged for attention' },
  escalation: { label: 'Escalation', hint: 'Raised to a manager' },
};

// Curated OpenRouter free-tier models for the config dropdown. The backend
// returns its own `llm_model_choices` on the config, which the UI prefers; this
// is the fallback list (and the source for labels).
export const LLM_MODELS = [
  { id: 'meta-llama/llama-3.3-70b-instruct:free', label: 'Llama 3.3 70B (free)' },
  { id: 'openai/gpt-oss-20b:free', label: 'GPT-OSS 20B (free)' },
  { id: 'openai/gpt-oss-120b:free', label: 'GPT-OSS 120B (free)' },
  { id: 'google/gemma-3-27b-it:free', label: 'Gemma 3 27B (free)' },
];

// Human-readable label for a model id (falls back to the id itself).
export function llmModelLabel(id) {
  return LLM_MODELS.find((m) => m.id === id)?.label || id;
}

export const ACTION_STATUSES = [
  'pending',
  'approved',
  'executed',
  'dismissed',
  'expired',
];

// Agent config (per org). The GET creates a default on first read, so this
// always resolves to a config object.
export function useDealAgentConfig() {
  return useQuery({
    queryKey: ['deal-agent-config'],
    queryFn: () => dealAgentApi.getConfig(),
    retry: false,
  });
}

export function useUpdateDealAgentConfig() {
  return useMutation({
    mutationFn: (data) => dealAgentApi.updateConfig(data),
    onSuccess: (config) => {
      queryClient.setQueryData(['deal-agent-config'], config);
      toast.success('Agent settings saved');
    },
    onError: (e) =>
      toast.error(e?.response?.data?.detail || e?.message || 'Could not save settings'),
  });
}

// The action queue / activity feed. Degrades to an empty list so the page always
// renders. `params` narrows by type / status / deal.
export function useDealActions(params) {
  return useQuery({
    queryKey: ['deal-agent-actions', params || {}],
    queryFn: async () => {
      try {
        const data = await dealAgentApi.listActions(params);
        return Array.isArray(data) ? data : [];
      } catch {
        return [];
      }
    },
    refetchInterval: 30000,
    keepPreviousData: true,
    retry: false,
  });
}

export function useDealAgentStats() {
  return useQuery({
    queryKey: ['deal-agent-stats'],
    queryFn: async () => {
      try {
        return await dealAgentApi.stats();
      } catch {
        return null;
      }
    },
    refetchInterval: 30000,
    retry: false,
  });
}

function invalidateActions() {
  queryClient.invalidateQueries({ queryKey: ['deal-agent-actions'] });
  queryClient.invalidateQueries({ queryKey: ['deal-agent-stats'] });
}

export function useApproveAction() {
  return useMutation({
    mutationFn: (id) => dealAgentApi.approveAction(id),
    onSuccess: () => {
      invalidateActions();
      toast.success('Action approved');
    },
    onError: (e) =>
      toast.error(e?.response?.data?.detail || e?.message || 'Could not approve the action'),
  });
}

export function useDismissAction() {
  return useMutation({
    mutationFn: (id) => dealAgentApi.dismissAction(id),
    onSuccess: () => {
      invalidateActions();
      toast.success('Action dismissed');
    },
    onError: (e) =>
      toast.error(e?.response?.data?.detail || e?.message || 'Could not dismiss the action'),
  });
}
