import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const mockReset = vi.fn();
vi.mock('../api/client', () => ({
  systemApi: { resetWarmup: (...a) => mockReset(...a) },
}));
vi.mock('react-hot-toast', () => ({
  default: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }),
}));

import ResetWarmupControl from './ResetWarmupControl';

const RAMPING = { enabled: true, warmup_active: true, warmup_week: 2, daily_limit: 50 };
const DONE = { enabled: true, warmup_active: false, warmup_week: null, daily_limit: 100 };

describe('ResetWarmupControl', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockReset.mockResolvedValue({ warmup_start_date: '2026-07-16' });
  });

  it('shows the current ramp week and cap', () => {
    render(<ResetWarmupControl status={RAMPING} />);
    expect(screen.getByText('Week 2 of the ramp')).toBeInTheDocument();
    expect(screen.getByText(/50 emails\/day cap/)).toBeInTheDocument();
  });

  it('says the ramp is complete only when the backend says so', () => {
    render(<ResetWarmupControl status={DONE} />);
    expect(screen.getByText(/ramp complete/i)).toBeInTheDocument();
  });

  it('never claims full volume when the status is unknown', () => {
    render(<ResetWarmupControl status={null} />);
    // Defaulting an unloaded status to "complete" would promise full throughput
    // at the exact moment we can't confirm there's any.
    expect(screen.getByText(/checking the ramp/i)).toBeInTheDocument();
    expect(screen.queryByText(/ramp complete/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/full volume/i)).not.toBeInTheDocument();
  });

  it('holds the reset behind a confirm that names the cost', async () => {
    const user = userEvent.setup();
    render(<ResetWarmupControl status={RAMPING} />);

    await user.click(screen.getByRole('button', { name: /restart warm-up/i }));
    expect(mockReset).not.toHaveBeenCalled();
    // "Are you sure?" is useless; the operator needs to know throughput drops.
    expect(screen.getByText(/cuts the daily sending cap/i)).toBeInTheDocument();
    expect(screen.getByText(/no undo/i)).toBeInTheDocument();
  });

  it('resets nothing when the confirm is cancelled', async () => {
    const user = userEvent.setup();
    render(<ResetWarmupControl status={RAMPING} />);
    await user.click(screen.getByRole('button', { name: /restart warm-up/i }));
    await user.click(screen.getByRole('button', { name: /cancel/i }));
    expect(mockReset).not.toHaveBeenCalled();
  });

  it('restarts the ramp after confirming', async () => {
    const user = userEvent.setup();
    render(<ResetWarmupControl status={RAMPING} />);

    await user.click(screen.getByRole('button', { name: /restart warm-up/i }));
    await user.click(screen.getByRole('button', { name: /restart the ramp/i }));

    expect(mockReset).toHaveBeenCalled();
  });

  it('reports week 1 immediately after a reset, not the stale week', async () => {
    const user = userEvent.setup();
    render(<ResetWarmupControl status={RAMPING} />);

    await user.click(screen.getByRole('button', { name: /restart warm-up/i }));
    await user.click(screen.getByRole('button', { name: /restart the ramp/i }));

    // The parent's status is now stale; the ramp is at week 1 by definition.
    // Showing "Week 2" (or "complete") right after a reset would be a lie.
    expect(await screen.findByText(/week 1 of the ramp — restarted 2026-07-16/i)).toBeInTheDocument();
    expect(screen.queryByText('Week 2 of the ramp')).not.toBeInTheDocument();
  });

  it('surfaces a failed reset rather than implying it worked', async () => {
    const user = userEvent.setup();
    const toast = (await import('react-hot-toast')).default;
    mockReset.mockRejectedValue({ response: { data: { detail: 'nope' } } });
    render(<ResetWarmupControl status={RAMPING} />);

    await user.click(screen.getByRole('button', { name: /restart warm-up/i }));
    await user.click(screen.getByRole('button', { name: /restart the ramp/i }));

    await vi.waitFor(() => expect(toast.error).toHaveBeenCalledWith('nope'));
    // The ramp is untouched, so the week must not change.
    expect(screen.getByText('Week 2 of the ramp')).toBeInTheDocument();
  });
});
