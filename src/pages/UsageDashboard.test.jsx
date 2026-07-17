import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockUsage = vi.fn();
vi.mock('../api/org', async () => {
  const actual = await vi.importActual('../api/org');
  return { ...actual, orgApi: { getUsage: (...a) => mockUsage(...a) } };
});
// recharts needs a real layout box; stub so charts render in jsdom.
vi.mock('recharts', () => {
  const Passthrough = ({ children }) => <div>{children}</div>;
  return {
    ResponsiveContainer: Passthrough, BarChart: Passthrough, LineChart: Passthrough,
    Bar: Passthrough, Line: Passthrough, XAxis: () => null, YAxis: () => null,
    CartesianGrid: () => null, Tooltip: () => null,
  };
});

import UsageDashboard from './UsageDashboard';

const USAGE = {
  org_id: 'org-1',
  billing_plan: 'starter',
  period_start: '2026-07-01T00:00:00Z',
  contacts: 142,
  members: 5,
  emails_sent_this_month: 87,
  emails_sent_total: 1203,
  ai_calls: 1600,
  ai_call_limit: 2000,
  ai_calls_remaining: 400,
  over_limit: false,
  estimated_cost_usd: 12.5,
  by_feature: { email_generation: { calls: 1200, cost_usd: 9.1 }, workflow: { calls: 400, cost_usd: 3.4 } },
  trend: [
    { month: '2026-02', emails_sent: 10, ai_calls: 20 },
    { month: '2026-03', emails_sent: 15, ai_calls: 30 },
    { month: '2026-04', emails_sent: 22, ai_calls: 40 },
    { month: '2026-05', emails_sent: 30, ai_calls: 55 },
    { month: '2026-06', emails_sent: 60, ai_calls: 90 },
    { month: '2026-07', emails_sent: 87, ai_calls: 1600 },
  ],
};

const renderPage = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter>
        <UsageDashboard />
      </MemoryRouter>
    </QueryClientProvider>
  );

describe('UsageDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUsage.mockResolvedValue(USAGE);
  });

  it('renders stat tiles', async () => {
    renderPage();
    expect(await screen.findByText('142')).toBeInTheDocument(); // contacts
    expect(screen.getByText('Team members')).toBeInTheDocument();
    expect(screen.getByText('87')).toBeInTheDocument(); // emails this month
    expect(screen.getByText(/1,203 all time/)).toBeInTheDocument();
  });

  it('shows the AI allowance bar with usage vs limit', async () => {
    renderPage();
    await screen.findByText('142');
    expect(screen.getByText(/1,600 \/ 2,000/)).toBeInTheDocument();
    expect(screen.getByText(/400 left/)).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '80');
  });

  it('renders the per-feature breakdown', async () => {
    renderPage();
    await screen.findByText('142');
    expect(screen.getByText('email generation')).toBeInTheDocument();
    expect(screen.getByText('$9.10')).toBeInTheDocument();
  });

  it('shows an over-limit warning when exceeded', async () => {
    mockUsage.mockResolvedValue({ ...USAGE, ai_calls: 2100, ai_calls_remaining: 0, over_limit: true });
    renderPage();
    expect(await screen.findByText(/exceeded this period’s AI call allowance/i)).toBeInTheDocument();
  });
});
