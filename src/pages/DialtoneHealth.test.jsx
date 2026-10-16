import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockHealth = vi.fn();
const mockEvents = vi.fn();
const mockTest = vi.fn();
const mockResume = vi.fn();
vi.mock('../api/client', () => ({
  api: { get: vi.fn(), post: vi.fn() },
  queryClient: { invalidateQueries: vi.fn() },
  dangerSignalsApi: {
    health: (...a) => mockHealth(...a),
    events: (...a) => mockEvents(...a),
    test: (...a) => mockTest(...a),
    resume: (...a) => mockResume(...a),
  },
}));
vi.mock('react-hot-toast', () => ({
  default: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }),
}));

import DialtoneHealth from './DialtoneHealth';

const THRESHOLDS = {
  bounce_rate: 0.05,
  bounce_rate_warn: 0.03,
  complaint_rate: 0.001,
  complaint_rate_warn: 0.0005,
  hard_bounce_count: 25,
  hard_bounce_count_warn: 15,
  min_sample_size: 50,
};

const HEALTHY = {
  generated_at: '2026-07-16T12:00:00Z',
  window_hours: 24,
  overall_status: 'healthy',
  sending_enabled: true,
  breach: false,
  thresholds: THRESHOLDS,
  global_metrics: [
    {
      metric: 'bounce_rate', scope: 'global', window: '24h', observed_value: 0.012,
      threshold: 0.05, warn_threshold: 0.03, sample_size: 180, status: 'pass', hard_bounces: 2,
    },
  ],
  account_metrics: [],
  breaches: [],
  warnings: [],
  active_trip: null,
};

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

const PAUSED = {
  ...HEALTHY,
  overall_status: 'paused',
  sending_enabled: false,
  breach: true,
  breaches: [
    {
      metric: 'bounce_rate', scope: 'global', window: '24h', observed_value: 0.082,
      threshold: 0.05, warn_threshold: 0.03, sample_size: 220, status: 'breach', hard_bounces: 18,
    },
  ],
  active_trip: TRIP,
};

const NO_EVENTS = { items: [], total: 0, page: 1, page_size: 10 };

const renderPage = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter>
        <DialtoneHealth />
      </MemoryRouter>
    </QueryClientProvider>
  );

describe('DialtoneHealth page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEvents.mockResolvedValue(NO_EVENTS);
  });

  it('reports a clean rail as sending', async () => {
    mockHealth.mockResolvedValue(HEALTHY);
    renderPage();

    expect(await screen.findByText('Autopilot is sending')).toBeInTheDocument();
    expect(screen.getByText('Healthy')).toBeInTheDocument();
    // Rates are fractions server-side; thresholds read as percentages.
    expect(screen.getByText('5.0%')).toBeInTheDocument();
  });

  it('never renders a failed fetch as a clean bill of health', async () => {
    mockHealth.mockRejectedValue(new Error('gateway timeout'));
    renderPage();

    // The whole point of this screen is to say whether sending is halted.
    // "I couldn't check" must not look like "everything is fine".
    expect(await screen.findByText(/can't read the danger signals/i)).toBeInTheDocument();
    expect(screen.getByText(/not the same as/i)).toBeInTheDocument();
    expect(screen.queryByText('Healthy')).not.toBeInTheDocument();
    expect(screen.queryByText('Autopilot is sending')).not.toBeInTheDocument();
  });

  it('says what tripped when Dialtone has paused itself', async () => {
    mockHealth.mockResolvedValue(PAUSED);
    renderPage();

    expect(await screen.findByText('Autopilot is not sending')).toBeInTheDocument();
    expect(screen.getByText(/dialtone paused itself/i)).toBeInTheDocument();
    expect(screen.getByText('Paused')).toBeInTheDocument();
    // The breached value appears in both the trip banner and the breach list.
    expect(screen.getAllByText(/8\.2%/).length).toBeGreaterThan(0);
  });

  it('offers the acknowledged resume only when a trip is open', async () => {
    mockHealth.mockResolvedValue(HEALTHY);
    const { unmount } = renderPage();
    await screen.findByText('Autopilot is sending');
    expect(screen.queryByRole('button', { name: /review & resume/i })).not.toBeInTheDocument();
    unmount();

    mockHealth.mockResolvedValue(PAUSED);
    renderPage();
    expect(await screen.findByRole('button', { name: /review & resume/i })).toBeInTheDocument();
  });

  it('formats counts as counts and rates as percentages', async () => {
    mockHealth.mockResolvedValue(HEALTHY);
    renderPage();
    await screen.findByText('Autopilot is sending');

    // hard_bounce_count is a plain count — rendering it as a percentage would
    // turn "25" into "2500%".
    expect(screen.getByText('25')).toBeInTheDocument();
    expect(screen.getByText('15')).toBeInTheDocument();
  });

  it('dry-runs the thresholds without pausing anything', async () => {
    const user = userEvent.setup();
    mockHealth.mockResolvedValue(HEALTHY);
    mockTest.mockResolvedValue({
      generated_at: '2026-07-16T12:00:00Z',
      window_hours: 24,
      overall_status: 'healthy',
      sending_enabled: true,
      would_pause: false,
      would_pause_reason: null,
      breaches: [],
      warnings: [],
      metrics: [],
      thresholds: THRESHOLDS,
    });
    renderPage();
    await screen.findByText('Autopilot is sending');

    await user.click(screen.getByRole('button', { name: /run test/i }));
    expect(await screen.findByText(/nothing would trip/i)).toBeInTheDocument();
    expect(mockTest).toHaveBeenCalled();
  });

  it('warns when a dry-run says the rail would fire right now', async () => {
    const user = userEvent.setup();
    mockHealth.mockResolvedValue(HEALTHY);
    mockTest.mockResolvedValue({
      generated_at: '2026-07-16T12:00:00Z',
      window_hours: 24,
      overall_status: 'breach',
      sending_enabled: true,
      would_pause: true,
      would_pause_reason: 'bounce_rate 6.1% over 5%',
      breaches: [{
        metric: 'bounce_rate', scope: 'global', window: '24h', observed_value: 0.061,
        threshold: 0.05, warn_threshold: 0.03, sample_size: 130, status: 'breach',
      }],
      warnings: [],
      metrics: [],
      thresholds: THRESHOLDS,
    });
    renderPage();
    await screen.findByText('Autopilot is sending');

    await user.click(screen.getByRole('button', { name: /run test/i }));
    expect(await screen.findByText(/would pause dialtone now/i)).toBeInTheDocument();
  });

  it('shows trip history with who cleared it', async () => {
    mockHealth.mockResolvedValue(HEALTHY);
    mockEvents.mockResolvedValue({
      items: [{
        id: 'e1',
        metric: 'complaint_rate',
        scope: 'global',
        account_email: null,
        window: '24h',
        observed_value: 0.0012,
        threshold: 0.001,
        sample_size: 400,
        action_taken: 'auto_paused',
        details: {},
        triggered_at: '2026-07-10T08:00:00Z',
        resolved_at: '2026-07-10T10:00:00Z',
        resolved_by: 'operator:sam@apprend.tech',
        resolve_note: 'Bad list purged.',
      }],
      total: 1, page: 1, page_size: 10,
    });
    renderPage();

    expect(await screen.findByText(/Resolved/)).toBeInTheDocument();
    expect(screen.getByText(/Bad list purged/)).toBeInTheDocument();
  });

  it('says the rail has never fired rather than showing a blank list', async () => {
    mockHealth.mockResolvedValue(HEALTHY);
    renderPage();
    expect(await screen.findByText(/the rail has never fired/i)).toBeInTheDocument();
  });
});
