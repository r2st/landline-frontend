import { useMutation, useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { deliverabilityApi, queryClient } from '../api/client';

// Current per-account reputation. Like the danger-signals rail, this does NOT
// swallow a failed fetch into an empty list: a page whose whole job is to show
// which mailboxes are in trouble must not render "all healthy" when it actually
// failed to load. The error is surfaced so the page can say so.
export function useSenderHealth({ refetchInterval = 60000 } = {}) {
  return useQuery({
    queryKey: ['sender-health'],
    queryFn: () => deliverabilityApi.senders(),
    refetchInterval,
    retry: false,
  });
}

// Reputation trend per account over a window (days). History is a nice-to-have,
// not load-bearing, so this one degrades to an empty list — a missing trend
// should not blank out the whole page.
export function useSenderHistory({ days = 30 } = {}) {
  return useQuery({
    queryKey: ['sender-history', days],
    queryFn: async () => {
      try {
        const data = await deliverabilityApi.sendersHistory(days);
        return Array.isArray(data) ? data : [];
      } catch {
        return [];
      }
    },
    retry: false,
  });
}

// Force a fresh assessment of every account, then refetch both queries.
export function useAssessSenders() {
  return useMutation({
    mutationFn: () => deliverabilityApi.assess(),
    onSuccess: (res) => {
      toast.success(`Reassessed ${res?.accounts_assessed ?? 0} account${res?.accounts_assessed === 1 ? '' : 's'}`);
      queryClient.invalidateQueries({ queryKey: ['sender-health'] });
      queryClient.invalidateQueries({ queryKey: ['sender-history'] });
    },
    onError: (e) => toast.error(e?.response?.data?.detail || e?.message || 'Reassessment failed'),
  });
}
