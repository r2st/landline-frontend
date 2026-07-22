import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider, focusManager } from '@tanstack/react-query';

const mockGetInbox = vi.fn();

vi.mock('../api/client', () => ({
  emailHistoryApi: {
    getInbox: (...a) => mockGetInbox(...a),
  },
}));

import { useEmailInbox } from './useEmailHistory';

function makeWrapper() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return function Wrapper({ children }) {
    return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  };
}

describe('useEmailInbox auto-refresh (audit P1: no auto-refresh)', () => {
  beforeEach(() => {
    mockGetInbox.mockReset();
    mockGetInbox.mockResolvedValue({ threads: [], total: 0, page: 1, per_page: 20 });
  });
  afterEach(() => {
    vi.useRealTimers();
    focusManager.setFocused(undefined); // restore default focus detection
  });

  it('polls the inbox on a 60s interval', async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useEmailInbox({ page: 1 }), {
      wrapper: makeWrapper(),
    });

    // Initial fetch.
    await vi.waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGetInbox).toHaveBeenCalledTimes(1);

    // Advancing ~60s must trigger a background refetch (refetchInterval).
    await vi.advanceTimersByTimeAsync(60_000);
    expect(mockGetInbox).toHaveBeenCalledTimes(2);

    await vi.advanceTimersByTimeAsync(60_000);
    expect(mockGetInbox).toHaveBeenCalledTimes(3);
  });

  it('refetches when the window regains focus', async () => {
    const { result } = renderHook(() => useEmailInbox({ page: 1 }), {
      wrapper: makeWrapper(),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(mockGetInbox).toHaveBeenCalledTimes(1);

    // Simulate leaving and returning to the tab via react-query's focus
    // manager. refetchOnWindowFocus is on and the query is stale (staleTime 0),
    // so regaining focus triggers a background refetch.
    focusManager.setFocused(false);
    focusManager.setFocused(true);

    await waitFor(() => expect(mockGetInbox).toHaveBeenCalledTimes(2));
  });
});
