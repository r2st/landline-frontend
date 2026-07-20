import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockList = vi.fn();
const mockGet = vi.fn();
const mockCreate = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();
const mockSetMode = vi.fn();

vi.mock('../api/client', () => ({
  api: { get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() },
  queryClient: { invalidateQueries: vi.fn(), setQueryData: vi.fn() },
  orchestrationApi: {
    listPolicies: (...a) => mockList(...a),
    getPolicy: (...a) => mockGet(...a),
    createPolicy: (...a) => mockCreate(...a),
    updatePolicy: (...a) => mockUpdate(...a),
    deletePolicy: (...a) => mockDelete(...a),
    setEnrollmentMode: (...a) => mockSetMode(...a),
  },
}));
vi.mock('react-hot-toast', () => ({
  default: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }),
}));

import DialtonePolicies from './DialtonePolicies';

const GLOBAL_POLICY = {
  id: 'pol-global',
  user_id: null,
  name: 'Conservative outbound',
  is_active: true,
  max_daily_touches: 2,
  max_total_touches: 12,
  min_hours_between_touches: 24,
  allowed_channels: ['email', 'linkedin', 'phone'],
  required_channels: ['email'],
  human_review_triggers: ['pricing_request', 'legal'],
  created_at: '2026-07-10T09:00:00Z',
  updated_at: '2026-07-16T09:00:00Z',
};

const PAUSED_POLICY = {
  ...GLOBAL_POLICY,
  id: 'pol-rep',
  user_id: 'user-1',
  name: 'Aggressive rep policy',
  is_active: false,
  max_daily_touches: 5,
  allowed_channels: ['email'],
  required_channels: [],
  human_review_triggers: [],
};

const LIST = [GLOBAL_POLICY, PAUSED_POLICY];

const renderPage = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter>
        <DialtonePolicies />
      </MemoryRouter>
    </QueryClientProvider>
  );

