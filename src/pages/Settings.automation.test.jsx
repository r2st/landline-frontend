import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Only the Automation section of Settings is under test here. The rest of the
// page pulls in Gmail OAuth, signatures and deliverability widgets, so those
// are stubbed to keep this focused on the thing that was lying.
const mockAutomation = vi.fn();
vi.mock('../hooks/useAutomation', () => ({
  useAutomation: () => mockAutomation(),
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
vi.mock('../context/AuthContext', () => ({ useAuth: () => ({ user: { role: 'org_agent' } }) }));
vi.mock('react-hot-toast', () => ({
  default: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }),
}));

import Settings from './Settings';

const FLAGS = [
  {
    key: 'auto_reply',
    label: 'Auto-reply to interested replies',
    enabled: true,
    source: 'env',
    detail: 'AI drafts a reply and sends it for clear positive intent.',
  },
  {
    key: 'auto_followups',
    label: 'Stale-lead follow-ups',
    enabled: true,
    source: 'schedule',
    detail: 'Every 4h, up to 50 reminders for leads untouched for 7+ days.',
  },
  {
    key: 'auto_scoring',
    label: 'Lead scoring & re-scoring',
    enabled: true,
    source: 'schedule',
    detail: 'New leads scored every 30m; active leads re-scored twice daily, up to 50 per run.',
  },
];

const renderSettings = async () => {
  const user = userEvent.setup();
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter>
        <Settings />
      </MemoryRouter>
    </QueryClientProvider>
  );
  // Automation lives on the Data tab, not System — the kill switch is the
  // System tab's tenant.
  await user.click(screen.getByRole('button', { name: /^data$/i }));
  return user;
};

describe('Settings → Automation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAutomation.mockReturnValue({
      data: { flags: FLAGS, scheduling_link: '' },
      isLoading: false,
      error: null,
    });
  });

  it('renders each behaviour the server reported', async () => {
    await renderSettings();
    expect(screen.getByText('Auto-reply to interested replies')).toBeInTheDocument();
    expect(screen.getByText('Stale-lead follow-ups')).toBeInTheDocument();
    expect(screen.getByText('Lead scoring & re-scoring')).toBeInTheDocument();
  });

  it('reports scheduled jobs as ON — they run whether or not the UI says so', async () => {
    await renderSettings();
    // The regression: these were hardcoded `false` while the beat schedule ran
    // them every 4h and every 30m. Three ON badges, no OFF.
    expect(screen.getAllByText('ON')).toHaveLength(3);
    expect(screen.queryByText('OFF')).not.toBeInTheDocument();
  });

  it('distinguishes an env setting from a job with no off switch', async () => {
    await renderSettings();
    // "Contact your administrator" is wrong advice for a scheduled job.
    expect(screen.getAllByText('always on')).toHaveLength(2);
    expect(screen.getAllByText('env setting')).toHaveLength(1);
  });

  it('shows the real cadence behind a badge, not just ON', async () => {
    await renderSettings();
    expect(screen.getByText(/Every 4h, up to 50 reminders/)).toBeInTheDocument();
  });

  it('follows the server when a flag is off', async () => {
    mockAutomation.mockReturnValue({
      data: {
        flags: [{ ...FLAGS[0], enabled: false, detail: 'Replies are classified but never answered automatically.' }],
        scheduling_link: '',
      },
      isLoading: false,
      error: null,
    });
    await renderSettings();
    expect(screen.getByText('OFF')).toBeInTheDocument();
    expect(screen.getByText(/never answered automatically/)).toBeInTheDocument();
  });

  it('says it could not check rather than inventing badges', async () => {
    mockAutomation.mockReturnValue({
      data: undefined,
      isLoading: false,
      error: { message: 'Network Error' },
    });
    await renderSettings();

    expect(screen.getByText(/couldn't read automation state/i)).toBeInTheDocument();
    // The whole point: no confident ON/OFF when the fetch failed.
    expect(screen.queryByText('ON')).not.toBeInTheDocument();
    expect(screen.queryByText('OFF')).not.toBeInTheDocument();
  });

  it('renders an unknown flag key without crashing', async () => {
    mockAutomation.mockReturnValue({
      data: {
        flags: [{ key: 'something_new', label: 'A behaviour added later', enabled: true, source: 'env', detail: null }],
        scheduling_link: '',
      },
      isLoading: false,
      error: null,
    });
    await renderSettings();
    // The server owns the vocabulary; a new key must surface, not blow up.
    expect(screen.getByText('A behaviour added later')).toBeInTheDocument();
  });

  it('shows the backend scheduling link read-only, with no fake save', async () => {
    mockAutomation.mockReturnValue({
      data: { flags: FLAGS, scheduling_link: 'https://calendly.com/apprend/30min' },
      isLoading: false,
      error: null,
    });
    await renderSettings();

    const link = screen.getByRole('link', { name: 'https://calendly.com/apprend/30min' });
    expect(link).toHaveAttribute('href', 'https://calendly.com/apprend/30min');
    // The old editable field wrote to localStorage, which nothing reads — the
    // link that reaches a prospect comes from backend env. No input, no Save.
    expect(screen.queryByPlaceholderText(/calendly.com\/your-link/i)).not.toBeInTheDocument();
  });

  it('says plainly when no scheduling link is configured', async () => {
    await renderSettings();
    expect(screen.getByText(/not set —/i)).toBeInTheDocument();
  });
});
