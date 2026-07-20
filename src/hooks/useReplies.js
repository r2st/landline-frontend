import { useMutation, useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { queryClient, repliesApi, smartReplyApi } from '../api/client';

// Dialtone's intent-classified reply queue. Errors are surfaced rather than
// folded into an empty list: "no hot leads" and "the inbox is broken" are very
// different days, and the older hooks' `catch { return [] }` made them
// pixel-identical.
export function useDialtoneInbox({ category, priorityOnly, unreadOnly, page = 1, pageSize = 50 } = {}) {
  return useQuery({
    queryKey: ['dialtone-inbox', { category, priorityOnly, unreadOnly, page, pageSize }],
    queryFn: () =>
      repliesApi.inbox({
        category: category || undefined,
        priority_only: priorityOnly || undefined,
        unread_only: unreadOnly || undefined,
        page,
        page_size: pageSize,
      }),
    keepPreviousData: true,
    refetchInterval: 60000,
    retry: false,
  });
}

export function useInboxStats() {
  return useQuery({
    queryKey: ['dialtone-inbox-stats'],
    queryFn: () => repliesApi.stats(),
    refetchInterval: 60000,
    retry: false,
  });
}

// Full detail for one reply. The server lazily drafts a suggested response for
// `interested` replies, which is the expensive part — so this is only fetched
// when a reply is actually opened, never for the list.
export function useReplyDetail(replyId) {
  return useQuery({
    queryKey: ['dialtone-reply', replyId],
    queryFn: () => repliesApi.detail(replyId),
    enabled: Boolean(replyId),
    retry: false,
  });
}

function invalidateInbox() {
  queryClient.invalidateQueries({ queryKey: ['dialtone-inbox'] });
  queryClient.invalidateQueries({ queryKey: ['dialtone-inbox-stats'] });
}

// An operator override is also a training signal — the backend records the
// correction and re-runs the auto-action for the new category.
export function useReclassifyReply() {
  return useMutation({
    mutationFn: ({ replyId, category, priorityFlag }) =>
      repliesApi.reclassify(replyId, { category, priorityFlag }),
    onSuccess: (data, { replyId }) => {
      queryClient.setQueryData(['dialtone-reply', replyId], data);
      invalidateInbox();
      toast.success('Reclassified');
    },
    onError: (e) => toast.error(e?.response?.data?.detail || e?.message || 'Could not reclassify'),
  });
}

export function useMarkReplyRead() {
  return useMutation({
    mutationFn: (replyId) => repliesApi.markRead(replyId),
    onSuccess: () => invalidateInbox(),
    // Silent: marking read is incidental to opening a reply, and a toast for it
    // would fire on every click.
  });
}

// Approve-and-send: dispatch the (possibly operator-edited) suggested reply.
// Unlike reclassify/markRead this actually leaves the building, so it refreshes
// the reply detail (which now carries the sent state) as well as the inbox.
export function useSendSmartReply() {
  return useMutation({
    mutationFn: ({ replyId, subject, body }) =>
      smartReplyApi.send({ replyId, subject, body }),
    onSuccess: (data, { replyId }) => {
      queryClient.invalidateQueries({ queryKey: ['dialtone-reply', replyId] });
      invalidateInbox();
      toast.success('Reply sent');
    },
    onError: (e) => toast.error(e?.response?.data?.detail || e?.message || 'Could not send reply'),
  });
}
