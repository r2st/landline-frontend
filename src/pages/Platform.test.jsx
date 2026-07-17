import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

// Mock the data hooks so the page renders deterministically without a backend.
const mockCreate = vi.fn();
const mockStart = vi.fn();
let orgsState = { data: [], isLoading: false, isError: false };
let statsState = { data: null, isLoading: false };

vi.mock('../hooks/usePlatform', () => ({
  usePlatformStats: () => statsState,
  useOrganizations: () => orgsState,
  useCreateOrganization: () => ({ mutate: mockCreate, isPending: false }),
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
    expect(screen.getByText('Active')).toBeInTheDocument();
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
});
