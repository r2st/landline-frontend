import { useMutation, useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { domainHealthApi, queryClient } from '../api/client';

// Every sending domain's auth + blacklist state. Errors surface: a domain whose
// SPF quietly broke and a dashboard that failed to load are the same picture if
// the failure degrades to an empty list.
export function useDomains() {
  return useQuery({
    queryKey: ['domain-health'],
    queryFn: () => domainHealthApi.list(),
    retry: false,
  });
}

export function useDomainDetail(domain) {
  return useQuery({
    queryKey: ['domain-health', domain],
    queryFn: () => domainHealthApi.detail(domain),
    enabled: Boolean(domain),
    retry: false,
  });
}

export function useRecheckDomain() {
  return useMutation({
    mutationFn: (domain) => domainHealthApi.recheck(domain),
    onSuccess: (data, domain) => {
      queryClient.invalidateQueries({ queryKey: ['domain-health'] });
      const delta =
        data?.previous_score != null ? data.health_score - data.previous_score : null;
      const move = delta ? ` (${delta > 0 ? '+' : ''}${delta})` : '';
      toast.success(`${domain} rechecked — ${data.health_score}/100${move}`);
    },
    onError: (e) => toast.error(e?.response?.data?.detail || e?.message || 'Recheck failed'),
  });
}
