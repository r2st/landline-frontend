import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

const mockSet = vi.fn();
const mockClear = vi.fn();
let credsState = { data: { credentials: [], applied_at: null }, isLoading: false, error: null };
let platformState = { isPlatformAdmin: true };

vi.mock('../hooks/usePlatform', () => ({
  useCredentials: () => credsState,
  useSetCredential: () => ({ mutate: mockSet, isPending: false, variables: undefined }),
  useClearCredential: () => ({ mutate: mockClear, isPending: false, variables: undefined }),
}));

vi.mock('../context/PlatformContext', () => ({
  usePlatform: () => platformState,
}));

import PlatformCredentials from './PlatformCredentials';

const CREDS = [
  {
    key: 'google_client_id',
    label: 'Google OAuth Client ID',
    category: 'Google',
    is_secret: false,
    help: 'Changing this invalidates every stored Gmail refresh token.',
    source: 'database',
    value: '000000000000-testclient.apps.googleusercontent.com',
    has_env_fallback: true,
    updated_at: '2026-08-05T10:00:00Z',
    updated_by: 'root@landline.app',
  },
  {
    key: 'google_client_secret',
    label: 'Google OAuth Client Secret',
    category: 'Google',
    is_secret: true,
    help: '',
    source: 'environment',
    value: '••••••••wxyz',
    has_env_fallback: true,
    updated_at: null,
    updated_by: null,
  },
  {
    key: 'hunter_api_key',
    label: 'Hunter.io API Key',
    category: 'Enrichment',
    is_secret: true,
    help: '',
    source: 'unset',
    value: '',
    has_env_fallback: false,
    updated_at: null,
    updated_by: null,
  },
];

function renderPage() {
  return render(
    <MemoryRouter>
      <PlatformCredentials />
    </MemoryRouter>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  platformState = { isPlatformAdmin: true };
  credsState = {
    data: { credentials: CREDS, applied_at: '2026-08-05T10:05:00Z' },
    isLoading: false,
    error: null,
  };
});

describe('PlatformCredentials', () => {
  it('groups credentials by category', () => {
    renderPage();
    expect(screen.getByText('Google')).toBeInTheDocument();
    expect(screen.getByText('Enrichment')).toBeInTheDocument();
    expect(screen.getByText('Google OAuth Client ID')).toBeInTheDocument();
    expect(screen.getByText('Hunter.io API Key')).toBeInTheDocument();
  });

  it('shows where each value came from', () => {
    // The distinction is the point of the screen: without it there is no way
    // to tell whether reverting a working credential is safe.
    renderPage();
    expect(screen.getByText('Set here')).toBeInTheDocument();
    expect(screen.getByText('From deploy')).toBeInTheDocument();
    expect(screen.getByText('Not configured')).toBeInTheDocument();
  });

  it('renders a client ID in full and a secret only as its mask', () => {
    renderPage();
    expect(
      screen.getByText('000000000000-testclient.apps.googleusercontent.com')
    ).toBeInTheDocument();
    expect(screen.getByText('••••••••wxyz')).toBeInTheDocument();
  });

  it('says what is unconfigured rather than showing an empty cell', () => {
    renderPage();
    expect(screen.getByText('nothing configured')).toBeInTheDocument();
  });

  it('saves a new value for the right key', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: 'Set Hunter.io API Key' }));
    const input = screen.getByLabelText('New Hunter.io API Key');
    await user.type(input, 'hunter-key-123');
    await user.click(screen.getByRole('button', { name: /save/i }));

    expect(mockSet).toHaveBeenCalledWith({
      key: 'hunter_api_key', value: 'hunter-key-123',
    });
  });

  it('masks the input for a secret and not for a client ID', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(
      screen.getByRole('button', { name: 'Replace Google OAuth Client ID' })
    );
    expect(screen.getByLabelText('New Google OAuth Client ID')).toHaveAttribute(
      'type', 'text'
    );
  });

  it('will not submit an empty value', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: 'Set Hunter.io API Key' }));
    expect(screen.getByRole('button', { name: /save/i })).toBeDisabled();
    expect(mockSet).not.toHaveBeenCalled();
  });

  it('offers Revert only where an override exists', () => {
    // Reverting an environment-sourced value is meaningless — there is nothing
    // to remove — so the affordance must not be there to click.
    renderPage();
    const reverts = screen.getAllByRole('button', { name: /^Revert / });
    expect(reverts).toHaveLength(1);
  });

  it('reverts the overridden credential', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(
      screen.getByRole('button', { name: 'Revert Google OAuth Client ID' })
    );
    expect(mockClear).toHaveBeenCalledWith('google_client_id');
  });

  it('attributes the last change', () => {
    renderPage();
    expect(screen.getByText(/set by root@landline.app/)).toBeInTheDocument();
  });

  it('states that propagation is not instant', () => {
    // The copy has to say this: a save applies on one worker immediately and
    // reaches the rest on the refresh beat, and an operator who assumes
    // otherwise will conclude the rotation failed.
    renderPage();
    expect(screen.getByText(/within 5 minutes/i)).toBeInTheDocument();
  });

  it('refuses the page to a non-platform-admin', () => {
    platformState = { isPlatformAdmin: false };
    renderPage();
    expect(screen.getByText('Platform admins only')).toBeInTheDocument();
    expect(screen.queryByText('Google OAuth Client ID')).not.toBeInTheDocument();
  });

  it('surfaces a load error instead of rendering an empty page', () => {
    credsState = {
      data: null, isLoading: false,
      error: { response: { data: { detail: 'Insufficient permissions' } } },
    };
    renderPage();
    expect(screen.getByText('Insufficient permissions')).toBeInTheDocument();
  });

  it('shows a loading state', () => {
    credsState = { data: null, isLoading: true, error: null };
    renderPage();
    expect(screen.getByText(/loading credentials/i)).toBeInTheDocument();
  });
});
