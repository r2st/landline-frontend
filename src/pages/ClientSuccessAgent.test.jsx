import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockGetConfig = vi.fn();
const mockUpdateConfig = vi.fn();
const mockListActions = vi.fn();
const mockApprove = vi.fn();
const mockDismiss = vi.fn();
const mockStats = vi.fn();
const mockHealth = vi.fn();

vi.mock('../api/client', () => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn() },
  queryClient: { invalidateQueries: vi.fn(), setQueryData: vi.fn() },
  clientSuccessAgentApi: {
    getConfig: (...a) => mockGetConfig(...a),
    updateConfig: (...a) => mockUpdateConfig(...a),
    listActions: (...a) => mockListActions(...a),
    approveAction: (...a) => mockApprove(...a),
    dismissAction: (...a) => mockDismiss(...a),
    stats: (...a) => mockStats(...a),
    healthOverview: (...a) => mockHealth(...a),
  },
}));
vi.mock('react-hot-toast', () => ({
  default: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }),
}));

let mockIsAdmin = true;
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ isAdmin: mockIsAdmin }),
}));

import ClientSuccessAgent from './ClientSuccessAgent';

const CONFIG = {
  id: 'agent-1',
  is_active: false,
  llm_model: 'meta-llama/llama-3.3-70b-instruct:free',
  llm_api_key_set: false,
  llm_api_key_hint: null,
  health_warning_threshold: 60,
  health_critical_threshold: 30,
  check_frequency_days: 7,
  auto_checkin_enabled: true,
  auto_escalation_enabled: true,
  celebration_enabled: true,
  checkin_template: null,
  escalation_template: null,
  celebration_template: null,
  created_at: '2026-07-17T09:00:00Z',
  updated_at: '2026-07-17T09:00:00Z',
  model_options: ['meta-llama/llama-3.3-70b-instruct:free'],
};

const ACTION = {
  id: 'act-1',
  action_type: 'checkin',
  company_name: 'Nimbus Plastics',
  contact_name: 'Dana Lee',
  trigger_reason: 'Health slipped to 45/100.',
  health_score_at_trigger: 45,
  ai_message: 'Hi Dana, checking in…',
  status: 'pending',
  created_at: '2026-07-17T08:00:00Z',
};

const STATS = {
  clients_monitored: 4, checkins_sent: 2, escalations: 1,
  celebrations: 3, review_calls: 0, pending_actions: 1,
};

const HEALTH = {
  clients: [
    { company_id: 'c1', company_name: 'Nimbus Plastics', score: 24, health_status: 'churned', previous_score: 40, trend: 'down', last_contact_date: null },
  ],
};

const renderPage = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter>
        <ClientSuccessAgent />
      </MemoryRouter>
    </QueryClientProvider>
  );

describe('ClientSuccessAgent page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAdmin = true;
    mockGetConfig.mockResolvedValue(CONFIG);
    mockUpdateConfig.mockResolvedValue({ ...CONFIG, is_active: true });
    mockListActions.mockResolvedValue({ actions: [ACTION], total: 1 });
    mockApprove.mockResolvedValue({ ...ACTION, status: 'sent' });
    mockDismiss.mockResolvedValue({ ...ACTION, status: 'dismissed' });
    mockStats.mockResolvedValue(STATS);
    mockHealth.mockResolvedValue(HEALTH);
  });

  it('renders the toggle, stats, action queue, and health overview', async () => {
    renderPage();
    expect(await screen.findByText('Agent is OFF')).toBeInTheDocument();
    // Stats
    expect(await screen.findByText('Clients Monitored')).toBeInTheDocument();
    // Action queue enriched fields
    expect(await screen.findAllByText('Nimbus Plastics')).toBeTruthy();
    expect(screen.getByText('Dana Lee')).toBeInTheDocument();
    expect(screen.getByText('Hi Dana, checking in…')).toBeInTheDocument();
    // Health overview score
    expect(await screen.findByText('24')).toBeInTheDocument();
  });

  it('flips the master switch through updateConfig', async () => {
    renderPage();
    const toggle = await screen.findByRole('switch', { name: /toggle client success agent/i });
    await userEvent.click(toggle);
    await waitFor(() => expect(mockUpdateConfig).toHaveBeenCalledWith({ is_active: true }));
  });

  it('approves a pending action', async () => {
    renderPage();
    const approve = await screen.findByRole('button', { name: /approve/i });
    await userEvent.click(approve);
    await waitFor(() => expect(mockApprove).toHaveBeenCalledWith('act-1'));
  });

  it('sends the API key and model when saving config', async () => {
    renderPage();
    await screen.findByText('Configuration');
    const keyInput = screen.getByPlaceholderText('sk-or-...');
    await userEvent.type(keyInput, 'sk-or-typed');
    await userEvent.click(screen.getByRole('button', { name: /save settings/i }));
    await waitFor(() => expect(mockUpdateConfig).toHaveBeenCalled());
    const body = mockUpdateConfig.mock.calls[0][0];
    expect(body.llm_api_key).toBe('sk-or-typed');
    expect(body.llm_model).toBe('meta-llama/llama-3.3-70b-instruct:free');
  });

  it('hides the save button and disables inputs for non-admins', async () => {
    mockIsAdmin = false;
    renderPage();
    await screen.findByText('Configuration');
    expect(screen.queryByRole('button', { name: /save settings/i })).not.toBeInTheDocument();
    expect(screen.getByText(/org admins can edit/i)).toBeInTheDocument();
  });
});
