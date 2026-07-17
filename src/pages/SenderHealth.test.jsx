import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockSenders = vi.fn();
const mockHistory = vi.fn();
const mockAssess = vi.fn();
const mockAutomation = vi.fn();
const mockBookingGet = vi.fn();
const mockBookingSet = vi.fn();
vi.mock('../api/client', () => ({
  api: { get: vi.fn(), post: vi.fn() },
  queryClient: { invalidateQueries: vi.fn(), setQueryData: vi.fn() },
  deliverabilityApi: {
    senders: (...a) => mockSenders(...a),
    sendersHistory: (...a) => mockHistory(...a),
    assess: (...a) => mockAssess(...a),
  },
  systemApi: {
    automation: (...a) => mockAutomation(...a),
  },
  bookingApi: {
    get: (...a) => mockBookingGet(...a),
    set: (...a) => mockBookingSet(...a),
  },
}));
vi.mock('react-hot-toast', () => ({
  default: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }),
}));

// ResponsiveContainer collapses to 0×0 under jsdom; stub it to a fixed box so
// the trend charts render without warnings.
vi.mock('recharts', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    ResponsiveContainer: ({ children }) => <div style={{ width: 400, height: 200 }}>{children}</div>,
  };
});

import SenderHealth from './SenderHealth';

const HEALTHY = {
  account_id: 'acc-1',
  account_type: 'gmail',
  account_email: 'good@apprend.co',
  sent_7d: 120,
  bounce_rate_7d: 0.004,
  complaint_rate_7d: 0.0001,
  open_rate_7d: 0.42,
  reputation_score: 96,
  throttle_factor: 1.0,
  status: 'healthy',
  last_assessed: '2026-07-17T08:00:00Z',
};

// Bounce rate (6%) over the 5% throttle line, and throttled.
const THROTTLED = {
  account_id: 'acc-2',
  account_type: 'gmail',
  account_email: 'shaky@apprend.co',
  sent_7d: 80,
  bounce_rate_7d: 0.06,
  complaint_rate_7d: 0.0028,
  open_rate_7d: 0.11,
  reputation_score: 52,
  throttle_factor: 0.4,
  status: 'throttled',
  last_assessed: '2026-07-17T08:00:00Z',
};

const HISTORY = [
  {
    account_id: 'acc-2',
    account_type: 'gmail',
    account_email: 'shaky@apprend.co',
    points: [
      { captured_at: '2026-07-01T08:00:00Z', reputation_score: 88, bounce_rate_7d: 0.01, complaint_rate_7d: 0.0002, throttle_factor: 1.0, status: 'healthy' },
      { captured_at: '2026-07-17T08:00:00Z', reputation_score: 52, bounce_rate_7d: 0.06, complaint_rate_7d: 0.0028, throttle_factor: 0.4, status: 'throttled' },
    ],
  },
];

const renderPage = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <SenderHealth />
    </QueryClientProvider>
  );

