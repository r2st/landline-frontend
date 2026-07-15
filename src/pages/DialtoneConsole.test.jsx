import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock the data hooks so the page renders deterministically without a backend.
const mockConsole = vi.fn();
const mockActivity = vi.fn();
vi.mock('../hooks/useDialtone', () => ({
  useDialtoneConsole: (...a) => mockConsole(...a),
  useDialtoneActivity: (...a) => mockActivity(...a),
}));

// The embedded SendingKillSwitch banner fetches sending status on mount — stub
// the API client so the page renders offline without hitting the network.
vi.mock('../api/client', () => ({
  api: { get: vi.fn().mockResolvedValue({ data: { enabled: true } }), post: vi.fn() },
}));

import DialtoneConsole from './DialtoneConsole';

const CONSOLE = {
  date: '2026-07-15',
  sending: { enabled: true },
  warmup: {
    today_sent: 8, daily_limit: 20, daily_remaining: 12, monthly_sent: 120,
    warmup_active: true, warmup_week: 1,
  },
  today: {
    emails_sent: 8, opens: 5, clicks: 2, replies: 1, bounces: 0, errors: 0, leads_discovered: 3,
  },
  senders: [
    {
      account_id: 'a1', account_type: 'gmail', email: 'suman.das@apprend.tech',
      health_status: 'healthy', reputation_score: 96, throttle_factor: 1,
      effective_daily_limit: 20, warmup_daily_limit: 20, used_today: 8, remaining_today: 12,
    },
  ],
};

const FEED = {
  items: [
    {
      id: 'email_sent:1', type: 'email_sent', timestamp: new Date().toISOString(),
      title: 'Email sent to John Smith', description: 'Intro', source: 'email_send',
      severity: 'ok', metadata: { to_email: 'john@acme.com', subject: 'Intro' },
    },
    {
      id: 'reply:1', type: 'reply', timestamp: new Date().toISOString(),
      title: 'Jane Doe replied', description: 'Re: Intro', source: 'email_send',
      severity: 'ok', metadata: { to_email: 'jane@acme.com' },
    },
  ],
  total: 2, page: 1, page_size: 50,
};

describe('DialtoneConsole page', () => {
  beforeEach(() => {
    mockConsole.mockReturnValue({ data: CONSOLE, isLoading: false, refetch: vi.fn(), isFetching: false });
    mockActivity.mockReturnValue({ data: FEED, isLoading: false });
  });

  it('renders the console header, warm-up progress and today tallies', () => {
    render(<DialtoneConsole />);
    expect(screen.getByText('Dialtone Console')).toBeInTheDocument();
    expect(screen.getByText('Warm-up progress')).toBeInTheDocument();
    // Warm-up "8 / 20 today" (8 also appears in the tallies, so assert ≥1).
    expect(screen.getAllByText('8').length).toBeGreaterThan(0);
    expect(screen.getByText(/\/ 20 today/)).toBeInTheDocument();
    // Sender surfaced.
    expect(screen.getByText('suman.das@apprend.tech')).toBeInTheDocument();
  });

  it('renders the activity feed events', () => {
    render(<DialtoneConsole />);
    expect(screen.getByText('Email sent to John Smith')).toBeInTheDocument();
    expect(screen.getByText('Jane Doe replied')).toBeInTheDocument();
    expect(screen.getByText('john@acme.com')).toBeInTheDocument();
  });

  it('shows an empty state when the feed is empty', () => {
    mockActivity.mockReturnValue({ data: { items: [], total: 0, page: 1, page_size: 50 }, isLoading: false });
    render(<DialtoneConsole />);
    expect(screen.getByText('No activity yet')).toBeInTheDocument();
  });
});
