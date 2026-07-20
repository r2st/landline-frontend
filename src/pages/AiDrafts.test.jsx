import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockList = vi.fn();
const mockApprove = vi.fn();
const mockReject = vi.fn();
const mockScanContent = vi.fn();
vi.mock('../api/client', () => ({
  api: { get: vi.fn(), post: vi.fn() },
  queryClient: { invalidateQueries: vi.fn() },
  aiDraftsApi: {
    list: (...a) => mockList(...a),
    approve: (...a) => mockApprove(...a),
    reject: (...a) => mockReject(...a),
  },
  deliverabilityApi: {
    scanContent: (...a) => mockScanContent(...a),
  },
}));
vi.mock('react-hot-toast', () => ({
  default: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }),
}));

import AiDrafts from './AiDrafts';

const DRAFT = {
  id: 'd1',
  enrollment_id: 'e1',
  sequence_id: 's1',
  contact_id: 'c1',
  company_id: 'co1',
  step_number: 1,
  subject: 'Your Cleveland shop + our tooling',
  body: 'Dana — saw you run 5-axis work for aerospace. We shorten setup times by 30%.',
  static_subject: 'Quick question',
  static_body: 'Hi {{first_name}}, wanted to reach out about our tooling.',
  ai_generated: true,
  research_used: true,
  status: 'pending',
  review_notes: null,
  created_at: '2026-07-16T09:00:00Z',
};

const renderPage = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <AiDrafts />
    </QueryClientProvider>
  );

