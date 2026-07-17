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

// The active ICP. Unlike the queue hooks above this does NOT swallow errors
// into null: null is a real state here (nothing learned yet) and it drives the
// "learn your ICP" empty state, so conflating it with a failed fetch would tell
// an operator to re-learn a profile that already exists.
export function useProspectingIcp() {
  return useQuery({
    queryKey: ['prospecting-icp'],
    queryFn: () => prospectingApi.icp(),
    retry: false,
  });
}

// The candidates a single run produced. Lazy — only fetched when a run is
// expanded, since run history lists many and most are never opened.
export function useRunCandidates(runId) {
  return useQuery({
    queryKey: ['run-candidates', runId],
    queryFn: () => prospectingApi.runCandidates(runId),
    enabled: Boolean(runId),
    retry: false,
  });
}

function invalidateIcp() {
  queryClient.invalidateQueries({ queryKey: ['prospecting-icp'] });
}

// Pin ICP fields. The response is authoritative — the server re-applies every
// override after writing, so what comes back is what the agent will score on.
export function useUpdateIcp() {
  return useMutation({
    mutationFn: (body) => prospectingApi.updateIcp(body),
    onSuccess: (data, body) => {
      queryClient.setQueryData(['prospecting-icp'], data);
      invalidateIcp();
      toast.success(body?.unpin?.length ? 'Field released to the learner' : 'ICP updated');
    },
    onError: (e) => toast.error(e?.response?.data?.detail || e?.message || 'Could not save the ICP'),
  });
}

// Refit from won deals. Pinned fields survive — the server carries them onto
// the new profile — so the copy around this must not threaten otherwise.
export function useLearnIcp() {
  return useMutation({
    mutationFn: () => prospectingApi.learnIcp(),
    onSuccess: (data) => {
      queryClient.setQueryData(['prospecting-icp'], data);
      invalidateIcp();
      toast.success(
        data?.learned_from_deal_count
          ? `ICP refit from ${data.learned_from_deal_count} won deal(s)`
          : 'ICP refit — no won deals yet, so defaults were used'
      );
    },
    onError: (e) => toast.error(e?.response?.data?.detail || e?.message || 'Re-learn failed'),
  });
}

// Trigger a prospecting run now. This spends Apollo/Places credits and can
// enrol companies straight into outreach, so every caller gates it behind a
// confirm rather than treating it as a refresh button.
export function useTriggerRun() {
  return useMutation({
    mutationFn: (body) => prospectingApi.run(body),
    onSuccess: (run) => {
      invalidateQueue();
      if (run?.status === 'failed') {
        toast.error(`Run failed: ${run.error || 'no reason given'}`);
        return;
      }
      const found = run?.companies_found ?? 0;
      const queued = run?.companies_review_queue ?? 0;
      const enrolled = run?.companies_enrolled ?? 0;
      toast.success(
        found
          ? `Found ${found} — ${enrolled} enrolled, ${queued} waiting on you`
          : 'Run finished — nothing new found'
      );
    },
    onError: (e) => toast.error(e?.response?.data?.detail || e?.message || 'Could not start a run'),
  });
}

// Company provenance: which candidate/run put this company in the pipeline.
// `discovered_by_agent: false` is a real answer, not an error.
export function useCompanyProvenance(companyId) {
  return useQuery({
    queryKey: ['company-provenance', companyId],
    queryFn: () => prospectingApi.provenance(companyId),
    enabled: Boolean(companyId),
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
