import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

// Mock the data hooks so the page renders deterministically without a backend.
const mockConfig = vi.fn();
const mockUpdate = vi.fn();
const mockSignals = vi.fn();
const mockAction = vi.fn();
const mockDismiss = vi.fn();
const mockMonitored = vi.fn();
const mockAddMonitored = vi.fn();
const mockRemoveMonitored = vi.fn();
const mockStats = vi.fn();
const mockScan = vi.fn();

const mutation = (fn) => ({ mutate: fn, isLoading: false });

vi.mock('../hooks/useSocialListening', async () => {
  const actual = await vi.importActual('../hooks/useSocialListening');
  return {
    LLM_MODELS: actual.LLM_MODELS,
    SIGNAL_TYPES: actual.SIGNAL_TYPES,
    useAgentConfig: () => mockConfig(),
    useUpdateAgentConfig: () => mutation(mockUpdate),
    useSignals: (...a) => mockSignals(...a),
    useActionSignal: () => mutation(mockAction),
    useDismissSignal: () => mutation(mockDismiss),
    useMonitoredCompanies: () => mockMonitored(),
    useAddMonitoredCompany: () => mutation(mockAddMonitored),
    useRemoveMonitoredCompany: () => mutation(mockRemoveMonitored),
    useSignalStats: () => mockStats(),
    useScanNow: () => mutation(mockScan),
  };
});

let isAdmin = true;
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: { email: 'admin@acme.io' }, isAdmin }),
}));

// recharts' ResponsiveContainer needs a sized parent in jsdom; stub it out.
vi.mock('recharts', async () => {
  const actual = await vi.importActual('recharts');
  return { ...actual, ResponsiveContainer: ({ children }) => <div>{children}</div> };
});

import SocialListening from './SocialListening';

const CONFIG = {
  id: 'a1',
  is_active: true,
  llm_model: 'google/gemma-3-27b-it:free',
  has_api_key: false,
  monitored_keywords: ['funding'],
  monitored_industries: ['cnc_machining'],
  news_sources: [],
  min_relevance_score: 70,
  auto_create_leads: false,
  auto_enroll_dialtone: false,
  scan_frequency_hours: 24,
  last_scan_at: null,
  created_at: '2026-07-17T00:00:00Z',
  updated_at: '2026-07-17T00:00:00Z',
  available_models: [
    'meta-llama/llama-3.3-70b-instruct:free',
    'google/gemma-3-27b-it:free',
  ],
};

const SIGNALS = [
  {
    id: 's1', source_type: 'news', source_url: 'https://x.com/a',
    company_name: 'Acme Corp', company_domain: 'acme.com', company_id: null,
    headline: 'Acme raises $20M Series B', summary: 'Acme raised a round.',
    relevance_score: 88, signal_type: 'funding', status: 'new',
    lead_created: false, contact_id: null, created_at: '2026-07-17T10:00:00Z',
  },
  {
    id: 's2', source_type: 'job_posting', source_url: null,
    company_name: 'Beta Inc', company_domain: null, company_id: null,
    headline: 'Beta hiring Sales Manager', summary: null,
    relevance_score: 55, signal_type: 'hiring', status: 'actioned',
    lead_created: true, contact_id: 'c9', created_at: '2026-07-16T10:00:00Z',
  },
];

const STATS = {
  total_signals: 12,
  signals_this_week: 5,
  leads_created: 3,
  dismissed: 2,
  conversion_rate: 25.0,
  by_signal_type: [
    { signal_type: 'funding', count: 6 },
    { signal_type: 'hiring', count: 4 },
  ],
  top_companies: [{ company_name: 'Acme Corp', count: 3 }],
};

function renderPage() {
  return render(
    <MemoryRouter>
      <SocialListening />
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  isAdmin = true;
  mockConfig.mockReturnValue({ data: CONFIG, isLoading: false, isError: false });
  mockSignals.mockReturnValue({ data: SIGNALS, isLoading: false });
  mockMonitored.mockReturnValue({ data: [{ id: 'm1', company_name: 'Gamma LLC', domain: 'gamma.com', monitor_news: true, monitor_jobs: true }], isLoading: false });
  mockStats.mockReturnValue({ data: STATS });
});

