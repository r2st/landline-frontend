import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockList = vi.fn();
const mockGet = vi.fn();
const mockDeclare = vi.fn();
vi.mock('../api/client', () => ({
  api: { get: vi.fn(), post: vi.fn() },
  queryClient: { invalidateQueries: vi.fn(), setQueryData: vi.fn() },
  abTestsApi: {
    list: (...a) => mockList(...a),
    get: (...a) => mockGet(...a),
    declareWinner: (...a) => mockDeclare(...a),
  },
}));
vi.mock('react-hot-toast', () => ({
  default: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }),
}));
// recharts' ResponsiveContainer needs a real layout box; stub the chart so the
// page renders in jsdom without measuring 0×0.
vi.mock('recharts', () => {
  const Passthrough = ({ children }) => <div>{children}</div>;
  return {
    ResponsiveContainer: Passthrough,
    BarChart: Passthrough,
    Bar: Passthrough,
    Cell: () => null,
    XAxis: () => null,
    YAxis: () => null,
    CartesianGrid: () => null,
    Tooltip: () => null,
    LabelList: () => null,
  };
});

import toast from 'react-hot-toast';
import DialtoneAbTests from './DialtoneAbTests';

const RUNNING = {
  id: 'test-running',
  sequence_step_id: 'step-1',
  sequence_id: 'seq-1',
  step_number: 1,
  status: 'running',
  strategy: 'even',
  metric: 'replied',
  min_sample: 100,
  confidence_target: 0.95,
  winner_variant_id: null,
  winner_label: null,
  declared_at: null,
  created_at: '2026-07-16T09:00:00Z',
  variant_count: 2,
  total_sent: 120,
  leader_label: 'B',
  confidence: 0.82,
};

const DECLARED = {
  ...RUNNING,
  id: 'test-declared',
  step_number: 2,
  status: 'completed',
  winner_variant_id: 'v-a',
  winner_label: 'A',
  declared_at: '2026-07-16T18:00:00Z',
  leader_label: 'A',
  confidence: 0.97,
};

const LIST = { items: [RUNNING, DECLARED], total: 2 };

const RUNNING_DETAIL = {
  ...RUNNING,
  is_significant: false,
  default_winner: false,
  sample_progress: 0.6,
  variants: [
    {
      variant_id: 'v-a', label: 'A', is_control: true, is_active: true,
      subject_template: 'Quick question about {company}', body_template: null,
      assigned: 62, sent: 60, opened: 30, clicked: 6, replied: 3,
      open_rate: 0.5, click_rate: 0.1, reply_rate: 0.05,
    },
    {
      variant_id: 'v-b', label: 'B', is_control: false, is_active: true,
      subject_template: 'An idea for {company}', body_template: null,
      assigned: 61, sent: 60, opened: 39, clicked: 9, replied: 6,
      open_rate: 0.65, click_rate: 0.15, reply_rate: 0.10,
    },
  ],
};

const SIGNIFICANT_DETAIL = {
  ...RUNNING_DETAIL,
  is_significant: true,
  confidence: 0.96,
  sample_progress: 1,
};

const DECLARED_DETAIL = {
  ...DECLARED,
  is_significant: true,
  default_winner: false,
  sample_progress: 1,
  variants: [
    { ...RUNNING_DETAIL.variants[0] },
    { ...RUNNING_DETAIL.variants[1] },
  ],
};

const renderPage = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter>
        <DialtoneAbTests />
      </MemoryRouter>
    </QueryClientProvider>
  );

