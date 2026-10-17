import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// The Profile tab must show the logged-in user, never a hardcoded address or
// a display name another user saved in this browser.
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

describe('Settings profile identity', () => {
  beforeEach(() => {
    window.location.hash = '';
    localStorage.clear();
  });

  it("shows the logged-in user's email, not a hardcoded one", () => {
    mockUser.mockReturnValue({
      id: 'u-2', role: 'org_agent', name: 'Subhendu Das', email: 'subhendu.das@devheallabs.com',
    });
    renderSettings();
    expect(screen.getByDisplayValue('subhendu.das@devheallabs.com')).toBeInTheDocument();
    expect(screen.queryByText('sumaninster7@gmail.com')).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue('sumaninster7@gmail.com')).not.toBeInTheDocument();
  });

  it("does not show a name another user saved in this browser", () => {
    localStorage.setItem('landline.user_name:u-1', 'Suman');
    localStorage.setItem('landline.user_name', 'Suman');
    mockUser.mockReturnValue({
      id: 'u-2', role: 'org_agent', name: 'Subhendu Das', email: 'subhendu.das@devheallabs.com',
    });
    renderSettings();
    expect(screen.getByDisplayValue('Subhendu Das')).toBeInTheDocument();
    expect(screen.queryByDisplayValue('Suman')).not.toBeInTheDocument();
  });

  it("keeps the user's own saved display name", () => {
    localStorage.setItem('landline.user_name:u-2', 'Subhendu D.');
    mockUser.mockReturnValue({
      id: 'u-2', role: 'org_agent', name: 'Subhendu Das', email: 'subhendu.das@devheallabs.com',
    });
    renderSettings();
    expect(screen.getByDisplayValue('Subhendu D.')).toBeInTheDocument();
  });
});
