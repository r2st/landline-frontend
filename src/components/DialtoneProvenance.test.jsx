import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockProvenance = vi.fn();
vi.mock('../api/client', () => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn() },
  queryClient: { invalidateQueries: vi.fn(), setQueryData: vi.fn() },
  prospectingApi: {
    provenance: (...a) => mockProvenance(...a),
    icp: vi.fn(), updateIcp: vi.fn(), learnIcp: vi.fn(),
    reviewQueue: vi.fn(), approve: vi.fn(), reject: vi.fn(),
    runs: vi.fn(), runCandidates: vi.fn(), run: vi.fn(),
  },
}));
vi.mock('react-hot-toast', () => ({
  default: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }),
}));

import DialtoneProvenance from './DialtoneProvenance';

const AGENT_FOUND = {
  company_id: 'co1',
  discovered_by_agent: true,
  candidate_id: 'cand1',
  source: 'google_places',
  fit_score: 68,
  qualification: { fit_score: 68, excluded: false, reason: null, components: {} },
  reasoning: 'Contract CNC shop in the Midwest manufacturing belt.',
  status: 'enrolled',
  reviewed_by: 'rep@apprend.tech',
  reviewed_at: '2026-07-15T12:00:00Z',
  discovered_at: '2026-07-15T09:00:00Z',
  dedup_confidence: 'high',
  run: {
    id: 'run1',
    trigger: 'scheduled',
    status: 'completed',
    started_at: '2026-07-15T09:00:00Z',
    sources_queried: ['google_places'],
  },
};

const renderCard = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter>
        <DialtoneProvenance companyId="co1" />
      </MemoryRouter>
    </QueryClientProvider>
  );

describe('DialtoneProvenance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockProvenance.mockResolvedValue(AGENT_FOUND);
  });

  it('answers why an agent-discovered company is in the pipeline', async () => {
    renderCard();
    expect(await screen.findByText(/found by dialtone/i)).toBeInTheDocument();
    expect(screen.getByText('68')).toBeInTheDocument();
    expect(screen.getByText('Google Places')).toBeInTheDocument();
    // The rationale is the whole point — the page had a bare source string.
    expect(screen.getByText(/Midwest manufacturing belt/)).toBeInTheDocument();
    expect(screen.getByText(/rep@apprend.tech/)).toBeInTheDocument();
  });

  it('renders nothing for a company the agent never touched', async () => {
    mockProvenance.mockResolvedValue({ company_id: 'co1', discovered_by_agent: false, run: null });
    const { container } = renderCard();
    // A manual add doesn't need a card explaining a human added it.
    await vi.waitFor(() => expect(mockProvenance).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it('stays quiet when the lookup fails', async () => {
    mockProvenance.mockRejectedValue(new Error('500'));
    const { container } = renderCard();
    // Supporting context on someone else's page — a failed lookup must not
    // shout over the company record itself.
    await vi.waitFor(() => expect(mockProvenance).toHaveBeenCalled());
    expect(container).toBeEmptyDOMElement();
  });

  it('distinguishes an agent decision from a human one', async () => {
    mockProvenance.mockResolvedValue({ ...AGENT_FOUND, reviewed_by: null, status: 'enrolled' });
    renderCard();
    // Enrolled with nobody named = the agent was confident enough to skip the
    // queue. That is a materially different fact from a person approving it.
    expect(await screen.findByText(/the agent, on its own/i)).toBeInTheDocument();
  });

  it('says when a lead is still waiting on a human', async () => {
    mockProvenance.mockResolvedValue({ ...AGENT_FOUND, status: 'review', reviewed_by: null });
    renderCard();
    expect(await screen.findByText(/waiting on a human/i)).toBeInTheDocument();
    expect(screen.getByText(/nobody yet/i)).toBeInTheDocument();
  });

  it('flags a low-confidence dedup match', async () => {
    mockProvenance.mockResolvedValue({ ...AGENT_FOUND, dedup_confidence: 'low' });
    renderCard();
    // The record may be a blend of two businesses — worth knowing before
    // trusting the address you're about to email.
    expect(await screen.findByText(/may be merged from more than one source/i)).toBeInTheDocument();
  });

  it('does not nag about a high-confidence match', async () => {
    renderCard();
    await screen.findByText(/found by dialtone/i);
    expect(screen.queryByText(/merged from more than one source/i)).not.toBeInTheDocument();
  });

  it('surfaces an ICP exclusion', async () => {
    mockProvenance.mockResolvedValue({
      ...AGENT_FOUND,
      fit_score: 0,
      status: 'skipped',
      qualification: { fit_score: 0, excluded: true, reason: "industry 'Staffing' is excluded" },
    });
    renderCard();
    expect(await screen.findByText(/excluded by your icp/i)).toBeInTheDocument();
    expect(screen.getByText(/industry 'Staffing' is excluded/)).toBeInTheDocument();
  });

  it('links to the ICP the score was judged against', async () => {
    renderCard();
    await screen.findByText(/found by dialtone/i);
    expect(screen.getByRole('link', { name: /ideal customer profile/i })).toHaveAttribute(
      'href', '/dialtone/icp'
    );
  });
});
