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
    // The inbox is a live queue — keep it fresh without a manual "Sync" click.
    // Poll every 60s and re-fetch when the operator returns to the tab, matching
    // the Dialtone reply queue (useDialtoneInbox). Aligns with the audit's
    // no-auto-refresh finding.
    refetchInterval: 60000,
    refetchOnWindowFocus: true,
  });
}

// Lightweight "needs reply" count for the sidebar / bell badge. Reuses the
// existing needs_reply filter and reads only the total, so it's a cheap poll.
// Fails soft to 0 so a hiccup never renders a broken badge.
export function useInboxUnread() {
  const { data } = useQuery({
    queryKey: ['inbox-unread'],
    queryFn: async () => {
      try {
        const res = await emailHistoryApi.getInbox({
          page: 1,
          per_page: 1,
          filter: 'needs_reply',
        });
        return res?.total || 0;
      } catch {
        return 0;
      }
    },
    staleTime: 60000,
    refetchInterval: 60000,
    retry: false,
  });
  return data || 0;
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

// Conversation Intelligence for a thread — momentum, objections, recommended
// action, suggested next message. Lazy: only fetched when `enabled`.
export function useThreadIntelligence(threadId, { enabled = false } = {}) {
  return useQuery({
    queryKey: ['thread-intelligence', threadId],
    queryFn: () => emailHistoryApi.getThreadIntelligence(threadId),
    enabled: !!threadId && enabled,
    staleTime: 5 * 60 * 1000,
  });
}

// Mark a single thread read/unread (P0-1). Invalidates the inbox so the unread
// dot clears without a manual refresh.
export function useMarkThreadRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ threadId, read = true }) =>
      read
        ? emailHistoryApi.markThreadRead(threadId)
        : emailHistoryApi.markThreadUnread(threadId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['email-inbox'] }),
  });
}

// Archive / unarchive a single thread (P0-2).
export function useArchiveThread() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ threadId, archived = true }) =>
      archived
        ? emailHistoryApi.archiveThread(threadId)
        : emailHistoryApi.unarchiveThread(threadId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['email-inbox'] }),
  });
}

// Bulk mark-read / archive / snooze across a selection of threads (P1-3).
// `value` controls the direction so the same mutation can undo itself
// (mark-unread / unarchive); it defaults to true (the forward action). For
// snooze, `value` carries the ISO snoozed_until (or null to un-snooze).
export function useBulkThreadAction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ action, threadIds, value = true }) => {
      if (action === 'read') return emailHistoryApi.bulkMarkRead(threadIds, value);
      if (action === 'archive') return emailHistoryApi.bulkArchive(threadIds, value);
      if (action === 'snooze') return emailHistoryApi.bulkSnooze(threadIds, value);
      throw new Error(`Unknown bulk action: ${action}`);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['email-inbox'] }),
  });
}

// Snooze / un-snooze a single thread. `snoozedUntil` is an ISO string, or null
// to un-snooze. The thread drops out of the default view until that time.
export function useSnoozeThread() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ threadId, snoozedUntil }) =>
      snoozedUntil
        ? emailHistoryApi.snoozeThread(threadId, snoozedUntil)
        : emailHistoryApi.unsnoozeThread(threadId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['email-inbox'] }),
  });
}

// The caller's inbox labels (with per-label thread counts). Fails soft to an
// empty list so a hiccup never breaks the inbox chrome.
export function useInboxLabels() {
  return useQuery({
    queryKey: ['inbox-labels'],
    queryFn: async () => {
      try {
        return (await emailHistoryApi.listLabels()) || [];
      } catch {
        return [];
      }
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}

// Create / update / delete a label. Invalidates the label list and the inbox
// (labels render as chips on threads).
export function useLabelMutations() {
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['inbox-labels'] });
    qc.invalidateQueries({ queryKey: ['email-inbox'] });
  };
  const create = useMutation({
    mutationFn: ({ name, color }) => emailHistoryApi.createLabel(name, color),
    onSuccess: invalidate,
  });
  const update = useMutation({
    mutationFn: ({ labelId, patch }) => emailHistoryApi.updateLabel(labelId, patch),
    onSuccess: invalidate,
  });
  const remove = useMutation({
    mutationFn: ({ labelId }) => emailHistoryApi.deleteLabel(labelId),
    onSuccess: invalidate,
  });
  return { create, update, remove };
}

// Attach / detach a label on a thread.
export function useThreadLabel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ threadId, labelId, attached }) =>
      attached
        ? emailHistoryApi.addThreadLabel(threadId, labelId)
        : emailHistoryApi.removeThreadLabel(threadId, labelId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['email-inbox'] });
      qc.invalidateQueries({ queryKey: ['inbox-labels'] });
    },
  });
}

// Mailbox analytics (volume, response time, intent breakdown). Fails soft.
export function useInboxAnalytics(days = 30) {
  return useQuery({
    queryKey: ['inbox-analytics', days],
    queryFn: async () => {
      try {
        return await emailHistoryApi.getAnalytics(days);
      } catch {
        return null;
      }
    },
    staleTime: 5 * 60 * 1000,
    refetchInterval: 120000,
    retry: false,
  });
}
