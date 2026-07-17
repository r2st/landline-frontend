import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock the data hooks so the page renders deterministically without a backend.
const mockConsole = vi.fn();
const mockActivity = vi.fn();
vi.mock('../hooks/useDialtone', () => ({
  useDialtoneConsole: (...a) => mockConsole(...a),
  useDialtoneActivity: (...a) => mockActivity(...a),
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

import DialtoneConsole from './DialtoneConsole';

const CONSOLE = {
  date: '2026-07-15',
  sending: { enabled: true },
  warmup: {
    today_sent: 8, daily_limit: 20, daily_remaining: 12, monthly_sent: 120,
    warmup_active: true, warmup_week: 1,
  },
  today: {
    emails_sent: 8, opens: 5, clicks: 2, replies: 1, bounces: 0, errors: 0, leads_discovered: 3,
  },
  senders: [
    {
      account_id: 'a1', account_type: 'gmail', email: 'suman.das@apprend.tech',
      health_status: 'healthy', reputation_score: 96, throttle_factor: 1,
      effective_daily_limit: 20, warmup_daily_limit: 20, used_today: 8, remaining_today: 12,
    },
  ],
};

const FEED = {
  items: [
    {
      id: 'email_sent:1', type: 'email_sent', timestamp: new Date().toISOString(),
      title: 'Email sent to John Smith', description: 'Intro', source: 'email_send',
      severity: 'ok', metadata: { to_email: 'john@acme.com', subject: 'Intro', contact_id: 'c-1' },
    },
    {
      id: 'reply:1', type: 'reply', timestamp: new Date().toISOString(),
      title: 'Jane Doe replied', description: 'Re: Intro', source: 'email_send',
      severity: 'ok', metadata: { to_email: 'jane@acme.com' },
    },
  ],
  total: 2, page: 1, page_size: 50,
};

const renderPage = (path = '/dialtone') =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={[path]}>
        <DialtoneConsole />
      </MemoryRouter>
    </QueryClientProvider>
  );

describe('DialtoneConsole page', () => {
  beforeEach(() => {
    mockConsole.mockReturnValue({ data: CONSOLE, isLoading: false, refetch: vi.fn(), isFetching: false });
    mockActivity.mockReturnValue({ data: FEED, isLoading: false });
  });

  it('renders the console header, warm-up progress and today tallies', () => {
    renderPage();
    expect(screen.getByText('Dialtone Console')).toBeInTheDocument();
    expect(screen.getByText('Warm-up progress')).toBeInTheDocument();
    // Warm-up "8 / 20 today" (8 also appears in the tallies, so assert ≥1).
    expect(screen.getAllByText('8').length).toBeGreaterThan(0);
    expect(screen.getByText(/\/ 20 today/)).toBeInTheDocument();
    // Sender surfaced.
    expect(screen.getByText('suman.das@apprend.tech')).toBeInTheDocument();
  });

  it('renders the activity feed events', () => {
    renderPage();
    expect(screen.getByText('Email sent to John Smith')).toBeInTheDocument();
    expect(screen.getByText('Jane Doe replied')).toBeInTheDocument();
    expect(screen.getByText('john@acme.com')).toBeInTheDocument();
  });

  it('shows an empty state when the feed is empty', () => {
    mockActivity.mockReturnValue({ data: { items: [], total: 0, page: 1, page_size: 50 }, isLoading: false });
    renderPage();
    expect(screen.getByText('No activity yet')).toBeInTheDocument();
  });

  it('links each tally to the activity log filtered to those events', () => {
    renderPage();
    // The tallies are scoped to the console's reporting day, so the drill-down
    // carries that day too — an unbounded link would open every send ever and
    // fail to reconcile with the number just clicked.
    expect(screen.getByRole('link', { name: /^Sent: 8/ })).toHaveAttribute(
      'href',
      '/dialtone?type=email_sent&start=2026-07-15&end=2026-07-15'
    );
    expect(screen.getByRole('link', { name: /^Leads found: 3/ })).toHaveAttribute(
      'href',
      '/dialtone?type=lead_discovered&start=2026-07-15&end=2026-07-15'
    );
    // Warm-up headroom isn't a count of events, so it stays inert.
    expect(screen.queryByRole('link', { name: /^Remaining/ })).toBeNull();
  });

  it('drills into exactly the day the tallies count', () => {
    renderPage('/dialtone?type=email_sent&start=2026-07-15&end=2026-07-15');
    // Round-trip: following a tile asks the feed for that one day, with `end`
    // expanded so the day isn't truncated at midnight.
    expect(mockActivity).toHaveBeenCalledWith(
      expect.objectContaining({
        types: 'email_sent',
        start: '2026-07-15',
        end: '2026-07-15T23:59:59',
      })
    );
  });

  it('still links a tile when the console reports no date', () => {
    mockConsole.mockReturnValue({ data: { ...CONSOLE, date: undefined }, isLoading: false, refetch: vi.fn() });
    renderPage();
    // Degrade to the unbounded link rather than emitting `start=undefined`.
    expect(screen.getByRole('link', { name: /^Sent: 8/ })).toHaveAttribute('href', '/dialtone?type=email_sent');
  });

  it('applies a type filter arriving from the URL', () => {
    renderPage('/dialtone?type=lead_discovered');
    expect(mockActivity).toHaveBeenCalledWith(expect.objectContaining({ types: 'lead_discovered' }));
  });

  it('asks for the whole of the chosen end date, not midnight', () => {
    renderPage('/dialtone?end=2026-07-15');
    expect(mockActivity).toHaveBeenCalledWith(expect.objectContaining({ end: '2026-07-15T23:59:59' }));
  });

  it('links a discovered lead to its company, and a send to its contact', () => {
    mockActivity.mockReturnValue({
      data: {
        items: [
          {
            id: 'lead_discovered:1', type: 'lead_discovered', timestamp: new Date().toISOString(),
            title: 'Lead discovered: Acme Metals', description: 'Fit 72/100 · review',
            source: 'prospecting', severity: 'ok', metadata: { candidate_id: 'p-1', company_id: 'co-9' },
          },
          ...FEED.items,
        ],
        total: 3, page: 1, page_size: 50,
      },
      isLoading: false,
    });
    renderPage();
    expect(screen.getByRole('link', { name: /Lead discovered: Acme Metals/ })).toHaveAttribute('href', '/companies/co-9');
    expect(screen.getByRole('link', { name: /Email sent to John Smith/ })).toHaveAttribute('href', '/contacts?highlight=c-1');
    // The reply carries no contact_id, so it has nowhere to go and isn't a link.
    expect(screen.queryByRole('link', { name: /Jane Doe replied/ })).toBeNull();
  });

  it('expands a send that carries its copy, and shows the subject + body', () => {
    mockActivity.mockReturnValue({
      data: {
        items: [{
          id: 'outreach:1', type: 'email_sent', timestamp: new Date().toISOString(),
          title: 'Sequence step 1: email to John Smith', description: 'Quick question about your CNC line',
          source: 'outreach', severity: 'ok',
          metadata: {
            contact_id: 'c-1', contact_name: 'John Smith', to_email: 'john@acme.com',
            subject: 'Quick question about your CNC line',
            body_html: '<p>Hi John, saw you run 5-axis machining…</p>',
          },
        }],
        total: 1, page: 1, page_size: 50,
      },
      isLoading: false,
    });
    renderPage();
    // A send with its copy is a disclosure button, not a navigation link.
    expect(screen.queryByRole('link', { name: /email to John Smith/ })).toBeNull();
    const toggle = screen.getByRole('button', { name: /read email/i });
    expect(screen.queryByText(/saw you run 5-axis machining/)).toBeNull();
    fireEvent.click(toggle);
    expect(screen.getByText(/saw you run 5-axis machining/)).toBeInTheDocument();
    expect(screen.getByText(/Subject:/)).toBeInTheDocument();
  });

  it('sends a candidate with no company yet to the review queue', () => {
    mockActivity.mockReturnValue({
      data: {
        items: [{
          id: 'lead_discovered:2', type: 'lead_discovered', timestamp: new Date().toISOString(),
          title: 'Lead discovered: Beta Works', description: 'Fit 60/100 · review',
          source: 'prospecting', severity: 'ok', metadata: { candidate_id: 'p-2', company_id: null },
        }],
        total: 1, page: 1, page_size: 50,
      },
      isLoading: false,
    });
    renderPage();
    expect(screen.getByRole('link', { name: /Lead discovered: Beta Works/ })).toHaveAttribute('href', '/prospecting');
  });
});
