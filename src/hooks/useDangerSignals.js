import { useMutation, useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { dangerSignalsApi, queryClient } from '../api/client';

// The auto-pause rail's own state. Deliberately does NOT swallow errors into an
// empty shape the way the older Dialtone hooks do: this screen's entire job is
// to answer "is sending halted, and why". A failed fetch rendering as "healthy"
// would be the most dangerous lie in the app, so the error is surfaced and the
// page shows it instead of a reassuring dashboard.
export function useDangerSignals({ refetchInterval = 30000 } = {}) {
  return useQuery({
    queryKey: ['danger-signals'],
    queryFn: () => dangerSignalsApi.health(),
    refetchInterval,
    retry: false,
  });
}

export function useDangerEvents({ page = 1, pageSize = 20 } = {}) {
  return useQuery({
    queryKey: ['danger-events', { page, pageSize }],
    queryFn: () => dangerSignalsApi.events({ page, page_size: pageSize }),
    keepPreviousData: true,
    retry: false,
  });
}

// Dry-run the evaluator: what WOULD trip right now, without pausing anything.
export function useTestDangerSignals() {
  return useMutation({
    mutationFn: () => dangerSignalsApi.test(),
    onError: (e) => toast.error(errorMessage(e, 'Threshold test failed')),
  });
}

// The only safe way back from an auto-pause. The backend re-checks live metrics
// and 409s if the danger is still active, so a 409 here is a *correct refusal*,
// not a bug — it's reported as such rather than as a generic failure.
export function useResumeSending() {
  return useMutation({
    mutationFn: ({ acknowledgeDangerSignalId, note, force }) =>
      dangerSignalsApi.resume({ acknowledgeDangerSignalId, note, force }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['danger-signals'] });
      queryClient.invalidateQueries({ queryKey: ['danger-events'] });
      queryClient.invalidateQueries({ queryKey: ['dialtone-console'] });
      queryClient.invalidateQueries({ queryKey: ['sending-status'] });
      const affected = data?.enrollments_affected;
      const base = affected
        ? `Dialtone resumed — ${affected} enrollment(s) reactivated`
        : 'Dialtone resumed';
      if (data?.forced) toast(`${base} (forced over a live danger signal)`, { icon: '⚠️' });
      else toast.success(base);
    },
    // No toast on error: a 409 needs the full explanation the dialog renders,
    // not a truncated line that scrolls away.
  });
}

export function errorMessage(e, fallback) {
  const detail = e?.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  return e?.message || fallback;
}

// A 409 from /dialtone/resume means the rail refused — either the danger is
// still live, the acknowledged trip is stale, or there's nothing to resume.
export function isRefusal(e) {
  return e?.response?.status === 409;
}
