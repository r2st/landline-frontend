import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock the data hooks so the page renders deterministically without a backend.
const mockConsole = vi.fn();
const mockActivity = vi.fn();
const mockPhone = vi.fn();
// The embedded live feed polls on its own timer; a quiet stub keeps these tests
// about the page's own rendering rather than the feed's.
const mockLive = vi.fn(() => ({
  items: [], serverTime: null, isLoading: false, isFetching: false, windowHours: 24,
}));
vi.mock('../hooks/useDialtone', () => ({
  useDialtoneConsole: (...a) => mockConsole(...a),
  useDialtoneActivity: (...a) => mockActivity(...a),
  usePhoneEnrichment: (...a) => mockPhone(...a),
  useLiveActivity: (...a) => mockLive(...a),
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

const STATS = {
  emails_sent: 8, opens: 5, clicks: 2, replies: 1, bounces: 0, errors: 0, leads_discovered: 3,
};

const CONSOLE = {
  date: '2026-07-15',
  sending: { enabled: true },
  warmup: {
    today_sent: 8, daily_limit: 20, daily_remaining: 12, monthly_sent: 120,
    warmup_active: true, warmup_week: 1,
  },
  // `stats` is the timeframe-aware field; `today` mirrors it for older clients.
  stats: STATS,
  today: STATS,
  timeframe: 'this_week',
  timeframe_label: 'This week',
  range_start: '2026-07-13',
  range_end: '2026-07-19',
  previous: {
    emails_sent: 4, opens: 5, clicks: 0, replies: 0, bounces: 2, errors: 0, leads_discovered: 0,
  },
  previous_range_start: '2026-07-06',
  previous_range_end: '2026-07-12',
  deltas: {
    emails_sent: 100, opens: 0, clicks: null, replies: null,
    bounces: -100, errors: null, leads_discovered: null,
  },
  rates: { open_rate: 0.625, click_rate: 0.25, reply_rate: 0.125, bounce_rate: 0 },
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
    mockPhone.mockReturnValue({
      data: {
        enriched: 12, attempts: 20, hit_rate: 0.6, apollo: 9, company: 3,
        recent: [
          { contact_id: 'c-9', contact_name: 'Rita Vance', company_name: 'Vance Tooling', phone: '216-555-7777', source: 'apollo', source_label: 'direct dial', enriched_at: '2026-07-15T09:00:00Z' },
        ],
      },
    });
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

  it('renders the phone-enrichment summary card with hit rate and source split', () => {
    renderPage();
    expect(screen.getByText('Phone enrichment')).toBeInTheDocument();
    // Hit rate 0.6 → 60%.
    expect(screen.getByText('60')).toBeInTheDocument();
    // Source split labels + counts. "Direct dial" appears both as the split
    // label and on the recent row's chip, so allow multiples.
    expect(screen.getAllByText(/Direct dial/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Company line/i)).toBeInTheDocument();
    // Recent find surfaced.
    expect(screen.getByText('Rita Vance')).toBeInTheDocument();
  });

  it('shows the enrichment card empty state when nothing is enriched', () => {
    mockPhone.mockReturnValue({
      data: { enriched: 0, attempts: 0, hit_rate: 0, apollo: 0, company: 0, recent: [] },
    });
    renderPage();
    expect(screen.getByText(/no numbers found in this period/i)).toBeInTheDocument();
  });

  it('shows an empty state when the feed is empty', () => {
    mockActivity.mockReturnValue({ data: { items: [], total: 0, page: 1, page_size: 50 }, isLoading: false });
    renderPage();
    expect(screen.getByText('No activity yet')).toBeInTheDocument();
  });

  it('links each tally to the activity log filtered to those events', () => {
    renderPage();
    // The window is already the page's (the default timeframe), so a tile only
    // has to add the event type.
    expect(screen.getByRole('link', { name: /^Sent: 8/ })).toHaveAttribute(
      'href',
      '/dialtone?type=email_sent'
    );
    expect(screen.getByRole('link', { name: /^Leads found: 3/ })).toHaveAttribute(
      'href',
      '/dialtone?type=lead_discovered'
    );
    // Warm-up headroom isn't a count of events, so it stays inert.
    expect(screen.queryByRole('link', { name: /^Remaining/ })).toBeNull();
  });

  it('carries a non-default timeframe into the drill-down', () => {
    // Otherwise clicking "Sent" while viewing Last month would open the feed on
    // this week's rows — the number and the list wouldn't reconcile.
    renderPage('/dialtone?timeframe=last_month');
    expect(screen.getByRole('link', { name: /^Sent: 8/ })).toHaveAttribute(
      'href',
      '/dialtone?type=email_sent&timeframe=last_month'
    );
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

  it('still links a tile when the console reports no window', () => {
    mockConsole.mockReturnValue({
      data: { ...CONSOLE, range_start: null, range_end: null },
      isLoading: false, refetch: vi.fn(),
    });
    renderPage();
    // Degrade to the unbounded link rather than emitting `start=undefined`.
    expect(screen.getByRole('link', { name: /^Sent: 8/ })).toHaveAttribute('href', '/dialtone?type=email_sent');
  });

  // ─── Timeframe selector ───────────────────────────────────────────────────

  it('offers every timeframe and defaults to this week', () => {
    renderPage();
    const group = screen.getByRole('group', { name: /stats timeframe/i });
    expect(group).toBeInTheDocument();
    for (const label of ['Today', 'Yesterday', 'This week', 'Last week',
      'This month', 'Last month', 'All time']) {
      expect(screen.getByRole('button', { name: label })).toBeInTheDocument();
    }
    // Nothing in the URL → this week, and the console is asked for exactly that.
    expect(screen.getByRole('button', { name: 'This week' })).toHaveAttribute('aria-pressed', 'true');
    expect(mockConsole).toHaveBeenCalledWith('this_week');
  });

  it('re-fetches the stats when a timeframe is picked', () => {
    renderPage();
    fireEvent.click(screen.getByRole('button', { name: 'Last month' }));
    expect(mockConsole).toHaveBeenLastCalledWith('last_month');
    expect(screen.getByRole('button', { name: 'Last month' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'This week' })).toHaveAttribute('aria-pressed', 'false');
  });

  it('reads the timeframe from the URL so a console view is shareable', () => {
    renderPage('/dialtone?timeframe=yesterday');
    expect(mockConsole).toHaveBeenCalledWith('yesterday');
    expect(screen.getByRole('button', { name: 'Yesterday' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('scopes the enrichment card to the same timeframe as the stats', () => {
    renderPage('/dialtone?timeframe=this_month');
    expect(mockPhone).toHaveBeenCalledWith(8, 'this_month');
  });

  it('scopes the activity feed to the window the stats cover', () => {
    renderPage();
    // No hand-picked dates: the feed follows the window the API reported for the
    // selected timeframe, so the log under the numbers is the same period.
    expect(mockActivity).toHaveBeenCalledWith(
      expect.objectContaining({ start: '2026-07-13', end: '2026-07-19T23:59:59' })
    );
  });

  it('drops hand-picked dates when the timeframe changes', () => {
    renderPage('/dialtone?start=2026-07-01&end=2026-07-02');
    expect(mockActivity).toHaveBeenCalledWith(
      expect.objectContaining({ start: '2026-07-01' })
    );
    fireEvent.click(screen.getByRole('button', { name: 'Today' }));
    // Back to the reported window — a stale hand-picked range under a new
    // timeframe is exactly the mismatch the selector is meant to remove.
    expect(mockActivity).toHaveBeenLastCalledWith(
      expect.objectContaining({ start: '2026-07-13', end: '2026-07-19T23:59:59' })
    );
  });

  it('shows the window the numbers cover, and that they carry a comparison', () => {
    renderPage();
    expect(screen.getByText(/2026-07-13 → 2026-07-19/)).toBeInTheDocument();
    expect(screen.getByText(/change vs the previous period/i)).toBeInTheDocument();
  });

  it('says so when the window is unbounded', () => {
    mockConsole.mockReturnValue({
      data: {
        ...CONSOLE, timeframe: 'all_time', timeframe_label: 'All time',
        range_start: null, range_end: null, previous: null,
        deltas: { emails_sent: null, opens: null, clicks: null, replies: null,
          bounces: null, errors: null, leads_discovered: null },
      },
      isLoading: false, refetch: vi.fn(),
    });
    renderPage('/dialtone?timeframe=all_time');
    expect(screen.getByText(/all recorded activity/i)).toBeInTheDocument();
    // No baseline to compare against, so no percentage chips are invented.
    expect(screen.queryByText(/vs the previous period/i)).toBeNull();
  });

  // ─── Grouped stats + deltas ───────────────────────────────────────────────

  it('groups the funnel and shows each step against sends', () => {
    renderPage();
    expect(screen.getByText('Outreach funnel')).toBeInTheDocument();
    // Rates arrive as fractions and are shown as whole percentages.
    expect(screen.getByText('63% of sends')).toBeInTheDocument();   // opens 0.625
    expect(screen.getByText('25% of sends')).toBeInTheDocument();   // clicks 0.25
    expect(screen.getByText('13% of sends')).toBeInTheDocument();   // replies 0.125
  });

  it('shows percentage change against the previous period', () => {
    renderPage();
    // Sends doubled: +100%, and up is good here.
    const sent = screen.getByRole('link', { name: /^Sent: 8/ });
    expect(sent).toHaveTextContent('100%');
    expect(sent.querySelector('.text-green-700')).not.toBeNull();
    // Bounces fell to zero: -100%, and down is good — the tone inverts.
    const bounces = screen.getByRole('link', { name: /^Bounces: 0/ });
    expect(bounces).toHaveTextContent('100%');
    expect(bounces.querySelector('.text-green-700')).not.toBeNull();
  });

  it('flags a rise in bounces as bad news', () => {
    mockConsole.mockReturnValue({
      data: { ...CONSOLE, stats: { ...STATS, bounces: 6 }, deltas: { ...CONSOLE.deltas, bounces: 200 } },
      isLoading: false, refetch: vi.fn(),
    });
    renderPage();
    const bounces = screen.getByRole('link', { name: /^Bounces: 6/ });
    expect(bounces).toHaveTextContent('200%');
    expect(bounces.querySelector('.text-red-700')).not.toBeNull();
  });

  it('says "New" rather than inventing a percentage with no baseline', () => {
    renderPage();
    // Clicks went 0 → 2, so a percentage would be division by zero.
    const clicks = screen.getByRole('link', { name: /^Clicks: 2/ });
    expect(clicks).toHaveTextContent('New');
  });

  it('stays silent when a metric is empty in both periods', () => {
    renderPage();
    // Errors: 0 now, 0 before — no chip at all, not "0%" or "New".
    const errors = screen.getByRole('link', { name: /^Errors: 0/ });
    expect(errors).not.toHaveTextContent('New');
    expect(errors).not.toHaveTextContent('%');
  });

  it('renders numbers from an older backend that only sends `today`', () => {
    const legacy = { ...CONSOLE };
    for (const field of ['stats', 'deltas', 'rates', 'previous']) delete legacy[field];
    mockConsole.mockReturnValue({ data: legacy, isLoading: false, refetch: vi.fn() });
    renderPage();
    // `today` is the fallback, so the tiles still read 8 sends rather than 0.
    expect(screen.getByRole('link', { name: /^Sent: 8/ })).toBeInTheDocument();
    // With no `rates` there is no conversion line to draw. Interpolating the
    // missing rate would print the literal "null of sends" — and that's the
    // state of every request between the frontend deploy and the API's.
    expect(screen.queryByText(/null of sends/)).toBeNull();
    expect(screen.queryByText(/null of attempts/)).toBeNull();
    expect(screen.queryByText(/NaN/)).toBeNull();
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
