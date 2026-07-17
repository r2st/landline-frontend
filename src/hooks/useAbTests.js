import { useMutation, useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { abTestsApi, queryClient } from '../api/client';

// A/B Test list for the Dialtone results dashboard. `status` narrows to
// running / insufficient_data / completed. Degrades to an empty list so the
// page always renders rather than blanking on a backend hiccup.
export function useAbTests(status) {
  return useQuery({
    queryKey: ['ab-tests', status || 'all'],
    queryFn: async () => {
      try {
        const data = await abTestsApi.list(status ? { status } : undefined);
        return {
          items: Array.isArray(data?.items) ? data.items : [],
          total: data?.total || 0,
        };
      } catch {
        return { items: [], total: 0 };
      }
    },
    refetchInterval: 30000,
    keepPreviousData: true,
    retry: false,
  });
}

// Full detail for one test — per-variant stats, leader, confidence and the
// chi-squared significance flag. Only fires when a test is selected.
export function useAbTest(testId) {
  return useQuery({
    queryKey: ['ab-test', testId],
    queryFn: () => abTestsApi.get(testId),
    enabled: Boolean(testId),
    refetchInterval: 30000,
    retry: false,
  });
}

// Operator override: declare a winning variant. Refreshes both the detail and
// the list so the concluded test moves to "declared" everywhere at once.
export function useDeclareWinner(testId) {
  return useMutation({
    mutationFn: ({ variantId, label }) =>
      abTestsApi.declareWinner(testId, { variant_id: variantId, label }),
    onSuccess: (data) => {
      // Seed the detail cache with the freshly-concluded test so the winner
      // shows immediately, then invalidate the list to re-sort statuses.
      queryClient.setQueryData(['ab-test', testId], data);
      queryClient.invalidateQueries({ queryKey: ['ab-test', testId] });
      queryClient.invalidateQueries({ queryKey: ['ab-tests'] });
      const label = data?.winner_label;
      toast.success(label ? `Variant ${label} declared the winner` : 'Winner declared');
    },
    onError: (e) =>
      toast.error(e?.response?.data?.detail || e?.message || 'Could not declare a winner'),
  });
}