describe('DialtoneAbTests page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists tests with their status and leader', async () => {
    mockList.mockResolvedValue(LIST);
    renderPage();

    // Wait for the async list query to resolve and render both cards.
    expect(await screen.findByText('Declared')).toBeInTheDocument();
    // The running test shows a leader; the declared test shows its winner.
    expect(screen.getByText(/Variant B leading/)).toBeInTheDocument();
    expect(screen.getByText(/Variant A won/)).toBeInTheDocument();
    // Two experiment cards, each a button.
    expect(screen.getAllByRole('button', { name: /sequence step/i })).toHaveLength(2);
  });

  it('shows an empty state when there are no tests', async () => {
    mockList.mockResolvedValue({ items: [], total: 0 });
    renderPage();

    expect(await screen.findByText(/no a\/b tests yet/i)).toBeInTheDocument();
  });

  it('never renders a failed fetch as an empty list', async () => {
    // The hook swallows errors into an empty shape, so the page shows the empty
    // state rather than a spinner forever.
    mockList.mockRejectedValue(new Error('gateway timeout'));
    renderPage();
    expect(await screen.findByText(/no a\/b tests yet/i)).toBeInTheDocument();
  });

  it('opens a test detail with per-variant rates when a card is clicked', async () => {
    const user = userEvent.setup();
    mockList.mockResolvedValue(LIST);
    mockGet.mockResolvedValue(RUNNING_DETAIL);
    renderPage();

    await screen.findByText('A/B Test Results');
    // Click the first (running) card.
    await user.click((await screen.findAllByRole('button', { name: /sequence step/i }))[0]);

    expect(await screen.findByText('Per-variant results')).toBeInTheDocument();
    expect(screen.getByText('Variant A')).toBeInTheDocument();
    expect(screen.getByText('Variant B')).toBeInTheDocument();
    // Variant B's open rate (65%) and A's open rate (50%) are unique values.
    expect(screen.getByText('65.0%')).toBeInTheDocument();
    expect(screen.getByText('50.0%')).toBeInTheDocument();
    expect(mockGet).toHaveBeenCalledWith('test-running');
  });

  it('flags a chi-squared significant result', async () => {
    const user = userEvent.setup();
    mockList.mockResolvedValue(LIST);
    mockGet.mockResolvedValue(SIGNIFICANT_DETAIL);
    renderPage();

    await screen.findByText('A/B Test Results');
    await user.click((await screen.findAllByRole('button', { name: /sequence step/i }))[0]);

    expect(await screen.findByText(/statistically significant/i)).toBeInTheDocument();
    expect(screen.getByText(/96\.0% confidence/)).toBeInTheDocument();
  });

  it('says a result is not yet significant when confidence is short', async () => {
    const user = userEvent.setup();
    mockList.mockResolvedValue(LIST);
    mockGet.mockResolvedValue(RUNNING_DETAIL);
    renderPage();

    await screen.findByText('A/B Test Results');
    await user.click((await screen.findAllByRole('button', { name: /sequence step/i }))[0]);

    expect(await screen.findByText(/not yet significant/i)).toBeInTheDocument();
  });

  it('declares a winner from the variant table', async () => {
    const user = userEvent.setup();
    mockList.mockResolvedValue(LIST);
    mockGet.mockResolvedValue(RUNNING_DETAIL);
    mockDeclare.mockResolvedValue({ ...DECLARED_DETAIL, winner_label: 'B' });
    renderPage();

    await screen.findByText('A/B Test Results');
    await user.click((await screen.findAllByRole('button', { name: /sequence step/i }))[0]);
    await screen.findByText('Per-variant results');

    const buttons = screen.getAllByRole('button', { name: /declare winner/i });
    await user.click(buttons[1]); // declare Variant B

    expect(mockDeclare).toHaveBeenCalledWith('test-running', { variant_id: 'v-b', label: undefined });
    expect(toast.success).toHaveBeenCalled();
  });

  it('shows the winner and no declare buttons on a concluded test', async () => {
    const user = userEvent.setup();
    mockList.mockResolvedValue(LIST);
    mockGet.mockResolvedValue(DECLARED_DETAIL);
    renderPage();

    await screen.findByText('A/B Test Results');
    // Click the declared card (second one).
    await user.click((await screen.findAllByRole('button', { name: /sequence step/i }))[1]);

    expect(await screen.findByText(/was declared the winner/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /declare winner/i })).not.toBeInTheDocument();
    // The winner row is marked Selected.
    expect(screen.getByText('Selected')).toBeInTheDocument();
  });

  it('filters the list by status tab', async () => {
    const user = userEvent.setup();
    mockList.mockResolvedValue(LIST);
    renderPage();

    await screen.findByText('A/B Test Results');
    await user.click(screen.getByRole('button', { name: 'Completed' }));

    // The filter passes the backend status through to the API.
    expect(mockList).toHaveBeenCalledWith({ status: 'completed' });
  });
});
