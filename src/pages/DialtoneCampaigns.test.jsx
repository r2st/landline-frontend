import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockCampaigns = vi.fn();
const mockLeads = vi.fn();
vi.mock('../api/client', () => ({
  api: { get: vi.fn(), post: vi.fn() },
  queryClient: { invalidateQueries: vi.fn(), setQueryData: vi.fn() },
  dialtoneApi: {
    campaignAnalytics: (...a) => mockCampaigns(...a),
    rankedLeads: (...a) => mockLeads(...a),
  },
  sendTimingApi: {},
}));

import DialtoneCampaigns from './DialtoneCampaigns';

// A campaign whose reply rate looks respectable and whose opt-out rate says the
// list hates it — the pairing the screen exists to make visible.
const BURNING = {
  sequence_id: 'seq-burning',
  name: 'CNC Blast',
  industry: 'cnc_machining',
  tone: 'direct',
  status: 'active',
  is_active: true,
  total_enrollments: 400,
  active_enrollments: 120,
  sent: 400,
  opened: 160,
  clicked: 20,
  replied: 12,
  bounced: 4,
  unsubscribed: 18,
  open_rate: 0.4,
  click_rate: 0.05,
  reply_rate: 0.03,
  bounce_rate: 0.01,
  unsubscribe_rate: 0.045,
  deals_attributed: 2,
  conversion_rate: 0.005,
  ai_composed: 400,
  ai_composed_rate: 1.0,
  avg_personalization_depth: 6.2,
  last_send_at: '2026-08-01T09:00:00Z',
  reply_rate_ci_low: 0.017,
  sample_sufficient: true,
};

const QUIET = {
  ...BURNING,
  sequence_id: 'seq-quiet',
  name: 'Fabrication Warm',
  unsubscribed: 0,
  unsubscribe_rate: 0.0,
  ai_composed: 0,
  ai_composed_rate: 0.0,
  avg_personalization_depth: 0.0,
};

const TOTALS = {
  ...BURNING,
  sequence_id: 'totals',
  name: 'All campaigns',
  sent: 800,
  opened: 320,
  clicked: 40,
  replied: 24,
  deals_attributed: 4,
  total_enrollments: 800,
};

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <DialtoneCampaigns />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('DialtoneCampaigns', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCampaigns.mockResolvedValue({
      timeframe_days: 30,
      campaigns: [BURNING, QUIET],
      totals: TOTALS,
    });
    mockLeads.mockResolvedValue({ leads: [], tier_counts: {}, total_ranked: 0 });
  });

  it('renders a row per campaign with the rates side by side', async () => {
    renderPage();

    const row = within(await screen.findByRole('row', { name: /CNC Blast/ }));
    expect(row.getByText('40.0%')).toBeInTheDocument();   // open
    expect(row.getByText('3.0%')).toBeInTheDocument();    // reply
    expect(row.getByText('2')).toBeInTheDocument();       // deals
  });

  it('shows the unsubscribe rate, which is the number the send domain lives on', async () => {
    // It reported a structural 0.0% on every campaign until the opt-out path
    // started recording the event these columns are summed from. A rate nobody
    // can see is a rate nobody acts on.
    renderPage();

    const burning = within(await screen.findByRole('row', { name: /CNC Blast/ }));
    expect(burning.getByText('4.5%')).toBeInTheDocument();
    const quiet = within(screen.getByRole('row', { name: /Fabrication Warm/ }));
    expect(quiet.getAllByText('0.0%').length).toBeGreaterThan(0);
  });

  it('scopes the request to the selected window and re-requests on change', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole('row', { name: /CNC Blast/ });

    // 30 days is the default — a whole-history table hides a campaign that
    // stopped working last week behind the months when it worked.
    expect(mockCampaigns).toHaveBeenCalledWith(
      expect.objectContaining({ days: 30, sort_by: 'reply_rate' })
    );

    await user.click(screen.getByRole('button', { name: 'All time' }));
    // All time drops the bound rather than sending days=0, which the server
    // would read as an empty window.
    await vi.waitFor(() =>
      expect(mockCampaigns).toHaveBeenCalledWith(
        expect.not.objectContaining({ days: expect.anything() })
      )
    );
  });

  it('sorts server-side, so the ranking is the one the API defines', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByRole('row', { name: /CNC Blast/ });

    await user.selectOptions(screen.getByRole('combobox'), 'open_rate');
    await vi.waitFor(() =>
      expect(mockCampaigns).toHaveBeenCalledWith(
        expect.objectContaining({ sort_by: 'open_rate' })
      )
    );
  });

  it('says nothing went out rather than rendering an empty table', async () => {
    mockCampaigns.mockResolvedValue({ timeframe_days: 30, campaigns: [], totals: null });
    renderPage();

    expect(await screen.findByText(/No campaign sends in this window/i)).toBeInTheDocument();
  });

  it('survives a backend hiccup without blanking the page', async () => {
    // The hook swallows the error into an empty shape on purpose: a transient
    // 500 on a polling dashboard should not replace the screen with a stack.
    mockCampaigns.mockRejectedValue(new Error('boom'));
    mockLeads.mockRejectedValue(new Error('boom'));
    renderPage();

    expect(await screen.findByText(/No campaign sends in this window/i)).toBeInTheDocument();
    expect(screen.getByText(/Warmest prospects right now/i)).toBeInTheDocument();
  });

  it('ranks the warmest prospects with the reason each one is there', async () => {
    mockLeads.mockResolvedValue({
      leads: [{
        contact_id: 'c-1',
        contact_name: 'Dana Reeves',
        email: 'dana@acme.test',
        company_name: 'Acme Stamping',
        score: 78.4,
        tier: 'hot',
        last_engaged_at: '2026-08-01T12:00:00Z',
        reasons: ['Replied 1×', 'Clicked a link 2×'],
      }],
      tier_counts: { hot: 1 },
      total_ranked: 1,
    });
    renderPage();

    expect(await screen.findByText('Dana Reeves')).toBeInTheDocument();
    expect(screen.getByText('hot')).toBeInTheDocument();
    // "78.4" alone is not something a rep can act on.
    expect(screen.getByText(/Replied 1× · Clicked a link 2×/)).toBeInTheDocument();
    // Suppressed contacts have no business on a call list, so the page asks for
    // a score floor rather than taking whatever the default returns.
    expect(mockLeads).toHaveBeenCalledWith(
      expect.objectContaining({ limit: 10, min_score: 1 })
    );
  });
});
