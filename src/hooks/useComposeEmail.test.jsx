/**
 * The compose toast has to name a "send later" batch as scheduled.
 *
 * The backend used to fold scheduled messages into `sent`, which was wrong in
 * the worst direction — it told the operator their mail had gone out when
 * nothing had left the building. It reports them as `scheduled` now, and the
 * toast built its summary from `sent`/`skipped`/`errors` only: a batch queued
 * successfully for Thursday came back reading "Compose complete: no contacts",
 * which is the same lie with the sign flipped.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockCompose = vi.fn();
const mockSuccess = vi.fn();

vi.mock('../api/client', () => ({
  emailApi: { compose: (...a) => mockCompose(...a) },
  // The hook module also imports the shared client at module scope; mocking the
  // whole module would otherwise leave it undefined and the mutation would fail
  // in onSuccess rather than reaching the toast under test.
  queryClient: { invalidateQueries: vi.fn() },
}));
vi.mock('react-hot-toast', () => ({
  default: { success: (...a) => mockSuccess(...a), error: vi.fn() },
}));

import { useComposeEmail } from './useEmailTemplates';

function makeWrapper() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return function Wrapper({ children }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

async function compose(response, payload = { contact_ids: ['c1'] }) {
  mockCompose.mockResolvedValue(response);
  const { result } = renderHook(() => useComposeEmail(), { wrapper: makeWrapper() });
  result.current.mutate(payload);
  await waitFor(() => expect(mockSuccess).toHaveBeenCalled());
  return mockSuccess.mock.calls[0][0];
}

describe('useComposeEmail success toast', () => {
  beforeEach(() => {
    mockCompose.mockReset();
    mockSuccess.mockReset();
  });

  it('reports a scheduled batch as scheduled, not as nothing', async () => {
    const message = await compose({
      sent: 0, scheduled: 3, skipped: 0, errors: 0, sender: 'us@apprend.tech',
    });
    expect(message).toContain('3 scheduled');
    expect(message).not.toContain('no contacts');
  });

  it('does not claim a scheduled batch was sent', async () => {
    const message = await compose({ sent: 0, scheduled: 2, skipped: 0, errors: 0 });
    expect(message).not.toContain('sent');
  });

  it('still summarises an immediate batch the way it always did', async () => {
    const message = await compose({
      sent: 4, scheduled: 0, skipped: 1, errors: 2, sender: 'us@apprend.tech',
    });
    expect(message).toContain('4 sent');
    expect(message).toContain('1 skipped');
    expect(message).toContain('2 failed');
    expect(message).toContain('via us@apprend.tech');
  });

  it('passes scheduled_at through to the API when the user picks a time', async () => {
    await compose(
      { sent: 0, scheduled: 1, skipped: 0, errors: 0 },
      { contact_ids: ['c1'], template_id: 't1', scheduled_at: '2026-06-18T09:00:00.000Z' },
    );
    expect(mockCompose).toHaveBeenCalledWith(
      expect.objectContaining({ scheduled_at: '2026-06-18T09:00:00.000Z' }),
    );
  });
});