describe('SocialListening', () => {
  it('renders the header, toggle, and stats', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: /Social Listening Agent/i })).toBeInTheDocument();
    expect(screen.getByText(/Agent is listening/i)).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument(); // signals this week
    expect(screen.getByText('25%')).toBeInTheDocument(); // conversion
  });

  it('shows the ON/OFF toggle reflecting active state and toggles it', async () => {
    renderPage();
    const user = userEvent.setup();
    const switches = screen.getAllByRole('switch');
    const power = switches[0];
    expect(power).toHaveAttribute('aria-checked', 'true');
    await user.click(power);
    expect(mockUpdate).toHaveBeenCalledWith({ is_active: false });
  });

  it('lists signals with relevance and type', () => {
    renderPage();
    expect(screen.getByText('Acme raises $20M Series B')).toBeInTheDocument();
    expect(screen.getByText('88')).toBeInTheDocument(); // relevance badge
    // "Funding" appears in both the filter dropdown and the signal badge.
    expect(screen.getAllByText('Funding').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Beta hiring Sales Manager')).toBeInTheDocument();
  });

  it('creates a lead from a new signal and shows Lead badge for actioned', async () => {
    renderPage();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /Create lead/i }));
    expect(mockAction).toHaveBeenCalledWith('s1');
    // The actioned signal (s2) shows a Lead badge, not a Create button.
    expect(screen.getByText('Lead')).toBeInTheDocument();
  });

  it('dismisses a signal', async () => {
    renderPage();
    const user = userEvent.setup();
    // Both a new and an actioned (not-yet-dismissed) signal can be dismissed;
    // the first Dismiss button is the top signal (s1).
    await user.click(screen.getAllByRole('button', { name: /Dismiss/i })[0]);
    expect(mockDismiss).toHaveBeenCalledWith('s1');
  });

  it('adds a monitored company', async () => {
    renderPage();
    const user = userEvent.setup();
    await user.type(screen.getByPlaceholderText(/Company name/i), 'New Watched Co');
    // The add button in the monitored section (icon-only Plus) — click via the
    // domain input's sibling. Query all Plus buttons and use the monitored one.
    await user.type(screen.getByPlaceholderText(/domain\.com/i), 'watched.co{Enter}');
    // mutate is called as (payload, { onSuccess }); assert on the payload arg.
    expect(mockAddMonitored).toHaveBeenCalled();
    expect(mockAddMonitored.mock.calls.at(-1)[0]).toMatchObject({
      company_name: 'New Watched Co', domain: 'watched.co',
    });
  });

  it('saves configuration changes', async () => {
    renderPage();
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /Save settings/i }));
    expect(mockUpdate).toHaveBeenCalled();
    const payload = mockUpdate.mock.calls.at(-1)[0];
    expect(payload).toMatchObject({ llm_model: 'google/gemma-3-27b-it:free', min_relevance_score: 70 });
    // Untouched key field must NOT be sent.
    expect(payload).not.toHaveProperty('llm_api_key');
  });

  it('sends the api key only when the field is edited', async () => {
    renderPage();
    const user = userEvent.setup();
    await user.type(screen.getByPlaceholderText(/leave blank to keep|sk-or-/i), 'sk-or-newkey');
    await user.click(screen.getByRole('button', { name: /Save settings/i }));
    const payload = mockUpdate.mock.calls.at(-1)[0];
    expect(payload.llm_api_key).toBe('sk-or-newkey');
  });

  it('hides write actions for non-admins', () => {
    isAdmin = false;
    renderPage();
    expect(screen.queryByRole('button', { name: /Save settings/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Create lead/i })).not.toBeInTheDocument();
    expect(screen.getByText(/Only an org admin can change these settings/i)).toBeInTheDocument();
  });

  it('renders the signal-type breakdown chart', () => {
    renderPage();
    expect(screen.getByText('Signal types')).toBeInTheDocument();
  });

  it('shows an empty state when there are no signals', () => {
    mockSignals.mockReturnValue({ data: [], isLoading: false });
    renderPage();
    expect(screen.getByText(/No signals yet/i)).toBeInTheDocument();
  });
});
