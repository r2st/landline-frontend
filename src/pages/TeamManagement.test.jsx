import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockList = vi.fn();
const mockInvite = vi.fn();
const mockChangeRole = vi.fn();
const mockRemove = vi.fn();
vi.mock('../api/org', async () => {
  const actual = await vi.importActual('../api/org');
  return {
    ...actual,
    orgApi: {
      listMembers: (...a) => mockList(...a),
      invite: (...a) => mockInvite(...a),
      changeRole: (...a) => mockChangeRole(...a),
      remove: (...a) => mockRemove(...a),
    },
  };
});
vi.mock('react-hot-toast', () => ({
  default: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }),
}));

let mockUser = { id: 'u-admin', role: 'org_admin', name: 'Owner' };
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: mockUser }),
}));

import TeamManagement from './TeamManagement';

const MEMBERS = [
  { id: 'u-admin', email: 'owner@acme.io', name: 'Owner', role: 'org_admin', is_active: true, must_change_password: false, created_at: '2026-01-02T00:00:00Z' },
  { id: 'u-rep', email: 'rep@acme.io', name: 'Rep One', role: 'org_agent', is_active: true, must_change_password: true, created_at: '2026-03-04T00:00:00Z' },
];

const renderPage = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter>
        <TeamManagement />
      </MemoryRouter>
    </QueryClientProvider>
  );

describe('TeamManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser = { id: 'u-admin', role: 'org_admin', name: 'Owner' };
    mockList.mockResolvedValue(MEMBERS);
    mockInvite.mockResolvedValue({ id: 'u-new', email: 'new@acme.io', name: 'New Hire', role: 'org_manager', temporary_password: 'Tmp-abc123XY', must_change_password: true });
    mockChangeRole.mockResolvedValue({ ...MEMBERS[1], role: 'org_manager' });
    mockRemove.mockResolvedValue({ ...MEMBERS[1], is_active: false });
  });

  it('lists members with roles and status', async () => {
    renderPage();
    expect(await screen.findByText('rep@acme.io')).toBeInTheDocument();
    expect(screen.getByText('owner@acme.io')).toBeInTheDocument();
    expect(screen.getByText('(you)')).toBeInTheDocument();
    expect(screen.getByText('pending password')).toBeInTheDocument();
  });

  it('invites a member and reveals the temp password once', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('rep@acme.io');
    await user.click(screen.getByRole('button', { name: /invite member/i }));

    const dialog = screen.getByRole('heading', { name: /invite a member/i }).closest('div');
    await user.type(screen.getByPlaceholderText(/person@company.com/i), 'new@acme.io');
    await user.type(screen.getByPlaceholderText(/jane doe/i), 'New Hire');
    await user.click(screen.getByRole('button', { name: /send invite/i }));

    await waitFor(() => expect(mockInvite).toHaveBeenCalledTimes(1));
    expect(mockInvite.mock.calls[0][0]).toMatchObject({ email: 'new@acme.io', name: 'New Hire' });
    // One-time password surfaced.
    expect(await screen.findByText('Tmp-abc123XY')).toBeInTheDocument();
  });

  it('changes a member role', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('rep@acme.io');
    const select = screen.getByRole('combobox', { name: /role for rep one/i });
    await user.selectOptions(select, 'org_manager');
    await waitFor(() => expect(mockChangeRole).toHaveBeenCalledWith('u-rep', 'org_manager'));
  });

  it('own admin role is not editable (no dropdown for self)', async () => {
    renderPage();
    await screen.findByText('owner@acme.io');
    expect(screen.queryByRole('combobox', { name: /role for owner/i })).not.toBeInTheDocument();
  });

  it('removes a member after confirmation', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('rep@acme.io');
    const repRow = screen.getByText('rep@acme.io').closest('tr');
    await user.click(within(repRow).getByRole('button', { name: /remove/i }));
    // Confirm modal — scope to the dialog so we don't hit the row button too.
    const modal = screen.getByRole('heading', { name: /remove member/i }).closest('.rounded-2xl');
    await user.click(within(modal).getByRole('button', { name: /^remove$/i }));
    await waitFor(() => expect(mockRemove).toHaveBeenCalledWith('u-rep'));
  });

  it('hides write controls for non-admins', async () => {
    mockUser = { id: 'u-rep', role: 'org_agent', name: 'Rep One' };
    renderPage();
    await screen.findByText('rep@acme.io');
    expect(screen.queryByRole('button', { name: /invite member/i })).not.toBeInTheDocument();
    expect(screen.getByText('Admin only')).toBeInTheDocument();
    // No role dropdowns, no remove buttons.
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /remove/i })).not.toBeInTheDocument();
  });
});
