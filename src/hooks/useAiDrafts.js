import { useMutation, useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { aiDraftsApi, queryClient } from '../api/client';

// The human gate on AI-composed first touches. Errors surface rather than
// degrade to an empty queue: "nothing to review" and "the queue is down" must
// not look the same, because the first means the agent is free to send.
export function useAiDrafts({ status = 'pending', limit = 50 } = {}) {
  return useQuery({
    queryKey: ['ai-drafts', { status, limit }],
    queryFn: () => aiDraftsApi.list({ status, limit }),
    keepPreviousData: true,
    refetchInterval: 60000,
    retry: false,
  });
}

// Approve SENDS the AI's copy; reject sends the static template instead. Both
// are outward-facing, so both invalidate anything showing outreach state.
function invalidateDrafts() {
  queryClient.invalidateQueries({ queryKey: ['ai-drafts'] });
  queryClient.invalidateQueries({ queryKey: ['dialtone-console'] });
  queryClient.invalidateQueries({ queryKey: ['dialtone-activity'] });
}

export function useReviewDraft() {
  return useMutation({
    mutationFn: ({ draftId, decision, notes }) =>
      decision === 'approve'
        ? aiDraftsApi.approve(draftId, notes ? { notes } : {})
        : aiDraftsApi.reject(draftId, notes ? { notes } : {}),
    onSuccess: (_res, { decision }) => {
      invalidateDrafts();
      toast.success(
        decision === 'approve'
          ? "Approved — the AI's copy is on its way"
          : 'Rejected — the static template will be sent instead'
      );
    },
    onError: (e) =>
      toast.error(e?.response?.data?.detail || e?.message || 'Could not review this draft'),
  });
}