describe('AiDrafts page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockList.mockResolvedValue([DRAFT]);
    mockApprove.mockResolvedValue({ ...DRAFT, status: 'approved' });
    mockReject.mockResolvedValue({ ...DRAFT, status: 'rejected' });
    mockScanContent.mockResolvedValue({
      spam_score: 60,
      risk: 'high',
      issues: ['spam-trigger phrases: free, guarantee', '4 exclamation marks'],
      suggestions: ['Rephrase or remove salesy trigger phrases.'],
    });
  });

  it('asks for the pending queue by default', async () => {
    renderPage();
    await screen.findByText(DRAFT.subject);
    expect(mockList).toHaveBeenCalledWith(expect.objectContaining({ status: 'pending' }));
  });

  it('shows the copy the AI actually wrote', async () => {
    renderPage();
    expect(await screen.findByText(DRAFT.subject)).toBeInTheDocument();
    expect(screen.getByText(/shorten setup times by 30%/)).toBeInTheDocument();
    expect(screen.getByText('Research-backed')).toBeInTheDocument();
  });

  it('holds an approval behind a confirm — approving sends a real cold email', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText(DRAFT.subject);

    await user.click(screen.getByRole('button', { name: /approve & send/i }));
    expect(mockApprove).not.toHaveBeenCalled();
    expect(screen.getByText(/sends the copy above to a real prospect/i)).toBeInTheDocument();
  });

  it('sends nothing when an approval is cancelled', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText(DRAFT.subject);

    await user.click(screen.getByRole('button', { name: /approve & send/i }));
    await user.click(screen.getByRole('button', { name: /cancel/i }));
    expect(mockApprove).not.toHaveBeenCalled();
  });

  it('approves after confirming', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText(DRAFT.subject);

    await user.click(screen.getByRole('button', { name: /approve & send/i }));
    // The confirm's action is labelled distinctly from the card's, so there's
    // no doubt about which button is the one that actually sends.
    await user.click(screen.getByRole('button', { name: /send it/i }));
    expect(mockApprove).toHaveBeenCalledWith('d1', {});
  });

  it('rejects without a confirm — rejecting sends the template, not nothing', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText(DRAFT.subject);

    await user.click(screen.getByRole('button', { name: /^reject$/i }));
    expect(mockReject).toHaveBeenCalledWith('d1', {});
  });

  it('says plainly that rejecting still sends something', async () => {
    renderPage();
    await screen.findByText(DRAFT.subject);
    // Rejecting is not "discard" — the contact is mid-sequence.
    expect(screen.getByText(/rejecting sends the static template/i)).toBeInTheDocument();
  });

  it('shows the template a rejection would send instead', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText(DRAFT.subject);

    expect(screen.queryByText(/wanted to reach out about our tooling/)).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /show the template that goes instead/i }));
    // You can't judge "is the AI version better" without seeing the alternative.
    expect(screen.getByText(/wanted to reach out about our tooling/)).toBeInTheDocument();
  });

  it('flags a draft that fell back to the template', async () => {
    mockList.mockResolvedValue([{ ...DRAFT, ai_generated: false }]);
    renderPage();
    // Approving this isn't the judgement call the page is asking for.
    expect(await screen.findByText(/fell back to template/i)).toBeInTheDocument();
  });

  it('never renders a dead queue as an empty one', async () => {
    mockList.mockRejectedValue(new Error('500'));
    renderPage();

    expect(await screen.findByText(/couldn't load the draft queue/i)).toBeInTheDocument();
    // "Nothing waiting on you" would mean the agent has no unsent copy — the
    // opposite of what a failed fetch tells us.
    expect(screen.queryByText(/nothing waiting on you/i)).not.toBeInTheDocument();
  });

  it('shows an empty state when the queue is genuinely clear', async () => {
    mockList.mockResolvedValue([]);
    renderPage();
    expect(await screen.findByText(/nothing waiting on you/i)).toBeInTheDocument();
  });

  it('hides the decision buttons for already-reviewed drafts', async () => {
    const user = userEvent.setup();
    mockList.mockResolvedValue([{ ...DRAFT, status: 'approved' }]);
    renderPage();
    await screen.findByText(DRAFT.subject);

    await user.click(screen.getByRole('button', { name: 'Approved' }));
    expect(mockList).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'approved' }));
  });

  it('scans the draft copy for spam risk on demand', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText(DRAFT.subject);

    // Nothing is scanned until the operator asks — checking is opt-in.
    expect(mockScanContent).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: /check spam risk/i }));
    expect(mockScanContent).toHaveBeenCalledWith(
      expect.objectContaining({ subject: DRAFT.subject, body: DRAFT.body })
    );
  });

  it('shows the risk band, score, and specific triggers inline', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText(DRAFT.subject);

    await user.click(screen.getByRole('button', { name: /check spam risk/i }));
    expect(await screen.findByText(/high spam risk/i)).toBeInTheDocument();
    expect(screen.getByText(/score 60\/100/i)).toBeInTheDocument();
    // The exact triggers the scanner flagged, not just a band.
    expect(screen.getByText(/spam-trigger phrases: free, guarantee/i)).toBeInTheDocument();
    expect(screen.getByText(/4 exclamation marks/i)).toBeInTheDocument();
    expect(screen.getByText(/rephrase or remove salesy trigger phrases/i)).toBeInTheDocument();
  });

  it('says a clean draft is clean rather than showing an empty result', async () => {
    const user = userEvent.setup();
    mockScanContent.mockResolvedValue({
      spam_score: 0, risk: 'low', issues: [], suggestions: [],
    });
    renderPage();
    await screen.findByText(DRAFT.subject);

    await user.click(screen.getByRole('button', { name: /check spam risk/i }));
    expect(await screen.findByText(/low spam risk/i)).toBeInTheDocument();
    expect(screen.getByText(/no spam triggers found/i)).toBeInTheDocument();
  });

  it('surfaces a failed scan instead of a silent no-op', async () => {
    const user = userEvent.setup();
    mockScanContent.mockRejectedValue(new Error('boom'));
    renderPage();
    await screen.findByText(DRAFT.subject);

    await user.click(screen.getByRole('button', { name: /check spam risk/i }));
    expect(await screen.findByText(/scan failed/i)).toBeInTheDocument();
  });
});
