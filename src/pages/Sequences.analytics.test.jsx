import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

const mockAnalytics = vi.fn();
const SEQUENCE = {
  id: 'seq-1',
  name: 'Metal Stamping v2',
  status: 'active',
  is_active: true,
  steps: [
    { step_number: 1, delay_days: 0, subject: 'Intro', body: 'hi' },
    { step_number: 2, delay_days: 3, subject: 'Follow up', body: 'hi again' },
  ],
  stats: { sent: 3, opened: 1, replied: 1, enrolled: 2 },
};

vi.mock('../hooks/useOutreach', () => ({
  useSequences: () => ({ data: [SEQUENCE], isLoading: false, isError: false }),
  useCreateSequence: () => ({ mutate: vi.fn() }),
  useUpdateSequenceStatus: () => ({ mutate: vi.fn() }),
  useDeleteSequence: () => ({ mutate: vi.fn() }),
  useSequenceAnalytics: (...a) => mockAnalytics(...a),
}));
vi.mock('../hooks/useDeals', () => ({
  useDealAttribution: () => ({ data: null, isLoading: false }),
}));

// ResponsiveContainer collapses to 0×0 in jsdom; stub it to a fixed box.
vi.mock('recharts', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    ResponsiveContainer: ({ children }) => <div style={{ width: 400, height: 200 }}>{children}</div>,
  };
});

import Sequences from './Sequences';

function renderPage() {
  return render(
    <MemoryRouter>
      <Sequences />
    </MemoryRouter>
  );
}

const ANALYTICS = {
  sequence_id: 'seq-1',
  name: 'Metal Stamping v2',
  total_enrollments: 2,
  active_enrollments: 1,
  completed_enrollments: 0,
  replied_enrollments: 1,
  bounced_enrollments: 0,
  deals_attributed: 1,
  conversion_rate: 0.5,
  steps: [
    { step_number: 1, channel: 'email', delay_days: 0, label: 'Intro', sent: 2, opened: 1, clicked: 0, replied: 1, bounced: 0, open_rate: 0.5, click_rate: 0, reply_rate: 0.5, bounce_rate: 0 },
    { step_number: 2, channel: 'email', delay_days: 3, label: 'Follow up', sent: 0, opened: 0, clicked: 0, replied: 0, bounced: 0, open_rate: 0, click_rate: 0, reply_rate: 0, bounce_rate: 0 },
  ],
};

describe('Sequence analytics section', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAnalytics.mockReturnValue({ data: ANALYTICS, isLoading: false, isError: false });
  });

  it('does not fetch analytics until the card is expanded', async () => {
    const user = userEvent.setup();
    renderPage();
    // The analytics section only mounts when expanded, so the hook isn't called
    // at all while the card is collapsed.
    expect(mockAnalytics).not.toHaveBeenCalled();

    await user.click(screen.getByText('Metal Stamping v2'));
    expect(mockAnalytics).toHaveBeenCalledWith('seq-1', true);
  });

  it('shows conversion and per-step funnel once expanded', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByText('Metal Stamping v2'));

    // Now fetched with enabled=true.
    expect(mockAnalytics).toHaveBeenCalledWith('seq-1', true);

    // Outcome tiles: conversion 50%, 1 deal. Scope to the conversion tile since
    // 50.0% also appears as a step rate in the table.
    expect(await screen.findByText('Analytics')).toBeInTheDocument();
    const conversionTile = screen.getByText('enrolled → deal').parentElement;
    expect(within(conversionTile).getByText('50.0%')).toBeInTheDocument();

    // Per-step table renders both steps with their open rates.
    const table = screen.getByRole('table');
    expect(within(table).getByText(/Step 1/)).toBeInTheDocument();
    expect(within(table).getByText(/Step 2/)).toBeInTheDocument();
  });

  it('shows an empty funnel note when nothing has sent', async () => {
    mockAnalytics.mockReturnValue({
      data: {
        ...ANALYTICS,
        total_enrollments: 0,
        deals_attributed: 0,
        conversion_rate: 0,
        steps: ANALYTICS.steps.map((s) => ({ ...s, sent: 0, opened: 0, replied: 0, open_rate: 0, reply_rate: 0 })),
      },
      isLoading: false,
      isError: false,
    });
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByText('Metal Stamping v2'));
    expect(await screen.findByText(/No sends yet/i)).toBeInTheDocument();
  });
});
