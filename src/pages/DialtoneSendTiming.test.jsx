import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockStatus = vi.fn();
const mockExperiment = vi.fn();
const mockHeatmap = vi.fn();
const mockContacts = vi.fn();
vi.mock('../api/client', () => ({
  api: { get: vi.fn(), post: vi.fn() },
  dialtoneApi: { console: vi.fn(), activity: vi.fn() },
  sendTimingApi: {
    status: (...a) => mockStatus(...a),
    experiment: (...a) => mockExperiment(...a),
    heatmap: (...a) => mockHeatmap(...a),
    contacts: (...a) => mockContacts(...a),
  },
}));

import DialtoneSendTiming from './DialtoneSendTiming';

const STATUS = {
  enabled: true,
  optimized_fraction: 0.5,
  min_opens: 3,
  max_delay_hours: 48,
  reply_weight: 3,
  default_dows: [2, 3, 4],
  default_hour_start: 9,
  default_hour_end: 11,
  business_hour_start: 8,
  business_hour_end: 18,
  weekdays_only: true,
  profiles_total: 42,
  profiles_with_signal: 7,
  profiles_with_opens: 15,
  contacts_with_timezone: 40,
  last_computed: '2026-07-17T06:00:00Z',
};

const EXPERIMENT = {
  arms: [
    { arm: 'optimized', enrollments: 120, sent: 100, opens: 48, replies: 12, open_rate: 0.48, reply_rate: 0.12 },
    { arm: 'control', enrollments: 118, sent: 96, opens: 34, replies: 6, open_rate: 0.354, reply_rate: 0.0625 },
  ],
  open_rate_lift: 0.126,
  reply_rate_lift: 0.0575,
  open_rate_confidence: 0.981,
  reply_rate_confidence: 0.972,
  significant: true,
  confidence_target: 0.95,
  note: '',
};

const HEATMAP = {
  has_data: true,
  cells: [
    { dow: 2, hour: 10, sent: 20, opened: 12, open_rate: 0.6 },
    { dow: 3, hour: 14, sent: 15, opened: 6, open_rate: 0.4 },
  ],
  total_sent: 35,
  total_opened: 18,
  overall_open_rate: 0.514,
  best_cell: { dow: 2, hour: 10, sent: 20, opened: 12, open_rate: 0.6 },
  min_sample: 3,
};

const CONTACTS = {
  contacts: [
    {
      contact_id: 'c1',
      name: 'Dana Ops',
      email: 'dana@acme.com',
      timezone: 'America/New_York',
      tz_source: 'company_geo',
      best_dow: 2,
      best_hour: 10,
      opens_total: 9,
      confidence: 0.8,
      window: { tz: 'America/New_York', dow_preference: [2], hour_start: 10, hour_end: 12, confidence: 0.8, source: 'personal' },
      last_computed: '2026-07-17T06:00:00Z',
    },
  ],
  total: 42,
};

const renderPage = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter>
        <DialtoneSendTiming />
      </MemoryRouter>
    </QueryClientProvider>
  );

describe('DialtoneSendTiming page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockStatus.mockResolvedValue(STATUS);
    mockExperiment.mockResolvedValue(EXPERIMENT);
    mockHeatmap.mockResolvedValue(HEATMAP);
    mockContacts.mockResolvedValue(CONTACTS);
  });

  it('renders the optimizer status with the learned-profile counts', async () => {
    renderPage();
    expect(await screen.findByText('Optimizer on')).toBeInTheDocument();
    // profiles_total and profiles_with_signal both surface as stats.
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('7')).toBeInTheDocument();
  });

  it('shows the optimized-vs-control lift and calls a significant win', async () => {
    renderPage();
    // Reply-rate lift in points, and the significance banner.
    expect(await screen.findByText('+5.8 pts')).toBeInTheDocument();
    expect(screen.getByText(/optimized timing wins on replies/i)).toBeInTheDocument();
    // Both arm rates render (each appears in its arm card and the lift row).
    expect(screen.getAllByText('48.0%').length).toBeGreaterThan(0);
    expect(screen.getAllByText('35.4%').length).toBeGreaterThan(0);
  });

  it('renders the heatmap with its best cell called out', async () => {
    renderPage();
    // Wait on the heatmap cell itself (its title is a single intact node) so we
    // don't race the query by matching the always-present header copy.
    expect(await screen.findByTitle(/Tuesday 10a .* 60\.0% open rate \(12\/20\)/)).toBeInTheDocument();
    // The best-cell callout labels the same peak.
    expect(screen.getByText(/60\.0% open \(/)).toBeInTheDocument();
  });

  it('lists per-contact learned windows', async () => {
    renderPage();
    expect(await screen.findByText('Dana Ops')).toBeInTheDocument();
    expect(screen.getByText('Tue, 10 AM–12 PM')).toBeInTheDocument();
    // The window source badge.
    expect(screen.getByText('personal')).toBeInTheDocument();
  });

  it('shows the off state when the optimizer is disabled', async () => {
    mockStatus.mockResolvedValue({ ...STATUS, enabled: false });
    renderPage();
    expect(await screen.findByText('Optimizer off')).toBeInTheDocument();
    expect(screen.getByText(/naive next-window timing/i)).toBeInTheDocument();
  });

  it('reports "not enough data" when an arm has no sends', async () => {
    mockExperiment.mockResolvedValue({
      arms: [
        { arm: 'optimized', enrollments: 0, sent: 0, opens: 0, replies: 0, open_rate: 0, reply_rate: 0 },
        { arm: 'control', enrollments: 0, sent: 0, opens: 0, replies: 0, open_rate: 0, reply_rate: 0 },
      ],
      open_rate_lift: null,
      reply_rate_lift: null,
      significant: false,
      confidence_target: 0.95,
      note: 'Not enough data yet — both arms need sends before a lift can be measured.',
    });
    renderPage();
    expect(await screen.findByText(/both arms need sends/i)).toBeInTheDocument();
  });

  it('degrades gracefully when the heatmap has no data', async () => {
    mockHeatmap.mockResolvedValue({ has_data: false, cells: [] });
    renderPage();
    expect(await screen.findByText(/no send history yet/i)).toBeInTheDocument();
  });
});
