import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

// Mock the data hooks so the page renders deterministically without a backend.
const mockCreate = vi.fn();
const mockStart = vi.fn();
const mockPromote = vi.fn();
const mockDemote = vi.fn();
let orgsState = { data: [], isLoading: false, isError: false };
let statsState = { data: null, isLoading: false };
let adminsState = { data: [], isLoading: false };

vi.mock('../hooks/usePlatform', () => ({
  usePlatformStats: () => statsState,
  useOrganizations: () => orgsState,
  useCreateOrganization: () => ({ mutate: mockCreate, isPending: false }),
  usePlatformAdmins: () => adminsState,
  usePromoteAdmin: () => ({ mutate: mockPromote, isPending: false }),
  useDemoteAdmin: () => ({ mutate: mockDemote, isPending: false }),
}));

vi.mock('../context/PlatformContext', () => ({
  usePlatform: () => ({ startImpersonation: mockStart, isPlatformAdmin: true }),
}));

import Platform from './Platform';

const ORGS = [
  {
    id: 'org-1', name: 'Acme Corp', slug: 'acme-corp', is_active: true,
    billing_plan: 'pro', created_at: '2026-07-01T00:00:00Z',
    usage: { user_count: 5, emails_sent: 1200, ai_calls: 40 },
    impersonatable_user_id: 'user-1',
  },
  {
    id: 'org-2', name: 'Beta LLC', slug: 'beta-llc', is_active: false,
    billing_plan: 'free', created_at: '2026-06-15T00:00:00Z',
    usage: { user_count: 0, emails_sent: 0, ai_calls: 0 },
    impersonatable_user_id: null,
  },
];

function renderPage() {
  return render(
    <MemoryRouter>
      <Platform />
    </MemoryRouter>
  );
}

const ADMINS = [
  { id: 'pa-1', name: 'Root', email: 'root@landline.app', role: 'platform_admin', is_active: true, created_at: '2026-01-01T00:00:00Z' },
  { id: 'pa-2', name: 'Ops', email: 'ops@landline.app', role: 'platform_admin', is_active: true, created_at: '2026-02-01T00:00:00Z' },
];

describe('Platform dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    orgsState = { data: ORGS, isLoading: false, isError: false };
    statsState = {
      data: {
        total_organizations: 2, active_organizations: 1,
        total_users: 5, total_emails_sent: 1200,
      },
      isLoading: false,
    };
    adminsState = { data: ADMINS, isLoading: false };
  });

  it('renders platform-wide stats', () => {
    renderPage();
    expect(screen.getByText('Platform Admin')).toBeInTheDocument();
    // Stat tiles: scope each value to its labelled tile to avoid clashing with
    // the same number in an org row.
    const usersTile = screen.getByText('Total users').closest('div').parentElement;
    expect(usersTile).toHaveTextContent('5');
    // Orgs tile shows active/total.
    expect(screen.getByText('Organizations')).toBeInTheDocument();
    expect(screen.getByText('1/2')).toBeInTheDocument();
  });

  it('lists every organization with its counts', () => {
    renderPage();
    expect(screen.getByText('Acme Corp')).toBeInTheDocument();
    expect(screen.getByText('Beta LLC')).toBeInTheDocument();
    // "Active" also appears in the admins panel now, so just assert presence.
    expect(screen.getAllByText('Active').length).toBeGreaterThan(0);
    expect(screen.getByText('Inactive')).toBeInTheDocument();
  });

  it('opens the create modal and submits a new org', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: /new organization/i }));
    const nameInput = await screen.findByPlaceholderText('Acme Corp');
    await user.type(nameInput, 'Gamma Inc');
    await user.click(screen.getByRole('button', { name: /^create$/i }));
    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Gamma Inc', billing_plan: 'free' }),
      expect.any(Object)
    );
  });

  it('view-as triggers impersonation for an org with a user', async () => {
    const user = userEvent.setup();
    mockStart.mockResolvedValue({});
    renderPage();
    const buttons = screen.getAllByRole('button', { name: /view as/i });
    await user.click(buttons[0]);
    await waitFor(() =>
      expect(mockStart).toHaveBeenCalledWith(expect.objectContaining({ id: 'org-1' }))
    );
  });

  it('disables view-as for an org with no users', () => {
    renderPage();
    const buttons = screen.getAllByRole('button', { name: /view as/i });
    // Beta LLC (second row) has no impersonatable user → disabled.
    expect(buttons[1]).toBeDisabled();
  });

  it('shows an empty state when there are no orgs', () => {
    orgsState = { data: [], isLoading: false, isError: false };
    renderPage();
    expect(screen.getByText('No organizations yet')).toBeInTheDocument();
  });

  it('lists platform administrators', () => {
    renderPage();
    expect(screen.getByText('Platform administrators')).toBeInTheDocument();
    expect(screen.getByText('root@landline.app')).toBeInTheDocument();
    expect(screen.getByText('ops@landline.app')).toBeInTheDocument();
  });

  it('promotes a user by email', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: /promote to platform admin/i }));
    const emailInput = await screen.findByPlaceholderText('person@company.com');
    await user.type(emailInput, 'newadmin@acme.com');
    await user.click(screen.getByRole('button', { name: /^promote$/i }));
    expect(mockPromote).toHaveBeenCalledWith('newadmin@acme.com', expect.any(Object));
  });

  it('demotes an admin, requiring an org to be picked', async () => {
    const user = userEvent.setup();
    renderPage();
    // Open the demote modal for the first admin (row button).
    await user.click(screen.getAllByRole('button', { name: /^demote$/i })[0]);
    await screen.findByLabelText('Organization');
    // The modal submit is the only "Demote" button with type=submit.
    const submit = screen
      .getAllByRole('button', { name: /^demote$/i })
      .find((b) => b.getAttribute('type') === 'submit');
    // Org not yet selected → submit disabled, mutation not called.
    expect(submit).toBeDisabled();
    // Pick an org, then submit.
    await user.selectOptions(screen.getByLabelText('Organization'), 'org-1');
    await user.click(submit);
    expect(mockDemote).toHaveBeenCalledWith(
      { userId: 'pa-1', orgId: 'org-1' },
      expect.any(Object)
    );
  });
});