describe('DialtonePolicies page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists policies with status, scope and cadence', async () => {
    mockList.mockResolvedValue(LIST);
    renderPage();

    await screen.findByText('Conservative outbound');
    // Scope-badge text is unique to the cards ("Active"/"Paused" also name the
    // filter tabs), so assert status inside each card.
    const activeCard = screen.getByRole('button', { name: /Conservative outbound/ });
    expect(within(activeCard).getByText('Active')).toBeInTheDocument();
    expect(within(activeCard).getByText('Global')).toBeInTheDocument();
    expect(within(activeCard).getByText(/2\/day · 12 total/)).toBeInTheDocument();

    const pausedCard = screen.getByRole('button', { name: /Aggressive rep policy/ });
    expect(within(pausedCard).getByText('Paused')).toBeInTheDocument();
    expect(within(pausedCard).getByText('Per-rep')).toBeInTheDocument();
  });

  it('shows an empty state when there are no policies', async () => {
    mockList.mockResolvedValue([]);
    renderPage();
    expect(await screen.findByText(/no policies yet/i)).toBeInTheDocument();
  });

  it('never renders a failed fetch as anything but an empty state', async () => {
    mockList.mockRejectedValue(new Error('gateway timeout'));
    renderPage();
    expect(await screen.findByText(/no policies yet/i)).toBeInTheDocument();
  });

  it('filters to paused policies client-side', async () => {
    const user = userEvent.setup();
    mockList.mockResolvedValue(LIST);
    renderPage();

    await screen.findByText('Conservative outbound');
    await user.click(screen.getByRole('button', { name: 'Paused' }));

    expect(screen.getByText('Aggressive rep policy')).toBeInTheDocument();
    expect(screen.queryByText('Conservative outbound')).not.toBeInTheDocument();
  });

  it('opens a policy detail showing rules and conditions', async () => {
    const user = userEvent.setup();
    mockList.mockResolvedValue(LIST);
    renderPage();

    await user.click(await screen.findByText('Conservative outbound'));

    expect(await screen.findByText('Cadence guardrails')).toBeInTheDocument();
    expect(screen.getByText('Max touches per day')).toBeInTheDocument();
    expect(screen.getByText('Human-in-the-loop')).toBeInTheDocument();
    // Human-review triggers render as humanized chips.
    expect(screen.getByText('Pricing request')).toBeInTheDocument();
    expect(screen.getByText('Legal')).toBeInTheDocument();
  });

  it('creates a policy from the new-policy form', async () => {
    const user = userEvent.setup();
    mockList.mockResolvedValue(LIST);
    mockCreate.mockResolvedValue({ ...GLOBAL_POLICY, id: 'new-pol', name: 'Fresh policy' });
    renderPage();

    await screen.findByText('Conservative outbound');
    await user.click(screen.getByRole('button', { name: /new policy/i }));

    const dialog = await screen.findByRole('dialog');
    const nameInput = within(dialog).getByPlaceholderText(/conservative outbound/i);
    await user.clear(nameInput);
    await user.type(nameInput, 'Fresh policy');
    await user.click(within(dialog).getByRole('button', { name: /create policy/i }));

    expect(mockCreate).toHaveBeenCalledTimes(1);
    const payload = mockCreate.mock.calls[0][0];
    expect(payload).toMatchObject({
      name: 'Fresh policy',
      max_daily_touches: 2,
      allowed_channels: ['email', 'linkedin', 'phone'],
      is_active: true,
    });
  });

  it('blocks saving when a required channel is not allowed', async () => {
    const user = userEvent.setup();
    mockList.mockResolvedValue(LIST);
    renderPage();

    await screen.findByText('Conservative outbound');
    await user.click(screen.getByRole('button', { name: /new policy/i }));
    const dialog = await screen.findByRole('dialog');

    // Two "Phone" toggles: [0] = allowed row, [1] = required row.
    const phoneButtons = within(dialog).getAllByRole('button', { name: 'Phone' });
    await user.click(phoneButtons[0]); // remove Phone from allowed
    await user.click(phoneButtons[1]); // require Phone

    expect(within(dialog).getByText(/must also be allowed/i)).toBeInTheDocument();
    expect(within(dialog).getByRole('button', { name: /create policy/i })).toBeDisabled();
    expect(mockCreate).not.toHaveBeenCalled();
  });

  it('toggles a policy active/paused from the detail', async () => {
    const user = userEvent.setup();
    mockList.mockResolvedValue(LIST);
    mockUpdate.mockResolvedValue({ ...GLOBAL_POLICY, is_active: false });
    renderPage();

    await user.click(await screen.findByText('Conservative outbound'));
    await screen.findByText('Cadence guardrails');
    await user.click(screen.getByRole('button', { name: /pause/i }));

    expect(mockUpdate).toHaveBeenCalledWith('pol-global', { is_active: false });
  });

  it('edits a policy name from the detail', async () => {
    const user = userEvent.setup();
    mockList.mockResolvedValue(LIST);
    mockUpdate.mockResolvedValue({ ...GLOBAL_POLICY, name: 'Renamed' });
    renderPage();

    await user.click(await screen.findByText('Conservative outbound'));
    await user.click(await screen.findByRole('button', { name: /edit/i }));

    const dialog = await screen.findByRole('dialog');
    const nameInput = within(dialog).getByDisplayValue('Conservative outbound');
    await user.clear(nameInput);
    await user.type(nameInput, 'Renamed');
    await user.click(within(dialog).getByRole('button', { name: /save changes/i }));

    expect(mockUpdate).toHaveBeenCalledTimes(1);
    expect(mockUpdate.mock.calls[0][0]).toBe('pol-global');
    expect(mockUpdate.mock.calls[0][1]).toMatchObject({ name: 'Renamed' });
  });

  it('switches an enrollment orchestration mode', async () => {
    const user = userEvent.setup();
    mockList.mockResolvedValue(LIST);
    mockSetMode.mockResolvedValue({ orchestration_mode: 'autonomous' });
    renderPage();

    await screen.findByText('Conservative outbound');
    await user.type(screen.getByLabelText('Enrollment ID'), 'enr-123');
    await user.click(screen.getByRole('button', { name: /autonomous/i }));
    await user.click(screen.getByRole('button', { name: /apply/i }));

    expect(mockSetMode).toHaveBeenCalledWith('enr-123', 'autonomous');
  });
});
