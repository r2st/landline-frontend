import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockGetConfig = vi.fn();
const mockUpdateConfig = vi.fn();
const mockListActions = vi.fn();
const mockApprove = vi.fn();
const mockDismiss = vi.fn();
const mockStats = vi.fn();

vi.mock('../api/client', () => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn() },
  queryClient: { invalidateQueries: vi.fn(), setQueryData: vi.fn() },
  dealAgentApi: {
    getConfig: (...a) => mockGetConfig(...a),
    updateConfig: (...a) => mockUpdateConfig(...a),
    listActions: (...a) => mockListActions(...a),
    approveAction: (...a) => mockApprove(...a),
    dismissAction: (...a) => mockDismiss(...a),
    stats: (...a) => mockStats(...a),
  },
}));
vi.mock('react-hot-toast', () => ({
  default: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }),
}));

import DealAgent from './DealAgent';

const CONFIG = {
  id: 'cfg-1',
  is_active: true,
  stale_thresholds: { qualification: 5, discovery: 3, proposal: 5, negotiation: 7, closing: 7 },
  auto_advance_enabled: false,
  auto_followup_enabled: true,
  max_auto_followups_per_deal: 3,
  escalation_threshold_days: 14,
  llm_model: 'meta-llama/llama-3.3-70b-instruct:free',
  has_llm_api_key: false,
  llm_model_choices: [
    'meta-llama/llama-3.3-70b-instruct:free',
    'openai/gpt-oss-20b:free',
    'openai/gpt-oss-120b:free',
    'google/gemma-3-27b-it:free',
  ],
  created_at: '2026-07-10T09:00:00Z',
  updated_at: '2026-07-16T09:00:00Z',
};

const STATS = {
  deals_nudged: 12,
  followups_sent: 4,
  stage_advances: 2,
  at_risk_count: 3,
  pending_actions: 5,
  suggestions: 6,
  escalations: 1,
};

const PENDING_FOLLOWUP = {
  id: 'act-1',
  deal_id: 'deal-1',
  action_type: 'auto_followup',
  status: 'pending',
  ai_reasoning: 'No activity for 5 days on a discovery deal.',
  suggested_action: 'Send a follow-up to john@acme.com.',
  email_subject: 'quick nudge',
  email_body: 'Just floating this back up — still worth a chat?',
  deal_title: 'Annual contract',
  company_name: 'Acme Stamping',
  created_at: '2026-07-16T09:00:00Z',
};

const EXECUTED_SUGGESTION = {
  id: 'act-2',
  deal_id: 'deal-2',
  action_type: 'suggestion',
  status: 'executed',
  suggested_action: 'Get the buyer on a call.',
  deal_title: 'Expansion',
  company_name: 'Globex',
  created_at: '2026-07-15T09:00:00Z',
  executed_at: '2026-07-16T10:00:00Z',
};

function renderPage() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <DealAgent />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetConfig.mockResolvedValue(CONFIG);
  mockStats.mockResolvedValue(STATS);
  // Default: queue query (status=pending) + activity feed (limit) both hit this.
  mockListActions.mockImplementation((params) => {
    if (params?.status === 'pending') return Promise.resolve([PENDING_FOLLOWUP]);
    return Promise.resolve([PENDING_FOLLOWUP, EXECUTED_SUGGESTION]);
  });
  mockApprove.mockResolvedValue({ ...PENDING_FOLLOWUP, status: 'executed' });
  mockDismiss.mockResolvedValue({ ...PENDING_FOLLOWUP, status: 'dismissed' });
});

