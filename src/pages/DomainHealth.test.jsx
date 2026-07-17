import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockList = vi.fn();
const mockDetail = vi.fn();
const mockRecheck = vi.fn();
vi.mock('../api/client', () => ({
  api: { get: vi.fn(), post: vi.fn() },
  queryClient: { invalidateQueries: vi.fn() },
  domainHealthApi: {
    list: (...a) => mockList(...a),
    detail: (...a) => mockDetail(...a),
    recheck: (...a) => mockRecheck(...a),
  },
}));
vi.mock('react-hot-toast', () => ({
  default: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }),
}));

import DomainHealth from './DomainHealth';

// apprend.tech's real shape as of the launch audit: SPF and DKIM pass, DMARC
// is absent. That gap is the known open blocker this page exists to surface.
const APPREND = {
  domain: 'apprend.tech',
  health_score: 72,
  band: 'watch',
  previous_score: 80,
  last_checked: '2026-07-16T08:00:00Z',
  spf: 'pass',
  dkim: 'pass',
  dmarc: 'fail',
  blacklist: 'ok',
};

const renderPage = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <DomainHealth />
    </QueryClientProvider>
  );

describe('DomainHealth page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockList.mockResolvedValue([APPREND]);
    mockDetail.mockResolvedValue({
      ...APPREND,
      coverage: {},
      spf: { status: 'pass', record: 'v=spf1 include:_spf.google.com ~all' },
      dkim: { status: 'pass', record: 'v=DKIM1; k=rsa; p=MIIB...' },
      dmarc: { status: 'fail', record: null, detail: 'No DMARC record found' },
      blacklists: { listed_on: [], checked: 6 },
      issues: ['No DMARC record — publish v=DMARC1; p=none; rua=mailto:… to start monitoring.'],
      notes: ['Google Postmaster Tools is not checked automatically.'],
    });
  });

  it('shows each sending domain with its score and per-check state', async () => {
    renderPage();
    expect(await screen.findByText('apprend.tech')).toBeInTheDocument();
    expect(screen.getByText('72')).toBeInTheDocument();
    expect(screen.getByText('Watch')).toBeInTheDocument();
    expect(screen.getByTitle('SPF: pass')).toBeInTheDocument();
    expect(screen.getByTitle('DMARC: fail')).toBeInTheDocument();
  });

  it('shows which way the score is moving', async () => {
    renderPage();
    await screen.findByText('apprend.tech');
    // 72 from 80 — a score alone can't tell you it's degrading.
    expect(screen.getByText('-8')).toBeInTheDocument();
  });

  it('never renders a failed load as healthy domains', async () => {
    mockList.mockRejectedValue(new Error('timeout'));
    renderPage();

    expect(await screen.findByText(/couldn't load domain health/i)).toBeInTheDocument();
    expect(screen.getByText(/says nothing about whether your domains are healthy/i)).toBeInTheDocument();
    expect(screen.queryByText(/no domains monitored/i)).not.toBeInTheDocument();
  });

  it('gives the remediation, not just a red chip', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('button', { name: /show details for apprend.tech/i }));

    expect(await screen.findByText(/needs fixing/i)).toBeInTheDocument();
    expect(screen.getByText(/publish v=DMARC1/)).toBeInTheDocument();
  });

  it('shows the raw records behind each check', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('button', { name: /show details for apprend.tech/i }));

    expect(await screen.findByText(/v=spf1 include:_spf.google.com/)).toBeInTheDocument();
    expect(screen.getByText('No DMARC record found')).toBeInTheDocument();
  });

  it('says what is NOT checked automatically', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(await screen.findByRole('button', { name: /show details for apprend.tech/i }));

    // A clean dashboard shouldn't imply every signal was checked.
    expect(await screen.findByRole('heading', { name: /not checked automatically/i })).toBeInTheDocument();
    expect(screen.getByText(/Postmaster Tools/)).toBeInTheDocument();
  });

  it('rechecks a domain on demand', async () => {
    const user = userEvent.setup();
    mockRecheck.mockResolvedValue({ domain: 'apprend.tech', health_score: 80, band: 'healthy', previous_score: 72 });
    renderPage();
    await screen.findByText('apprend.tech');

    await user.click(screen.getByRole('button', { name: /recheck/i }));
    expect(mockRecheck).toHaveBeenCalledWith('apprend.tech');
  });

  it('treats an unknown check status as unknown, not as a pass', async () => {
    mockList.mockResolvedValue([{ ...APPREND, dmarc: 'unknown' }]);
    renderPage();
    await screen.findByText('apprend.tech');
    // Rendering an unrecognized status as green would turn a broken check into
    // a clean bill of health.
    expect(screen.getByTitle('DMARC: unknown')).toBeInTheDocument();
  });

  it('shows an empty state when nothing is monitored', async () => {
    mockList.mockResolvedValue([]);
    renderPage();
    expect(await screen.findByText(/no domains monitored yet/i)).toBeInTheDocument();
  });

  it('confirms a clean domain rather than showing a blank panel', async () => {
    const user = userEvent.setup();
    mockDetail.mockResolvedValue({
      ...APPREND,
      dmarc: { status: 'pass', record: 'v=DMARC1; p=none' },
      spf: { status: 'pass', record: 'v=spf1 ~all' },
      dkim: { status: 'pass', record: 'v=DKIM1' },
      blacklists: { listed_on: [], checked: 6 },
      issues: [],
      notes: [],
    });
    renderPage();
    await user.click(await screen.findByRole('button', { name: /show details for apprend.tech/i }));

    expect(await screen.findByText(/no outstanding auth or blacklist problems/i)).toBeInTheDocument();
  });
});
