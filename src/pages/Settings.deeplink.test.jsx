import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Discovery's "add your Gemini key" banner links to /settings#api-keys; the
// page must open on that tab for an org admin and never for anyone else.
const mockUser = vi.fn();
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ user: mockUser() }) }));
vi.mock('../hooks/useAutomation', () => ({
  useAutomation: () => ({ data: { flags: [], scheduling_link: '' }, isLoading: false, error: null }),
}));
vi.mock('../api/client', () => ({
  api: { get: vi.fn().mockResolvedValue({ data: { status: 'ok' } }), post: vi.fn() },
  queryClient: { invalidateQueries: vi.fn() },
  dangerSignalsApi: {
    health: vi.fn().mockResolvedValue({ active_trip: null }),
    events: vi.fn(), test: vi.fn(), resume: vi.fn(),
  },
}));
vi.mock('../components/GmailConnect', () => ({ default: () => <div /> }));
vi.mock('../components/EmailSignatureEditor', () => ({ default: () => <div /> }));
vi.mock('../components/TestDeliverability', () => ({ default: () => <div /> }));
vi.mock('../components/ApiKeysSettings', () => ({ default: () => <div>API keys panel</div> }));
vi.mock('react-hot-toast', () => ({
  default: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }),
}));

import Settings from './Settings';

const renderSettings = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter>
        <Settings />
      </MemoryRouter>
    </QueryClientProvider>
  );

describe('Settings #api-keys deep link', () => {
  beforeEach(() => {
    window.location.hash = '#api-keys';
  });
  afterEach(() => {
    window.location.hash = '';
  });

  it('opens the API Keys tab for an org admin', () => {
    mockUser.mockReturnValue({ role: 'org_admin' });
    renderSettings();
    expect(screen.getByText('API keys panel')).toBeInTheDocument();
  });

  it('falls back to Profile for a role that cannot manage keys', () => {
    mockUser.mockReturnValue({ role: 'org_agent' });
    renderSettings();
    expect(screen.queryByText('API keys panel')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /api keys/i })).not.toBeInTheDocument();
  });
});
