import { useMutation, useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { prospectingApi, queryClient } from '../api/client';

// The disposition a candidate is stored under, keyed by what a reviewer calls
// it. Approving writes 'enrolled' — "approved" is not a status the API knows.
export const QUEUE_STATUSES = {
  pending: 'review',
  approved: 'enrolled',
  rejected: 'rejected',
};

function invalidateQueue() {
  queryClient.invalidateQueries({ queryKey: ['prospect-candidates'] });
  queryClient.invalidateQueries({ queryKey: ['prospecting-runs'] });
  // An approval enrols the company and moves it to `researching`, so anything
  // showing companies or top leads is now stale.
  queryClient.invalidateQueries({ queryKey: ['companies'] });
  queryClient.invalidateQueries({ queryKey: ['top-leads'] });
}

// Candidates for one disposition. `params` = { status, sort, order, limit }.
// Sorting is the server's job: `limit` truncates, so re-sorting the page here
// would only reorder the top `limit` by fit rather than show the newest.
export function useProspectCandidates({ status = 'review', sort = 'fit_score', order = 'desc', limit = 100 } = {}) {
  return useQuery({
    queryKey: ['prospect-candidates', { status, sort, order, limit }],
    queryFn: async () => {
      try {
        const data = await prospectingApi.reviewQueue({ status, sort, order, limit });
        return Array.isArray(data) ? data : [];
      } catch {
        return [];
      }
    },
    keepPreviousData: true,
    retry: false,
  });
}

export function useProspectingRuns(limit = 25) {
  return useQuery({
    queryKey: ['prospecting-runs', limit],
    queryFn: async () => {
      try {
        const data = await prospectingApi.runs({ limit });
        return Array.isArray(data) ? data : [];
      } catch {
        return [];
      }
    },
    retry: false,
  });
}

export function useProspectingIcp() {
  return useQuery({
    queryKey: ['prospecting-icp'],
    queryFn: async () => {
      try {
        return await prospectingApi.icp();
      } catch {
        return null;
      }
    },
    retry: false,
  });
}

export function useReviewCandidate() {
  return useMutation({
    mutationFn: async ({ id, decision, reviewer }) =>
      decision === 'approve'
        ? await prospectingApi.approve(id, reviewer)
        : await prospectingApi.reject(id, reviewer),
    onSuccess: (_res, { decision }) => {
      invalidateQueue();
      toast.success(decision === 'approve' ? 'Approved — company enrolled' : 'Candidate rejected');
    },
    onError: (e) => toast.error(e?.response?.data?.detail || e?.message || 'Review failed'),
  });
}

// Bulk approve/reject. Sequential on purpose: approving enrols a company and
// writes to shared sequence state, and there is no bulk endpoint to do it in one
// transaction — firing N concurrent writes races them against each other. A
// partial failure still reports what landed rather than failing the whole batch.
export function useBulkReview() {
  return useMutation({
    mutationFn: async ({ ids, decision, reviewer }) => {
      const failed = [];
      let ok = 0;
      for (const id of ids) {
        try {
          if (decision === 'approve') await prospectingApi.approve(id, reviewer);
          else await prospectingApi.reject(id, reviewer);
          ok += 1;
        } catch (e) {
          failed.push({ id, error: e?.response?.data?.detail || e?.message || 'failed' });
        }
      }
      return { ok, failed, decision };
    },
    onSuccess: ({ ok, failed, decision }) => {
      invalidateQueue();
      const verb = decision === 'approve' ? 'Approved' : 'Rejected';
      if (failed.length === 0) toast.success(`${verb} ${ok} candidate${ok === 1 ? '' : 's'}`);
      else if (ok === 0) toast.error(`${verb} none — all ${failed.length} failed`);
      else toast(`${verb} ${ok}, ${failed.length} failed`, { icon: '⚠️' });
    },
    onError: (e) => toast.error(e?.response?.data?.detail || e?.message || 'Bulk review failed'),
  });
}