describe('SenderHealth page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSenders.mockResolvedValue([HEALTHY, THROTTLED]);
    mockHistory.mockResolvedValue(HISTORY);
    mockAssess.mockResolvedValue({ accounts_assessed: 2 });
    mockAutomation.mockResolvedValue({ flags: [], scheduling_link: 'https://calendly.com/apprend/intro' });
    mockBookingGet.mockResolvedValue({
      account_id: 'acc-1', account_type: 'gmail', email: 'good@apprend.co',
      booking_url: null, booking_provider: null, booking_auto_inject: true,
    });
    mockBookingSet.mockResolvedValue({
      account_id: 'acc-1', account_type: 'gmail', email: 'good@apprend.co',
      booking_url: 'https://calendly.com/good/15min', booking_provider: null, booking_auto_inject: true,
    });
  });

  it('lists each sender with reputation, status and rates', async () => {
    renderPage();
    expect(await screen.findByText('good@apprend.co')).toBeInTheDocument();
    // shaky appears in both the row and the at-risk banner — that's by design.
    expect(screen.getAllByText('shaky@apprend.co').length).toBeGreaterThan(0);
    expect(screen.getByText('96')).toBeInTheDocument();
    expect(screen.getByText('52')).toBeInTheDocument();
    // Status labels appear on the chip and again in the legend, so allow multiples.
    expect(screen.getAllByText('Healthy').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Throttled').length).toBeGreaterThan(0);
    // Bounce rate shown as a percentage (row metric + warning line).
    expect(screen.getAllByText('6.00%').length).toBeGreaterThan(0);
  });

  it('warns about senders approaching or over a threshold', async () => {
    renderPage();
    await screen.findByText('good@apprend.co');
    // Fleet roll-up banner names the count and the offending account.
    const banner = screen.getByRole('heading', { name: /1 sender needs attention/i }).closest('div');
    expect(within(banner).getByText('shaky@apprend.co')).toBeInTheDocument();
    // Bounce over the pause line is flagged as a breach; complaint is nearing.
    expect(banner).toHaveTextContent(/Bounce rate 6\.00% \(over 5\.00%\)/);
    expect(banner).toHaveTextContent(/Complaint rate 0\.28% \(nearing 0\.30%\)/);
  });

  it('never renders a failed load as healthy senders', async () => {
    mockSenders.mockRejectedValue(new Error('timeout'));
    renderPage();
    expect(await screen.findByText(/couldn't load sender health/i)).toBeInTheDocument();
    expect(screen.getByText(/says nothing about whether your senders are healthy/i)).toBeInTheDocument();
    expect(screen.queryByText(/no senders assessed yet/i)).not.toBeInTheDocument();
  });

  it('shows an empty state when nothing is assessed', async () => {
    mockSenders.mockResolvedValue([]);
    renderPage();
    expect(await screen.findByText(/no senders assessed yet/i)).toBeInTheDocument();
  });

  it('shows the reputation trend when history is expanded', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('button', { name: /show trend for shaky@apprend.co/i }));
    // The trend section labels the reputation series.
    expect(await screen.findByText(/Reputation · last 2 assessments/i)).toBeInTheDocument();
  });

  it('explains there is not enough history to trend for a fresh account', async () => {
    const user = userEvent.setup();
    // good@ has no history series.
    renderPage();
    await screen.findByText('good@apprend.co');
    await user.click(screen.getByRole('button', { name: /show trend for good@apprend.co/i }));
    expect(await screen.findByText(/not enough history yet to trend/i)).toBeInTheDocument();
  });

  it('shows a downward trend arrow when reputation has fallen', async () => {
    renderPage();
    // shaky went 88 → 52 over the window: delta -36.
    expect(await screen.findByText('-36')).toBeInTheDocument();
  });

  it('triggers a reassessment on demand', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('good@apprend.co');
    await user.click(screen.getByRole('button', { name: /reassess now/i }));
    expect(mockAssess).toHaveBeenCalled();
  });

  it('treats an unrecognised status as unknown, not healthy', async () => {
    mockSenders.mockResolvedValue([{ ...HEALTHY, status: 'weird', account_email: 'odd@apprend.co' }]);
    mockHistory.mockResolvedValue([]);
    renderPage();
    await screen.findByText('odd@apprend.co');
    expect(screen.getByText('Unknown')).toBeInTheDocument();
  });

  it('states the scoring thresholds explicitly', async () => {
    renderPage();
    await screen.findByText('good@apprend.co');
    expect(screen.getByText(/how senders are scored/i)).toBeInTheDocument();
    // Complaint throttle line is 0.30%.
    const legend = screen.getByText(/how senders are scored/i).closest('div');
    expect(within(legend).getByText(/0\.30%/)).toBeInTheDocument();
  });

  it('shows a sender using the global booking default when expanded', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('button', { name: /show trend for good@apprend.co/i }));
    // Booking config loads lazily on expand and reports the fallback.
    expect(await screen.findByText(/using global default/i)).toBeInTheDocument();
    // Names the actual global link from /system/automation.
    expect(screen.getByRole('link', { name: 'https://calendly.com/apprend/intro' })).toBeInTheDocument();
    expect(mockBookingGet).toHaveBeenCalledWith('acc-1');
  });

  it('saves a custom booking URL for a sender', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('button', { name: /show trend for good@apprend.co/i }));
    await screen.findByText(/using global default/i);

    await user.click(screen.getByRole('button', { name: /set custom/i }));
    const input = screen.getByLabelText(/custom booking url/i);
    await user.type(input, 'https://calendly.com/good/15min');
    await user.click(screen.getByRole('button', { name: /^save$/i }));

    expect(mockBookingSet).toHaveBeenCalledWith('acc-1', { booking_url: 'https://calendly.com/good/15min' });
  });

  it('resets a custom booking URL back to the global default', async () => {
    const user = userEvent.setup();
    mockBookingGet.mockResolvedValue({
      account_id: 'acc-1', account_type: 'gmail', email: 'good@apprend.co',
      booking_url: 'https://calendly.com/good/15min', booking_provider: null, booking_auto_inject: true,
    });
    renderPage();
    await user.click(await screen.findByRole('button', { name: /show trend for good@apprend.co/i }));
    // The custom URL is shown as a link.
    expect(await screen.findByRole('link', { name: /calendly\.com\/good\/15min/i })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /reset to global/i }));
    // Clearing the URL server-side is what "reset to global" means.
    expect(mockBookingSet).toHaveBeenCalledWith('acc-1', { booking_url: '' });
  });
});
