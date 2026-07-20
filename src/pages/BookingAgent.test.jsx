import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockGetConfig = vi.fn();
const mockUpdateConfig = vi.fn();
const mockMeetings = vi.fn();
const mockMeeting = vi.fn();
const mockCancel = vi.fn();
const mockStats = vi.fn();
const mockAccounts = vi.fn();

vi.mock('../api/client', () => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn() },
  queryClient: { invalidateQueries: vi.fn(), setQueryData: vi.fn() },
  meetingAgentApi: {
    getConfig: (...a) => mockGetConfig(...a),
    updateConfig: (...a) => mockUpdateConfig(...a),
    meetings: (...a) => mockMeetings(...a),
    meeting: (...a) => mockMeeting(...a),
    cancel: (...a) => mockCancel(...a),
    stats: (...a) => mockStats(...a),
  },
  gmailApi: {
    accounts: (...a) => mockAccounts(...a),
  },
}));
vi.mock('react-hot-toast', () => ({
  default: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }),
}));

// The page gates config editing on isAdmin; default the mock to admin, override
// per test where needed.
let mockIsAdmin = true;
vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ isAdmin: mockIsAdmin }),
}));

import BookingAgent from './BookingAgent';

const CONFIG_ON = {
  id: 'cfg-1',
  is_active: true,
  calendar_account_id: 'acc-1',
  default_meeting_duration_minutes: 30,
  buffer_between_meetings_minutes: 15,
  working_hours_start: '09:00',
  working_hours_end: '17:00',
  timezone: 'Asia/Kolkata',
  booking_window_days: 7,
  max_daily_meetings: 5,
  confirmation_template: null,
  reminder_template: null,
};

const STATS = {
  total_meetings: 4, proposed: 1, confirmed: 1, completed: 1, cancelled: 0, no_show: 1,
  booking_rate: 0.5, show_rate: 0.5, avg_hours_to_book: 3.2, upcoming: 1,
};

const MEETINGS = {
  items: [
    {
      id: 'm-1', contact_id: 'c-1', title: 'Intro call with Acme', status: 'confirmed',
      start_time: '2026-07-25T09:30:00Z', end_time: '2026-07-25T10:00:00Z', timezone: 'UTC',
      calendar_event_id: 'evt-1', reminder_sent_at: null, created_at: '2026-07-20T08:00:00Z',
      contact_name: 'Dana Lee', contact_email: 'dana@acme.co',
    },
  ],
  total: 1,
};

const renderPage = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <BookingAgent />
    </QueryClientProvider>
  );

