import { useMutation, useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { socialListeningApi, queryClient } from '../api/client';

// The LLM models the backend accepts (mirrors ALLOWED_LLM_MODELS in the API).
// The config response also echoes `available_models`, which the form prefers;
// this is the fallback so the dropdown is never empty on a slow/failed load.
export const LLM_MODELS = [
  'meta-llama/llama-3.3-70b-instruct:free',
  'openai/gpt-oss-20b:free',
  'openai/gpt-oss-120b:free',
  'google/gemma-3-27b-it:free',
];

// The AI-classified signal types (mirrors SIGNAL_TYPES in the API).
export const SIGNAL_TYPES = [
  'funding',
  'hiring',
  'expansion',
  'leadership_change',
  'product_launch',
  'partnership',
];

// --- Config ------------------------------------------------------------------

export function useAgentConfig() {
  return useQuery({
    queryKey: ['social-listening', 'config'],
    queryFn: () => socialListeningApi.getConfig(),
    retry: false,
  });
}

export function useUpdateAgentConfig() {
  return useMutation({
    mutationFn: (data) => socialListeningApi.updateConfig(data),
    onSuccess: (config) => {
      queryClient.setQueryData(['social-listening', 'config'], config);
      toast.success('Settings saved');
    },
    onError: (e) => toast.error(e?.response?.data?.detail || e?.message || 'Could not save settings'),
  });
}

// --- Signals -----------------------------------------------------------------

// The signal feed. Filters are passed straight through to the API. Degrades to
// an empty list so a backend hiccup doesn't blank the whole feed.
export function useSignals(filters = {}) {
  const params = Object.fromEntries(
    Object.entries(filters).filter(([, v]) => v !== '' && v != null)
  );
  return useQuery({
    queryKey: ['social-listening', 'signals', params],
    queryFn: async () => {
      try {
        const data = await socialListeningApi.listSignals(params);
        return Array.isArray(data) ? data : [];
      } catch {
        return [];
      }
    },
    keepPreviousData: true,
    retry: false,
  });
}

function invalidateSignals() {
  queryClient.invalidateQueries({ queryKey: ['social-listening', 'signals'] });
  queryClient.invalidateQueries({ queryKey: ['social-listening', 'stats'] });
}

export function useActionSignal() {
  return useMutation({
    mutationFn: (id) => socialListeningApi.actionSignal(id),
    onSuccess: (res) => {
      invalidateSignals();
      toast.success(res?.detail || 'Warm lead created');
    },
    onError: (e) => toast.error(e?.response?.data?.detail || e?.message || 'Could not create lead'),
  });
}

export function useDismissSignal() {
  return useMutation({
    mutationFn: (id) => socialListeningApi.dismissSignal(id),
    onSuccess: () => {
      invalidateSignals();
      toast.success('Signal dismissed');
    },
    onError: (e) => toast.error(e?.response?.data?.detail || e?.message || 'Could not dismiss'),
  });
}

// --- Monitored companies -----------------------------------------------------

export function useMonitoredCompanies() {
  return useQuery({
    queryKey: ['social-listening', 'monitored'],
    queryFn: async () => {
      try {
        const data = await socialListeningApi.listMonitored();
        return Array.isArray(data) ? data : [];
      } catch {
        return [];
      }
    },
    retry: false,
  });
}

function invalidateMonitored() {
  queryClient.invalidateQueries({ queryKey: ['social-listening', 'monitored'] });
}

export function useAddMonitoredCompany() {
  return useMutation({
    mutationFn: (data) => socialListeningApi.addMonitored(data),
    onSuccess: () => {
      invalidateMonitored();
      toast.success('Now monitoring');
    },
    onError: (e) => toast.error(e?.response?.data?.detail || e?.message || 'Could not add company'),
  });
}

export function useRemoveMonitoredCompany() {
  return useMutation({
    mutationFn: (id) => socialListeningApi.removeMonitored(id),
    onSuccess: () => {
      invalidateMonitored();
      toast.success('Stopped monitoring');
    },
    onError: (e) => toast.error(e?.response?.data?.detail || e?.message || 'Could not remove'),
  });
}

// --- Stats + manual scan -----------------------------------------------------

export function useSignalStats() {
  return useQuery({
    queryKey: ['social-listening', 'stats'],
    queryFn: () => socialListeningApi.getStats(),
    retry: false,
  });
}

export function useScanNow() {
  return useMutation({
    mutationFn: () => socialListeningApi.scanNow(),
    onSuccess: (res) => {
      invalidateSignals();
      if (res?.skipped) {
        toast(res?.reason === 'agent inactive'
          ? 'Turn the agent on to scan'
          : 'Scan skipped');
      } else {
        toast.success(`Scan complete — ${res?.signals_found ?? 0} new signal${res?.signals_found === 1 ? '' : 's'}`);
      }
    },
    onError: (e) => toast.error(e?.response?.data?.detail || e?.message || 'Scan failed'),
  });
}
