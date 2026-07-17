import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock the data hook so the page renders deterministically without a backend.
const mockUseDailySummary = vi.fn();
vi.mock('../hooks/useReports', () => ({
  useDailySummary: (...args) => mockUseDailySummary(...args),
}));

// The embedded SendingKillSwitch banner fetches sending status on mount, and
// asks the danger rail whether this is an auto-pause — stub both so the page
// renders offline without hitting the network.
vi.mock('../api/client', () => ({
  api: { get: vi.fn().mockResolvedValue({ data: { enabled: true } }), post: vi.fn() },
  queryClient: { invalidateQueries: vi.fn() },
  dangerSignalsApi: {
    health: vi.fn().mockResolvedValue({ active_trip: null }),
    events: vi.fn(),
    test: vi.fn(),
    resume: vi.fn(),
  },
}));

// Recharts' ResponsiveContainer needs real layout; stub it so charts render at a
// fixed size under jsdom instead of collapsing to 0×0 and warning.
vi.mock('recharts', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    ResponsiveContainer: ({ children }) => (
      <div style={{ width: 400, height: 260 }}>{children}</div>
    ),
  };
});

import DailyActivity from './DailyActivity';

const SAMPLE = {
  latest: {
    date: '2026-07-15',
    narrative: 'On 2026-07-15, Dialtone sent 12 outreach emails.',
    emails_sent: 12,
    leads_discovered: 3,
    replies_received: 2,
    bounces_received: 1,
    follow_ups_created: 4,
    calls_queued: 5,
    metrics: {
      emails: { sent: 12, by_stage: { 1: 8, 2: 4 }, by_sequence: { 'Deal Cracker': 12 } },
      deliverability: {
        bounce_rate_today: 0.08,
        reply_rate_today: 0.17,
        avg_reputation: 94,
        accounts: [{ email: 'sales@apprend.com', status: 'healthy' }],
      },
    },
  },
  history: [
    { date: '2026-07-15', emails_sent: 12, leads_discovered: 3, replies_received: 2, bounces_received: 1, follow_ups_created: 4, calls_queued: 5 },
    { date: '2026-07-14', emails_sent: 9, leads_discovered: 1, replies_received: 1, bounces_received: 0, follow_ups_created: 2, calls_queued: 3 },
  ],
};

const renderPage = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter>
        <DailyActivity />
      </MemoryRouter>
    </QueryClientProvider>
  );

describe('DailyActivity page', () => {
  it('renders the narrative, headline metrics, and history', () => {
    mockUseDailySummary.mockReturnValue({ data: SAMPLE, isLoading: false });
    renderPage();

    expect(screen.getByText('Daily Activity')).toBeInTheDocument();
    // Page is branded as Dialtone and renders Dialtone's narrative + briefing.
    expect(screen.getByText(/What Dialtone did/)).toBeInTheDocument();
    expect(screen.getByText("Dialtone's briefing")).toBeInTheDocument();
    expect(screen.getByText(/Dialtone sent 12 outreach emails/)).toBeInTheDocument();
    // Headline metric values ("12" appears for both the metric and the
    // by-sequence count, so assert at least one is present).
    expect(screen.getAllByText('12').length).toBeGreaterThan(0);
    expect(screen.getByText('Emails sent')).toBeInTheDocument();
    // Deliverability derived rates.
    expect(screen.getByText('8.0%')).toBeInTheDocument();
    expect(screen.getByText('17.0%')).toBeInTheDocument();
    expect(screen.getByText('94/100')).toBeInTheDocument();
    // Sender account status.
    expect(screen.getByText('sales@apprend.com')).toBeInTheDocument();
  });

  it('links the headline metrics to the records behind them', () => {
    mockUseDailySummary.mockReturnValue({ data: SAMPLE, isLoading: false });
    renderPage();
    expect(screen.getByRole('link', { name: /^Leads found/ })).toHaveAttribute('href', '/prospecting');
    expect(screen.getByRole('link', { name: /^Emails sent/ })).toHaveAttribute('href', '/dialtone?type=email_sent');
    expect(screen.getByRole('link', { name: /^Replies/ })).toHaveAttribute('href', '/inbox');
  });

  it('shows an empty state when there is no summary yet', () => {
    mockUseDailySummary.mockReturnValue({ data: { latest: null, history: [] }, isLoading: false });
    renderPage();
    expect(screen.getByText('No activity summaries yet')).toBeInTheDocument();
  });

  it('shows a loading skeleton while fetching', () => {
    mockUseDailySummary.mockReturnValue({ data: undefined, isLoading: true });
    const { container } = renderPage();
    expect(container.querySelector('.animate-pulse')).toBeTruthy();
  });
});
