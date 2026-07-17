import { useMutation } from '@tanstack/react-query';
import { deliverabilityApi } from '../api/client';

// Pre-send spam-filter risk scan for a single draft. Each draft card owns its
// own mutation instance so scanning one card doesn't blank out another's result.
// Scanning is read-only (it sends nothing), so unlike approve/reject it needs no
// confirm and invalidates nothing.
export function useSpamScan() {
  return useMutation({
    mutationFn: ({ subject, body, hasUnsubscribe, useAi } = {}) =>
      deliverabilityApi.scanContent({ subject, body, hasUnsubscribe, useAi }),
  });
}