describe('BookingAgent page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIsAdmin = true;
    mockGetConfig.mockResolvedValue(CONFIG_ON);
    mockStats.mockResolvedValue(STATS);
    mockMeetings.mockResolvedValue(MEETINGS);
    mockAccounts.mockResolvedValue([{ id: 'acc-1', email: 'rep@apprend.co', display_name: 'Rep' }]);
    mockMeeting.mockResolvedValue({
      ...MEETINGS.items[0],
      description: null,
      proposed_slots: [{ start: '2026-07-25T09:30:00Z', label: 'Fri, Jul 25 · 9:30 AM' }],
      conversation_thread: [
        { role: 'contact', text: 'Yes, let us talk!', at: '2026-07-20T08:00:00Z' },
        { role: 'agent', text: 'Here are some times', at: '2026-07-20T08:01:00Z' },
      ],
      gmail_thread_id: 'thread-1',
    });
    mockCancel.mockResolvedValue({ ...MEETINGS.items[0], status: 'cancelled' });
  });

  it('shows the active status and funnel stats', async () => {
    renderPage();
    expect(screen.getByRole('heading', { name: /meeting booking agent/i })).toBeInTheDocument();
    // Wait for the config + stats to resolve (header shows "Off" until config loads).
    expect(await screen.findByText('3.2h')).toBeInTheDocument();
    // Active pill.
    expect(screen.getAllByText(/active/i).length).toBeGreaterThan(0);
    // Total booked = confirmed + completed = 2; show rate 50%.
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('50%')).toBeInTheDocument();
  });

  it('renders the config summary with the selected calendar', async () => {
    renderPage();
    expect(await screen.findByText('rep@apprend.co')).toBeInTheDocument();
    expect(screen.getByText('30 min')).toBeInTheDocument();
    expect(screen.getByText('09:00–17:00')).toBeInTheDocument();
  });

  it('lists a booked meeting with its status and time', async () => {
    renderPage();
    expect(await screen.findByText('Dana Lee')).toBeInTheDocument();
    expect(screen.getByText('Intro call with Acme')).toBeInTheDocument();
    // Status badge (also appears in stats context, so allow multiple).
    expect(screen.getAllByText('Confirmed').length).toBeGreaterThan(0);
  });

  it('toggles the agent on/off via the switch', async () => {
    const user = userEvent.setup();
    mockUpdateConfig.mockResolvedValue({ ...CONFIG_ON, is_active: false });
    renderPage();
    await screen.findByText('rep@apprend.co');
    await user.click(screen.getByRole('button', { name: /turn agent off/i }));
    expect(mockUpdateConfig).toHaveBeenCalledWith({ is_active: false });
  });

  it('hides edit controls for non-admins', async () => {
    mockIsAdmin = false;
    renderPage();
    await screen.findByText('rep@apprend.co');
    expect(screen.queryByRole('button', { name: /edit/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /turn agent/i })).not.toBeInTheDocument();
  });

  it('opens the config form and saves changes', async () => {
    const user = userEvent.setup();
    mockUpdateConfig.mockResolvedValue(CONFIG_ON);
    renderPage();
    await screen.findByText('rep@apprend.co');
    await user.click(screen.getByRole('button', { name: /^edit$/i }));

    const duration = screen.getByLabelText(/meeting length/i);
    await user.clear(duration);
    await user.type(duration, '45');
    await user.click(screen.getByRole('button', { name: /save settings/i }));

    expect(mockUpdateConfig).toHaveBeenCalled();
    const body = mockUpdateConfig.mock.calls[0][0];
    expect(body.default_meeting_duration_minutes).toBe(45);
    // Empty templates are sent as null, not "".
    expect(body.confirmation_template).toBeNull();
  });

  it('expands a meeting to show the scheduling thread and can cancel', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('button', { name: /show details for dana lee/i }));
    expect(await screen.findByText(/scheduling thread/i)).toBeInTheDocument();
    expect(screen.getByText('Here are some times')).toBeInTheDocument();
    expect(screen.getByText(/calendar invite created/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /cancel meeting/i }));
    expect(mockCancel).toHaveBeenCalledWith('m-1');
  });

  it('switches the meetings filter', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Dana Lee');
    // Default filter is upcoming.
    expect(mockMeetings).toHaveBeenCalledWith({ filter: 'upcoming' });
    await user.click(screen.getByRole('button', { name: /^past$/i }));
    expect(mockMeetings).toHaveBeenCalledWith({ filter: 'past' });
  });

  it('warns when active but no calendar is connected', async () => {
    mockGetConfig.mockResolvedValue({ ...CONFIG_ON, calendar_account_id: null });
    renderPage();
    expect(await screen.findByText(/no calendar is connected/i)).toBeInTheDocument();
  });

  it('surfaces a config load failure instead of a blank page', async () => {
    mockGetConfig.mockRejectedValue(new Error('boom'));
    renderPage();
    expect(await screen.findByText(/couldn't load the booking agent/i)).toBeInTheDocument();
  });

  it('shows an empty state when there are no meetings', async () => {
    mockMeetings.mockResolvedValue({ items: [], total: 0 });
    renderPage();
    expect(await screen.findByText(/no upcoming meetings/i)).toBeInTheDocument();
  });
});
