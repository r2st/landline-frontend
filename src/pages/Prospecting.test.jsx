import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock the data hooks so the page renders deterministically without a backend.
const mockCandidates = vi.fn();
const mockRuns = vi.fn();
const mockReview = vi.fn();
const mockBulk = vi.fn();
vi.mock('../hooks/useProspecting', async () => {
  const actual = await vi.importActual('../hooks/useProspecting');
  return {
    QUEUE_STATUSES: actual.QUEUE_STATUSES,
    useProspectCandidates: (...a) => mockCandidates(...a),
    useProspectingRuns: (...a) => mockRuns(...a),
    useReviewCandidate: () => mockReview(),
    useBulkReview: () => mockBulk(),
  };
});

vi.mock('../context/AuthContext', () => ({
  useAuth: () => ({ user: { email: 'rep@apprend.tech', name: 'Rep' } }),
}));

import Prospecting from './Prospecting';

// A Places-sourced candidate: `raw_data.industry` is the search query that
// found it, and it has an email so it is actually enrollable.
const PLACES = {
  id: 'c1',
  run_id: 'r1',
  company_id: 'co1',
  company_name: 'Cleveland Precision Machining',
  domain: 'clevelandprecision.com',
  source: 'google_places',
  fit_score: 68,
  qualification: {},
  status: 'review',
  has_email: true,
  raw_data: { industry: 'CNC Machining', city: 'Cleveland', state: 'OH', country: 'US' },
  created_at: '2026-07-15T10:00:00Z',
};
const NO_EMAIL = {
  id: 'c2',
  run_id: 'r1',
  company_id: 'co2',
  company_name: 'Woodcraft Interiors',
  domain: null,
  source: 'apollo',
  fit_score: 52,
  qualification: {},
  status: 'review',
  has_email: false,
  raw_data: { industry: 'Woodworking', country: 'US' },
  created_at: '2026-07-14T10:00:00Z',
};

const RUN = {
  id: 'r1',
  trigger: 'scheduled',
  status: 'completed',
  target_volume: 25,
  sources_queried: ['google_places'],
  companies_found: 25,
  companies_qualified: 9,
  companies_enrolled: 4,
  companies_review_queue: 5,
  results: {},
  error: null,
  started_at: '2026-07-15T09:00:00Z',
  completed_at: '2026-07-15T09:04:00Z',
};

const mutate = vi.fn();

