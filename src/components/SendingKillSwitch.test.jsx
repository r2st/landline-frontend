import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock the API client and toast so the component is deterministic offline.
// Both the plain toggle and the danger rail are routed through the same spies:
// *which endpoint a given control hits* is precisely what these tests assert.
const mockGet = vi.fn();
const mockPost = vi.fn();
vi.mock('../api/client', () => ({
  api: {
    get: (...a) => mockGet(...a),
    post: (...a) => mockPost(...a),
  },
  queryClient: { invalidateQueries: vi.fn() },
  dangerSignalsApi: {
    health: () => mockGet('/dialtone/health/signals').then((r) => r.data),
    events: (...a) => mockGet('/dialtone/health/signals/events', ...a).then((r) => r.data),
    test: () => mockPost('/dialtone/health/signals/test').then((r) => r.data),
    resume: ({ acknowledgeDangerSignalId, note, force }) =>
      mockPost('/dialtone/resume', {
        acknowledge_danger_signal_id: acknowledgeDangerSignalId,
        note,
        force,
      }).then((r) => r.data),
  },
}));
vi.mock('react-hot-toast', () => ({
  default: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }),
}));

import SendingKillSwitch from './SendingKillSwitch';

// The trip the rail records when it halts sending on its own.
const TRIP = {
  id: '11111111-1111-1111-1111-111111111111',
  metric: 'bounce_rate',
  scope: 'global',
  account_email: null,
  observed_value: 0.082,
  threshold: 0.05,
  sample_size: 220,
  reason: 'Bounce rate 8.2% over 220 sends exceeded the 5% threshold',
  triggered_at: '2026-07-16T09:00:00Z',
};

// Route GETs by URL: sending-status and the danger rail must be able to
// disagree, which is the whole point of the auto-pause distinction.
function wireGets({ status, signals = { active_trip: null }, signalsFail = false }) {
  mockGet.mockImplementation((url) => {
    if (url === '/system/sending-status') return Promise.resolve({ data: status });
    if (url === '/dialtone/health/signals') {
      return signalsFail
        ? Promise.reject(new Error('rail unreachable'))
        : Promise.resolve({ data: signals });
    }
    return Promise.reject(new Error(`unexpected GET ${url}`));
  });
}

function renderSwitch(props = {}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <SendingKillSwitch {...props} />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGet.mockReset();
  mockPost.mockReset();
});

