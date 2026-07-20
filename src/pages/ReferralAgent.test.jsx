import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockGetConfig = vi.fn();
const mockUpdateConfig = vi.fn();
const mockListReferrals = vi.fn();
const mockCreateReferral = vi.fn();
const mockUpdateReferral = vi.fn();
const mockListActions = vi.fn();
const mockApprove = vi.fn();
const mockDismiss = vi.fn();
const mockStats = vi.fn();

vi.mock('../api/client', () => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn() },
  queryClient: { invalidateQueries: vi.fn(), setQueryData: vi.fn() },
  referralAgentApi: {
    getConfig: (...a) => mockGetConfig(...a),
    updateConfig: (...a) => mockUpdateConfig(...a),
    listReferrals: (...a) => mockListReferrals(...a),
    createReferral: (...a) => mockCreateReferral(...a),
    updateReferral: (...a) => mockUpdateReferral(...a),
    listActions: (...a) => mockListActions(...a),
    approveAction: (...a) => mockApprove(...a),
    dismissAction: (...a) => mockDismiss(...a),
    getStats: (...a) => mockStats(...a),
  },
}));
vi.mock('react-hot-toast', () => ({
  default: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }),
}));
vi.mock('../hooks/useCurrentUser', () => ({
  useCurrentUser: () => ({ data: { role: 'org_admin' } }),
}));

import ReferralAgent from './ReferralAgent';

const CONFIG = {
  id: 'cfg-1',
  is_active: false,
  llm_model: 'meta-llama/llama-3.3-70b-instruct:free',
  has_api_key: false,
  min_health_score: 80,
  min_relationship_days: 90,
  max_asks_per_client: 2,
  followup_after_days: 7,
  auto_ask_enabled: false,
  referral_template: null,
  followup_template: null,
  thankyou_template: null,
  created_at: '2026-07-10T09:00:00Z',
  updated_at: '2026-07-16T09:00:00Z',
  available_models: ['meta-llama/llama-3.3-70b-instruct:free'],
};

const REFERRALS = [
  {
    id: 'ref-1', referrer_contact_id: 'c1', referrer_name: 'Dana Owner',
    referred_name: 'Jane Prospect', referred_company: 'Prospect Inc', status: 'received',
    referral_value: null, created_at: '2026-07-15T09:00:00Z', updated_at: '2026-07-15T09:00:00Z',
  },
  {
    id: 'ref-2', referrer_contact_id: 'c1', referrer_name: 'Dana Owner',
    referred_name: 'Bob Buyer', referred_company: 'Buyer LLC', status: 'converted',
    referral_value: 2500000, created_at: '2026-07-14T09:00:00Z', updated_at: '2026-07-16T09:00:00Z',
  },
];

const ACTIONS = [
  {
    id: 'act-1', referrer_contact_id: 'c1', referrer_name: 'Dana Owner', referral_id: 'ref-1',
    action_type: 'initial_ask', status: 'pending', ai_subject: 'A quick favor, Dana?',
    ai_message: 'Hi Dana, know anyone who might benefit?', created_at: '2026-07-16T09:00:00Z',
  },
];

const STATS = {
  identified: 1, asked: 2, pending: 0, received: 1, converted: 1, declined: 0,
  total: 5, response_rate: 0.5, conversion_rate: 0.5, total_referral_value: 2500000,
  pending_actions: 1,
};

const renderPage = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter>
        <ReferralAgent />
      </MemoryRouter>
    </QueryClientProvider>
  );

describe('ReferralAgent page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetConfig.mockResolvedValue(CONFIG);
    mockListReferrals.mockResolvedValue(REFERRALS);
    mockListActions.mockResolvedValue(ACTIONS);
    mockStats.mockResolvedValue(STATS);
    mockUpdateConfig.mockResolvedValue({ ...CONFIG, is_active: true });
    mockApprove.mockResolvedValue({ send_status: 'sent', action: { ...ACTIONS[0], status: 'sent' } });
    mockDismiss.mockResolvedValue({ ...ACTIONS[0], status: 'dismissed' });
  });

  it('renders headline stats', async () => {
    renderPage();
    expect(await screen.findByText('Response rate')).toBeInTheDocument();
    // total referral value formatted as ₹ (2,500,000 paise → ₹25,000)
    expect(await screen.findByText('₹25,000')).toBeInTheDocument();
  });

  it('toggles the agent on via the power switch', async () => {
    const user = userEvent.setup();
    renderPage();
    const toggle = await screen.findByRole('button', { name: /agent off/i });
    await user.click(toggle);
    await waitFor(() => expect(mockUpdateConfig).toHaveBeenCalledWith({ is_active: true }));
  });

  it('opens the configuration panel and shows the model + key inputs', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('button', { name: /configure/i }));
    expect(await screen.findByText('LLM model')).toBeInTheDocument();
    expect(screen.getByText(/OpenRouter API key/i)).toBeInTheDocument();
    expect(screen.getByText(/Minimum health score/i)).toBeInTheDocument();
  });

  it('lists pending actions and approves one', async () => {
    const user = userEvent.setup();
    renderPage();
    expect(await screen.findByText('Initial ask')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /approve/i }));
    await waitFor(() => expect(mockApprove).toHaveBeenCalledWith('act-1'));
  });

  it('shows referral pipeline cards and the chain view', async () => {
    renderPage();
    // Referred people appear in the pipeline (and again in the chain view).
    expect((await screen.findAllByText('Jane Prospect')).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Bob Buyer').length).toBeGreaterThan(0);
    // Chain groups by referrer.
    expect(screen.getByText('Referral chains')).toBeInTheDocument();
    expect(screen.getAllByText('Dana Owner').length).toBeGreaterThan(0);
  });

  it('opens the add-referral modal', async () => {
    const user = userEvent.setup();
    renderPage();
    const addButtons = await screen.findAllByRole('button', { name: /add referral/i });
    await user.click(addButtons[0]);
    const dialog = await screen.findByRole('dialog', { name: /add referral/i });
    expect(within(dialog).getByText('Referred person')).toBeInTheDocument();
  });
});