describe('DealAgent', () => {
  it('renders header, stats, and the config panel', async () => {
    renderPage();
    expect(screen.getByRole('heading', { name: /Deal Progression Agent/i })).toBeInTheDocument();

    // Stats
    expect(await screen.findByText('12')).toBeInTheDocument(); // deals nudged
    expect(screen.getByText('Follow-ups sent')).toBeInTheDocument();

    // Config panel with per-stage thresholds
    expect(await screen.findByLabelText(/discovery stale threshold/i)).toHaveValue(3);
    expect(screen.getByLabelText(/Escalation threshold in days/i)).toHaveValue(14);
  });

  it('shows the pending action with an approve (send) button', async () => {
    renderPage();
    expect(await screen.findByText('Annual contract')).toBeInTheDocument();
    expect(screen.getByText(/Send a follow-up to john@acme.com/)).toBeInTheDocument();
    // Follow-up with a draft → the approve button reads "Send".
    expect(screen.getByRole('button', { name: /^Send$/ })).toBeInTheDocument();
  });

  it('approves an action', async () => {
    const user = userEvent.setup();
    renderPage();
    const sendBtn = await screen.findByRole('button', { name: /^Send$/ });
    await user.click(sendBtn);
    await waitFor(() => expect(mockApprove).toHaveBeenCalledWith('act-1'));
  });

  it('dismisses an action', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Annual contract');
    // The dismiss button is the icon-only button with title "Dismiss".
    const dismissBtn = screen.getByTitle('Dismiss');
    await user.click(dismissBtn);
    await waitFor(() => expect(mockDismiss).toHaveBeenCalledWith('act-1'));
  });

  it('toggles agent active state', async () => {
    const user = userEvent.setup();
    mockUpdateConfig.mockResolvedValue({ ...CONFIG, is_active: false });
    renderPage();
    const toggle = await screen.findByRole('button', { name: /Agent active/i });
    await user.click(toggle);
    await waitFor(() =>
      expect(mockUpdateConfig).toHaveBeenCalledWith({ is_active: false }),
    );
  });

  it('saves config changes including the selected model', async () => {
    const user = userEvent.setup();
    mockUpdateConfig.mockResolvedValue(CONFIG);
    renderPage();
    const save = await screen.findByRole('button', { name: /Save settings/i });
    await user.click(save);
    await waitFor(() => expect(mockUpdateConfig).toHaveBeenCalled());
    const payload = mockUpdateConfig.mock.calls[0][0];
    expect(payload).toHaveProperty('stale_thresholds');
    expect(payload).toHaveProperty('escalation_threshold_days', 14);
    expect(payload).toHaveProperty('llm_model', 'meta-llama/llama-3.3-70b-instruct:free');
    // No key typed → the key field is omitted, not sent blank.
    expect(payload).not.toHaveProperty('llm_api_key');
  });

  it('renders the model dropdown from the config choices', async () => {
    renderPage();
    const select = await screen.findByLabelText('AI model');
    expect(select).toHaveValue('meta-llama/llama-3.3-70b-instruct:free');
    expect(within(select).getByRole('option', { name: /GPT-OSS 120B/i })).toBeInTheDocument();
    expect(within(select).getByRole('option', { name: /Gemma 3 27B/i })).toBeInTheDocument();
  });

  it('changes the model and sends it on save', async () => {
    const user = userEvent.setup();
    mockUpdateConfig.mockResolvedValue(CONFIG);
    renderPage();
    const select = await screen.findByLabelText('AI model');
    await user.selectOptions(select, 'google/gemma-3-27b-it:free');
    await user.click(screen.getByRole('button', { name: /Save settings/i }));
    await waitFor(() => expect(mockUpdateConfig).toHaveBeenCalled());
    expect(mockUpdateConfig.mock.calls[0][0]).toHaveProperty(
      'llm_model', 'google/gemma-3-27b-it:free',
    );
  });

  it('sends a newly typed API key on save', async () => {
    const user = userEvent.setup();
    mockUpdateConfig.mockResolvedValue({ ...CONFIG, has_llm_api_key: true });
    renderPage();
    const keyInput = await screen.findByLabelText('OpenRouter API key');
    await user.type(keyInput, 'sk-or-newkey');
    await user.click(screen.getByRole('button', { name: /Save settings/i }));
    await waitFor(() => expect(mockUpdateConfig).toHaveBeenCalled());
    expect(mockUpdateConfig.mock.calls[0][0]).toHaveProperty('llm_api_key', 'sk-or-newkey');
  });

  it('shows a "key set" badge and can clear the stored key', async () => {
    const user = userEvent.setup();
    mockGetConfig.mockResolvedValue({ ...CONFIG, has_llm_api_key: true });
    mockUpdateConfig.mockResolvedValue({ ...CONFIG, has_llm_api_key: false });
    renderPage();
    expect(await screen.findByText('key set')).toBeInTheDocument();
    // The only checkbox on the page is the "remove saved key" toggle.
    const clear = screen.getByRole('checkbox');
    await user.click(clear);
    await user.click(screen.getByRole('button', { name: /Save settings/i }));
    await waitFor(() => expect(mockUpdateConfig).toHaveBeenCalled());
    expect(mockUpdateConfig.mock.calls[0][0]).toHaveProperty('llm_api_key', '');
  });

  it('shows recent activity for executed actions', async () => {
    renderPage();
    const feed = (await screen.findByText('Recent activity')).closest('section');
    expect(await within(feed).findByText(/Expansion/)).toBeInTheDocument();
    // The executed suggestion shows an "executed" status badge.
    expect(within(feed).getByText('executed')).toBeInTheDocument();
  });
});