describe('SendingKillSwitch', () => {
  it('shows active status and a pause button when Dialtone is enabled', async () => {
    wireGets({ status: { enabled: true, today_sent: 5, daily_limit: 25 } });
    renderSwitch();

    expect(await screen.findByText('Dialtone active')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /pause dialtone/i })).toBeInTheDocument();
  });

  it('requires confirmation, then pauses Dialtone', async () => {
    const user = userEvent.setup();
    wireGets({ status: { enabled: true } });
    mockPost.mockResolvedValue({ data: { enabled: false, enrollments_affected: 3 } });

    renderSwitch();
    await screen.findByText('Dialtone active');

    await user.click(screen.getByRole('button', { name: /pause dialtone/i }));
    // Confirmation appears before anything is sent.
    expect(screen.getByText(/pauses dialtone and stops all outgoing emails/i)).toBeInTheDocument();
    expect(mockPost).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: /confirm halt/i }));
    await waitFor(() =>
      expect(mockPost).toHaveBeenCalledWith('/system/sending-toggle', expect.objectContaining({ enabled: false }))
    );
    expect(await screen.findByText('Dialtone paused')).toBeInTheDocument();
  });

  it('shows paused status and a resume button when Dialtone is disabled', async () => {
    wireGets({ status: { enabled: false, reason: 'manual' } });
    renderSwitch();

    expect(await screen.findByText('Dialtone paused')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /resume dialtone/i })).toBeInTheDocument();
  });

  // --- The auto-pause rail (P0-3) -----------------------------------------
  // Dialtone halts itself on danger signals. /system/sending-toggle performs no
  // trip check at all, so resuming an auto-pause through it drops the operator
  // straight back into a live incident with the trip still unresolved. Only
  // /dialtone/resume re-checks the metrics and can refuse.

  it('resumes a clean manual pause through the plain toggle', async () => {
    const user = userEvent.setup();
    wireGets({ status: { enabled: false, reason: 'manual' }, signals: { active_trip: null } });
    mockPost.mockResolvedValue({ data: { enabled: true, enrollments_affected: 2 } });
    renderSwitch();

    await user.click(await screen.findByRole('button', { name: /resume dialtone/i }));

    // No trip: the toggle is the correct call, no acknowledgement needed.
    await waitFor(() =>
      expect(mockPost).toHaveBeenCalledWith('/system/sending-toggle', expect.objectContaining({ enabled: true }))
    );
  });

  it('never resumes an auto-pause through /system/sending-toggle', async () => {
    const user = userEvent.setup();
    wireGets({ status: { enabled: false, reason: 'Auto-paused' }, signals: { active_trip: TRIP } });
    renderSwitch();

    // The control itself changes: this is a review, not a flip.
    await user.click(await screen.findByRole('button', { name: /review & resume/i }));

    expect(mockPost).not.toHaveBeenCalledWith('/system/sending-toggle', expect.anything());
    expect(screen.getByRole('dialog', { name: /resume after auto-pause/i })).toBeInTheDocument();
  });

  it('shows the breached metric and threshold rather than a bare "paused"', async () => {
    wireGets({ status: { enabled: false, reason: 'Auto-paused' }, signals: { active_trip: TRIP } });
    renderSwitch();

    expect(await screen.findByText(/auto-paused by a danger signal/i)).toBeInTheDocument();
    // Rates are 0..1 server-side; a reviewer reads percentages.
    expect(screen.getByText('8.2%')).toBeInTheDocument();
    expect(screen.getByText('5.0%')).toBeInTheDocument();
  });

  it('resumes through the acknowledged path, carrying the trip id and note', async () => {
    const user = userEvent.setup();
    wireGets({ status: { enabled: false }, signals: { active_trip: TRIP } });
    renderSwitch();

    await user.click(await screen.findByRole('button', { name: /review & resume/i }));
    mockPost.mockResolvedValue({ data: { resumed: true, sending_enabled: true, enrollments_affected: 3 } });
    await user.type(screen.getByLabelText(/why is it safe to resume/i), 'Purged the bad import.');
    await user.click(screen.getByRole('button', { name: /acknowledge & resume/i }));

    await waitFor(() =>
      expect(mockPost).toHaveBeenCalledWith('/dialtone/resume', {
        acknowledge_danger_signal_id: TRIP.id,
        note: 'Purged the bad import.',
        force: false,
      })
    );
  });

  it('will not submit an acknowledged resume without a note', async () => {
    const user = userEvent.setup();
    wireGets({ status: { enabled: false }, signals: { active_trip: TRIP } });
    renderSwitch();

    await user.click(await screen.findByRole('button', { name: /review & resume/i }));
    // The note is audited and the API requires it — the button stays dead.
    expect(screen.getByRole('button', { name: /acknowledge & resume/i })).toBeDisabled();
  });

  it("explains a 409 as the rail refusing, and won't force without a second decision", async () => {
    const user = userEvent.setup();
    wireGets({ status: { enabled: false }, signals: { active_trip: TRIP } });
    renderSwitch();

    await user.click(await screen.findByRole('button', { name: /review & resume/i }));
    mockPost.mockRejectedValue({
      response: { status: 409, data: { detail: 'Danger condition is still active — refusing to resume.' } },
    });
    await user.type(screen.getByLabelText(/why is it safe to resume/i), 'Looks fine to me.');
    await user.click(screen.getByRole('button', { name: /acknowledge & resume/i }));

    // A refusal is a finding, not a generic failure.
    expect(await screen.findByText(/the danger is still live/i)).toBeInTheDocument();
    // Submitting again is blocked until the override is deliberately ticked —
    // the button does not quietly become a retry of the same call.
    expect(screen.getByRole('button', { name: /acknowledge & resume/i })).toBeDisabled();
    expect(screen.queryByRole('button', { name: /force resume/i })).not.toBeInTheDocument();
  });

  it('forces a resume only after the override is explicitly ticked', async () => {
    const user = userEvent.setup();
    wireGets({ status: { enabled: false }, signals: { active_trip: TRIP } });
    renderSwitch();

    await user.click(await screen.findByRole('button', { name: /review & resume/i }));
    mockPost.mockRejectedValueOnce({
      response: { status: 409, data: { detail: 'Danger condition is still active.' } },
    });
    await user.type(screen.getByLabelText(/why is it safe to resume/i), 'Bounces were a bad MX, now fixed.');
    await user.click(screen.getByRole('button', { name: /acknowledge & resume/i }));
    await screen.findByText(/the danger is still live/i);

    mockPost.mockResolvedValueOnce({ data: { resumed: true, forced: true, sending_enabled: true } });
    await user.click(screen.getByRole('checkbox'));
    await user.click(screen.getByRole('button', { name: /force resume/i }));

    await waitFor(() =>
      expect(mockPost).toHaveBeenLastCalledWith('/dialtone/resume', {
        acknowledge_danger_signal_id: TRIP.id,
        note: 'Bounces were a bad MX, now fixed.',
        force: true,
      })
    );
  });

  it('says the danger check did not run when the rail is unreachable', async () => {
    wireGets({ status: { enabled: false, reason: 'unknown' }, signalsFail: true });
    renderSwitch();

    // An unreachable rail must not silently read as "no trip, all clear".
    expect(await screen.findByText(/could not be reached/i)).toBeInTheDocument();
  });

  it('surfaces the auto-pause in the compact banner too', async () => {
    wireGets({ status: { enabled: false }, signals: { active_trip: TRIP } });
    renderSwitch({ compact: true });

    expect(await screen.findByText(/auto-paused: Bounce rate 8.2% over 5.0%/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /review & resume/i })).toBeInTheDocument();
  });
});
