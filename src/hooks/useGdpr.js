import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { gdprApi } from '../api/client';

// GDPR data-subject actions are user-initiated one-shots, not reactive reads —
// so they're mutations even though export is a GET. Nothing is cached: an
// export is a point-in-time snapshot, and re-running it should always hit the
// server.

export function useGdprExport() {
  return useMutation({
    mutationFn: (email) => gdprApi.export(email),
    onError: (e) =>
      toast.error(e?.response?.data?.detail || e?.message || 'Could not export this contact'),
  });
}

export function useGdprErase() {
  return useMutation({
    mutationFn: (email) => gdprApi.erase(email),
    onSuccess: () => toast.success('Erasure request submitted'),
    onError: (e) =>
      toast.error(e?.response?.data?.detail || e?.message || 'Could not erase this contact'),
  });
}