describe('Prospecting page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCandidates.mockReturnValue({ data: [PLACES, NO_EMAIL], isLoading: false, isFetching: false });
    mockRuns.mockReturnValue({ data: [RUN], isLoading: false });
    mockReview.mockReturnValue({ mutate, isPending: false, variables: null });
    mockBulk.mockReturnValue({ mutate, isPending: false });
  });

  it('renders each candidate with the context needed to decide', () => {
    render(<Prospecting />);
    expect(screen.getByText('Cleveland Precision Machining')).toBeInTheDocument();
    // The search query that surfaced it, not the Places category.
    expect(screen.getByText('CNC Machining')).toBeInTheDocument();
    expect(screen.getByText('Cleveland, OH, US')).toBeInTheDocument();
    expect(screen.getByText('68')).toBeInTheDocument();
    expect(screen.getByText('Places')).toBeInTheDocument();
  });

  it('distinguishes candidates that have someone to email from ones that do not', () => {
    render(<Prospecting />);
    const rows = screen.getAllByRole('row');
    const places = rows.find((r) => within(r).queryByText('Cleveland Precision Machining'));
    const noEmail = rows.find((r) => within(r).queryByText('Woodcraft Interiors'));
    expect(within(places).getByText('Yes')).toBeInTheDocument();
    expect(within(noEmail).getByText('No')).toBeInTheDocument();
  });

  it('approves a single candidate as the signed-in reviewer, after confirming', async () => {
    const user = userEvent.setup();
    render(<Prospecting />);
    await user.click(screen.getAllByRole('button', { name: /approve$/i })[0]);
    // Approving arms a real cold email — it must not fire on the first click.
    expect(mutate).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: /approve & enrol/i }));
    expect(mutate).toHaveBeenCalledWith(
      { id: 'c1', decision: 'approve', reviewer: 'rep@apprend.tech' },
      expect.anything()
    );
  });

  it('sends nothing when an approval is cancelled', async () => {
    const user = userEvent.setup();
    render(<Prospecting />);
    await user.click(screen.getAllByRole('button', { name: /approve$/i })[0]);
    await user.click(screen.getByRole('button', { name: /cancel/i }));
    expect(mutate).not.toHaveBeenCalled();
  });

  it('rejects a single candidate without a confirm step', async () => {
    const user = userEvent.setup();
    render(<Prospecting />);
    await user.click(screen.getAllByRole('button', { name: /^reject$/i })[0]);
    expect(mutate).toHaveBeenCalledWith(
      { id: 'c1', decision: 'reject', reviewer: 'rep@apprend.tech' },
      expect.anything()
    );
  });

  it('bulk-approves every selected candidate, after confirming', async () => {
    const user = userEvent.setup();
    render(<Prospecting />);
    await user.click(screen.getByLabelText('Select all candidates'));
    expect(screen.getByText('2 selected')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /approve selected/i }));
    expect(mutate).not.toHaveBeenCalled();
    // The confirm names the blast radius before anything is sent.
    expect(screen.getByText(/Approve 2 candidates and start outreach\?/)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /^approve 2$/i }));
    expect(mutate).toHaveBeenCalledWith(
      { ids: ['c1', 'c2'], decision: 'approve', reviewer: 'rep@apprend.tech' },
      expect.anything()
    );
  });

  it('asks the API for the enrolled disposition when filtering to Approved', async () => {
    const user = userEvent.setup();
    render(<Prospecting />);
    await user.click(screen.getByRole('button', { name: 'Approved' }));
    // "Approved" is stored as 'enrolled' — the filter must not send 'approved'.
    expect(mockCandidates).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: 'enrolled' })
    );
  });

  it('hides the decision buttons for already-reviewed candidates', async () => {
    const user = userEvent.setup();
    mockCandidates.mockReturnValue({
      data: [{ ...PLACES, status: 'enrolled', reviewed_by: 'rep@apprend.tech' }],
      isLoading: false,
      isFetching: false,
    });
    render(<Prospecting />);
    await user.click(screen.getByRole('button', { name: 'Approved' }));
    expect(screen.queryByRole('button', { name: /approve$/i })).not.toBeInTheDocument();
    expect(screen.getByText('by rep@apprend.tech')).toBeInTheDocument();
  });

  it('sorts by date on request', async () => {
    const user = userEvent.setup();
    render(<Prospecting />);
    await user.selectOptions(screen.getByLabelText('Sort by'), 'created_at');
    expect(mockCandidates).toHaveBeenLastCalledWith(
      expect.objectContaining({ sort: 'created_at', order: 'desc' })
    );
  });

  it('shows an empty state when nothing is waiting', () => {
    mockCandidates.mockReturnValue({ data: [], isLoading: false, isFetching: false });
    render(<Prospecting />);
    expect(screen.getByText('Nothing waiting on you')).toBeInTheDocument();
  });

  it('renders run history with its found/qualified/enrolled tallies', async () => {
    const user = userEvent.setup();
    render(<Prospecting />);
    await user.click(screen.getByRole('button', { name: /runs/i }));
    expect(screen.getByText('completed')).toBeInTheDocument();
    expect(screen.getByText('25')).toBeInTheDocument(); // found
    expect(screen.getByText('9')).toBeInTheDocument(); // qualified
    expect(screen.getByText('4')).toBeInTheDocument(); // enrolled
    expect(screen.getByText(/via Places/)).toBeInTheDocument();
  });

  it('surfaces a failed run error', async () => {
    const user = userEvent.setup();
    mockRuns.mockReturnValue({
      data: [{ ...RUN, status: 'failed', error: 'Places quota exhausted' }],
      isLoading: false,
    });
    render(<Prospecting />);
    await user.click(screen.getByRole('button', { name: /runs/i }));
    expect(screen.getByText('Places quota exhausted')).toBeInTheDocument();
  });
});
