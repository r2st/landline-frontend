import { useMutation, useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { referralAgentApi, queryClient } from '../api/client';

// The LLM models offered in the config dropdown — mirrors REFERRAL_LLM_MODELS in
// the backend, which validates the choice (an unknown value would 422).
export const REFERRAL_LLM_MODELS = [
  { id: 'meta-llama/llama-3.3-70b-instruct:free', label: 'Llama 3.3 70B (free)' },
  { id: 'openai/gpt-oss-20b:free', label: 'GPT-OSS 20B (free)' },
  { id: 'openai/gpt-oss-120b:free', label: 'GPT-OSS 120B (free)' },
  { id: 'google/gemma-3-27b-it:free', label: 'Gemma 3 27B (free)' },
];

// The referral lifecycle, in pipeline order.
export const REFERRAL_STAGES = [
  'identified',
  'asked',
  'pending',
  'received',
  'converted',
  'declined',
];

const CONFIG_KEY = ['referral-agent', 'config'];
const STATS_KEY = ['referral-agent', 'stats'];

// --- Config ---------------------------------------------------------------
export function useReferralConfig() {
  return useQuery({
    queryKey: CONFIG_KEY,
    queryFn: () => referralAgentApi.getConfig(),
    retry: false,
  });
}

export function useUpdateReferralConfig() {
  return useMutation({
    mutationFn: (data) => referralAgentApi.updateConfig(data),
    onSuccess: (config) => {
      queryClient.setQueryData(CONFIG_KEY, config);
      toast.success('Saved agent settings');
    },
    onError: (e) =>
      toast.error(e?.response?.data?.detail || e?.message || 'Could not save settings'),
  });
}

// --- Referrals ------------------------------------------------------------
export function useReferrals(params) {
  return useQuery({
    queryKey: ['referral-agent', 'referrals', params || null],
    queryFn: async () => {
      try {
        const data = await referralAgentApi.listReferrals(params);
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

function invalidateReferrals() {
  queryClient.invalidateQueries({ queryKey: ['referral-agent', 'referrals'] });
  queryClient.invalidateQueries({ queryKey: STATS_KEY });
}

export function useCreateReferral() {
  return useMutation({
    mutationFn: (data) => referralAgentApi.createReferral(data),
    onSuccess: () => {
      invalidateReferrals();
      toast.success('Referral added');
    },
    onError: (e) =>
      toast.error(e?.response?.data?.detail || e?.message || 'Could not add the referral'),
  });
}

export function useUpdateReferral() {
  return useMutation({
    mutationFn: ({ id, data }) => referralAgentApi.updateReferral(id, data),
    onSuccess: () => {
      invalidateReferrals();
      toast.success('Referral updated');
    },
    onError: (e) =>
      toast.error(e?.response?.data?.detail || e?.message || 'Could not update the referral'),
  });
}

// --- Actions --------------------------------------------------------------
export function useReferralActions(params) {
  return useQuery({
    queryKey: ['referral-agent', 'actions', params || null],
    queryFn: async () => {
      try {
        const data = await referralAgentApi.listActions(params);
        return Array.isArray(data) ? data : [];
      } catch {
        return [];
      }
    },
    refetchInterval: 20000,
    keepPreviousData: true,
    retry: false,
  });
}

function invalidateActions() {
  queryClient.invalidateQueries({ queryKey: ['referral-agent', 'actions'] });
  invalidateReferrals();
}

export function useApproveAction() {
  return useMutation({
    mutationFn: (id) => referralAgentApi.approveAction(id),
    onSuccess: (res) => {
      invalidateActions();
      const status = res?.send_status;
      if (status === 'sent') toast.success('Sent');
      else if (status === 'halted') toast.error('Sending is paused (kill switch)');
      else toast(`Not sent: ${res?.detail || status || 'unknown'}`, { icon: '⚠️' });
    },
    onError: (e) =>
      toast.error(e?.response?.data?.detail || e?.message || 'Could not approve the action'),
  });
}

export function useDismissAction() {
  return useMutation({
    mutationFn: (id) => referralAgentApi.dismissAction(id),
    onSuccess: () => {
      invalidateActions();
      toast.success('Dismissed');
    },
    onError: (e) =>
      toast.error(e?.response?.data?.detail || e?.message || 'Could not dismiss the action'),
  });
}

// --- Stats ----------------------------------------------------------------
export function useReferralStats() {
  return useQuery({
    queryKey: STATS_KEY,
    queryFn: () => referralAgentApi.getStats(),
    refetchInterval: 30000,
    retry: false,
  });
}
