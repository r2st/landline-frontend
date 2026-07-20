import { useMutation, useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { dialtoneApi, queryClient } from '../api/client';

// Paginated + searchable do-not-contact list (Feature 2). The keepPreviousData
// flag keeps the current page on screen while the next one loads, so paging /
// searching doesn't flash empty.
export function useSuppressionList({ q = '', page = 1, pageSize = 25 } = {}) {
  return useQuery({
    queryKey: ['suppression', { q, page, pageSize }],
    queryFn: () => dialtoneApi.suppressionList({ q: q || undefined, page, page_size: pageSize }),
    keepPreviousData: true,
    retry: false,
  });
}

function invalidate() {
  queryClient.invalidateQueries({ queryKey: ['suppression'] });
}

// Add one address by hand.
export function useAddSuppression() {
  return useMutation({
    mutationFn: (body) => dialtoneApi.addSuppression(body),
    onSuccess: () => {
      toast.success('Address suppressed');
      invalidate();
    },
    onError: (e) =>
      toast.error(e?.response?.data?.detail || e?.message || 'Could not add address'),
  });
}

// Bulk CSV/text upload.
export function useImportSuppression() {
  return useMutation({
    mutationFn: ({ file, reason }) => dialtoneApi.importSuppression(file, reason),
    onSuccess: (res) => {
      toast.success(
        `Imported ${res.added} new · ${res.duplicates} already listed · ${res.invalid} skipped`
      );
      invalidate();
    },
    onError: (e) =>
      toast.error(e?.response?.data?.detail || e?.message || 'Import failed'),
  });
}

// Remove an address (re-allows contacting it).
export function useDeleteSuppression() {
  return useMutation({
    mutationFn: (id) => dialtoneApi.deleteSuppression(id),
    onSuccess: () => {
      toast.success('Removed from suppression list');
      invalidate();
    },
    onError: (e) =>
      toast.error(e?.response?.data?.detail || e?.message || 'Could not remove address'),
  });
}
