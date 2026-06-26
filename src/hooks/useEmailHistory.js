import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { emailHistoryApi } from '../api/client';

export function useLeadEmails(companyId, params = {}) {
  return useQuery({
    queryKey: ['lead-emails', companyId, params],
    queryFn: () => emailHistoryApi.getLeadEmails(companyId, params),
    enabled: !!companyId,
  });
}

export function useEmailInbox(params = {}) {
  return useQuery({
    queryKey: ['email-inbox', params],
    queryFn: () => emailHistoryApi.getInbox(params),
  });
}

export function useEmailThread(threadId) {
  return useQuery({
    queryKey: ['email-thread', threadId],
    queryFn: () => emailHistoryApi.getThread(threadId),
    enabled: !!threadId,
  });
}

export function useSendReply() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ emailId, data }) => emailHistoryApi.sendReply(emailId, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['email-inbox'] });
      qc.invalidateQueries({ queryKey: ['lead-emails'] });
      qc.invalidateQueries({ queryKey: ['email-thread'] });
    },
  });
}

export function useTriggerSync() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => emailHistoryApi.triggerSync(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['email-inbox'] });
      qc.invalidateQueries({ queryKey: ['lead-emails'] });
    },
  });
}
