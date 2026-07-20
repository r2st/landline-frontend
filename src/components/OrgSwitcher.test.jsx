import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

const mockStart = vi.fn();
const mockStop = vi.fn();
let orgsState = { data: [] };
let platformState = {};

vi.mock('../hooks/usePlatform', () => ({
  useOrganizations: () => orgsState,
}));
vi.mock('../context/PlatformContext', () => ({
  usePlatform: () => platformState,
}));

import OrgSwitcher from './OrgSwitcher';

const ORGS = [
  { id: 'org-1', name: 'Acme Corp', impersonatable_user_id: 'u1' },
  { id: 'org-2', name: 'Beta LLC', impersonatable_user_id: null },
];

function renderSwitcher() {
  return render(
    <MemoryRouter>
      <OrgSwitcher />
    </MemoryRouter>
  );
}

describe('OrgSwitcher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    orgsState = { data: ORGS };
    platformState = {
      isPlatformAdmin: true,
      impersonation: null,
      isImpersonating: false,
      startImpersonation: mockStart,
      stopImpersonation: mockStop,
    };
  });

  it('renders nothing for non-platform-admins', () => {
    platformState = { ...platformState, isPlatformAdmin: false };
    const { container } = renderSwitcher();
    expect(container).toBeEmptyDOMElement();
  });

  it('shows the Platform trigger and lists orgs on open', async () => {
    const user = userEvent.setup();
    renderSwitcher();
    expect(screen.getByText('Platform')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /platform/i }));
    expect(screen.getByText('Acme Corp')).toBeInTheDocument();
    expect(screen.getByText('Beta LLC')).toBeInTheDocument();
  });

  it('picking an org starts impersonation', async () => {
    const user = userEvent.setup();
    mockStart.mockResolvedValue({});
    renderSwitcher();
    await user.click(screen.getByRole('button', { name: /platform/i }));
    await user.click(screen.getByRole('button', { name: /acme corp/i }));
    await waitFor(() =>
      expect(mockStart).toHaveBeenCalledWith(expect.objectContaining({ id: 'org-1' }))
    );
  });

  it('shows the org name and exits when impersonating', async () => {
    const user = userEvent.setup();
    platformState = {
      ...platformState,
      impersonation: { orgId: 'org-1', orgName: 'Acme Corp' },
      isImpersonating: true,
    };
    renderSwitcher();
    // Trigger shows the impersonated org name.
    expect(screen.getByText('Acme Corp')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /acme corp/i }));
    await user.click(screen.getByRole('button', { name: /platform admin/i }));
    expect(mockStop).toHaveBeenCalled();
  });
});
