import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const mockLive = vi.fn();
vi.mock('../hooks/useDialtone', () => ({
  useLiveActivity: (...a) => mockLive(...a),
}));

import LiveActivityFeed from './LiveActivityFeed';

// Fixed server clock, so "2m ago" is an assertion and not a race with the
// wall clock.
const SERVER_TIME = '2026-07-25T12:00:00Z';

const EVENTS = [
  {
    id: 'e1',
    type: 'reply',
    timestamp: '2026-07-25T11:58:00Z',
    title: 'Dana Reyes replied',
    severity: 'ok',
    source: 'outreach',
    metadata: { to_email: 'dana@acme.com', contact_id: 'c-1' },
  },
  {
    id: 'e2',
    type: 'email_sent',
    timestamp: '2026-07-25T11:30:00Z',
    title: 'Sent to Chris Poole',
    severity: 'ok',
    source: 'outreach',
    metadata: { to_email: 'chris@bolt.com' },
  },
];

function renderFeed() {
  return render(
    <MemoryRouter>
      <LiveActivityFeed />
    </MemoryRouter>,
  );
}

describe('LiveActivityFeed', () => {
  beforeEach(() => {
    mockLive.mockReset();
    mockLive.mockReturnValue({
      items: EVENTS,
      serverTime: SERVER_TIME,
      isLoading: false,
      isFetching: false,
      windowHours: 24,
    });
  });

  it('renders each event with its type badge', () => {
    renderFeed();
    expect(screen.getByText('Dana Reyes replied')).toBeInTheDocument();
    expect(screen.getByText('Sent to Chris Poole')).toBeInTheDocument();
    expect(screen.getByText('Reply')).toBeInTheDocument();
    expect(screen.getByText('Sent')).toBeInTheDocument();
  });

  it('measures relative times against the server clock, not the viewer\'s', () => {
    // A laptop running fast would otherwise render "in 3 minutes" and make a
    // working send look like a bug in the sending engine.
    renderFeed();
    expect(screen.getByText('2m ago')).toBeInTheDocument();
    expect(screen.getByText('30m ago')).toBeInTheDocument();
  });

  it('links an event to the contact it is about, and leaves the rest inert', () => {
    renderFeed();
    const link = screen.getByText('Dana Reyes replied').closest('a');
    expect(link).toHaveAttribute('href', '/contacts?highlight=c-1');
    // No contact id → no link to nowhere.
    expect(screen.getByText('Sent to Chris Poole').closest('a')).toBeNull();
  });

  it('says how far back an empty feed looked', () => {
    // "Nothing" over 24 hours means something quite different from "nothing,
    // ever" — the window has to be on screen.
    mockLive.mockReturnValue({
      items: [], serverTime: SERVER_TIME, isLoading: false, isFetching: false, windowHours: 24,
    });
    renderFeed();
    expect(screen.getByText(/last 24 hours/i)).toBeInTheDocument();
  });

  it('shows a waiting state before the first response', () => {
    mockLive.mockReturnValue({
      items: [], serverTime: null, isLoading: true, isFetching: true, windowHours: 24,
    });
    renderFeed();
    expect(screen.getByText(/waiting for activity/i)).toBeInTheDocument();
  });

  it('pausing stops the polling instead of just hiding rows', () => {
    // Rows arriving mid-read shift the list under the cursor. Pause has to
    // actually disable the query, or the feed keeps moving behind a label that
    // says it stopped.
    renderFeed();
    expect(mockLive).toHaveBeenLastCalledWith(
      expect.objectContaining({ enabled: true }),
    );

    fireEvent.click(screen.getByRole('button', { name: /pause/i }));

    expect(mockLive).toHaveBeenLastCalledWith(
      expect.objectContaining({ enabled: false }),
    );
    expect(screen.getByText('paused')).toBeInTheDocument();
    // Frozen, not emptied — what was on screen stays readable.
    expect(screen.getByText('Dana Reyes replied')).toBeInTheDocument();
  });

  it('resumes polling', () => {
    renderFeed();
    fireEvent.click(screen.getByRole('button', { name: /pause/i }));
    fireEvent.click(screen.getByRole('button', { name: /resume/i }));
    expect(mockLive).toHaveBeenLastCalledWith(
      expect.objectContaining({ enabled: true }),
    );
  });

  it('a background refresh does not blank the feed', () => {
    mockLive.mockReturnValue({
      items: EVENTS, serverTime: SERVER_TIME, isLoading: false, isFetching: true, windowHours: 24,
    });
    renderFeed();
    expect(screen.getByText('Dana Reyes replied')).toBeInTheDocument();
    expect(screen.getByText(/checking/i)).toBeInTheDocument();
  });
});
