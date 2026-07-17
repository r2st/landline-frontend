import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockContact = vi.fn();
vi.mock('../api/client', () => ({
  sendTimingApi: {
    contact: (...a) => mockContact(...a),
  },
}));

import ContactSendTiming from './ContactSendTiming';

const TIMING = {
  contact_id: 'c1',
  email: 'dana@acme.com',
  timezone: 'America/New_York',
  tz_source: 'company_location',
  profile: {
    buckets: {},
    opens_total: 12,
    best_dow: 2, // Tuesday
    best_hour: 9,
    confidence: 0.72,
    last_computed: '2026-07-16T09:00:00Z',
  },
  window: {
    tz: 'America/New_York',
    dow_preference: [2, 3, 4],
    hour_start: 9,
    hour_end: 11,
    confidence: 0.72,
    source: 'personal',
  },
  next_send_at: '2026-07-21T13:00:00Z', // Tue 9:00 AM ET
};

const renderPanel = (contactId = 'c1') =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <ContactSendTiming contactId={contactId} />
    </QueryClientProvider>
  );

describe('ContactSendTiming', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockContact.mockResolvedValue(TIMING);
  });

  it('fetches timing for the given contact', async () => {
    renderPanel();
    // Wait on the loaded badge ("Best send time"), NOT the loading placeholder
    // ("Loading best send time…") which would resolve immediately.
    await screen.findByText('Best send time');
    expect(mockContact).toHaveBeenCalledWith('c1');
  });

  it('shows the best send day/hour badge', async () => {
    renderPanel();
    await screen.findByText('Best send time');
    // best_dow=2 (Tuesday), best_hour=9 → "Tuesday, 9a"
    expect(screen.getByText(/Tuesday, 9a/)).toBeInTheDocument();
  });

  it('shows the timezone indicator', async () => {
    renderPanel();
    await screen.findByText('Best send time');
    // The tz shows in the indicator and again in the next-send line.
    expect(screen.getAllByText(/America\/New_York/).length).toBeGreaterThan(0);
  });

  it('labels the signal source', async () => {
    renderPanel();
    expect(await screen.findByText(/personal signal/i)).toBeInTheDocument();
  });

  it('shows the next optimal send window', async () => {
    renderPanel();
    expect(await screen.findByText(/next optimal send/i)).toBeInTheDocument();
  });

  it('falls back to the window label when no learned best slot', async () => {
    mockContact.mockResolvedValue({
      ...TIMING,
      profile: null,
      window: { ...TIMING.window, source: 'cohort' },
    });
    renderPanel();
    expect(await screen.findByText(/cohort signal/i)).toBeInTheDocument();
    // windowLabel([2,3,4], 9-11) → "Tue–Thu, 9 AM–11 AM"; appears in the badge
    // (no learned slot) and again in the recommended-window row.
    expect(screen.getAllByText(/Tue–Thu/).length).toBeGreaterThan(0);
  });

  it('stays quiet when the endpoint errors (timing is a bonus, not core data)', async () => {
    mockContact.mockRejectedValue(new Error('404'));
    renderPanel();
    await waitFor(() => expect(mockContact).toHaveBeenCalled());
    // Once the query settles into its error state, the panel renders nothing.
    await waitFor(() =>
      expect(screen.queryByText(/best send time/i)).not.toBeInTheDocument()
    );
  });

  it('renders nothing without a contact id', () => {
    const { container } = renderPanel(null);
    expect(container.firstChild).toBeNull();
    expect(mockContact).not.toHaveBeenCalled();
  });
});
