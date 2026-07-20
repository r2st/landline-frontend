import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockGetInbox = vi.fn();
const mockSendReply = vi.fn();
const mockDialtoneInbox = vi.fn();
const mockDetail = vi.fn();
const mockMarkRead = vi.fn();
const mockSmartSend = vi.fn();

vi.mock('../api/client', () => ({
  api: { get: vi.fn(), post: vi.fn() },
  queryClient: { invalidateQueries: vi.fn(), setQueryData: vi.fn() },
  emailHistoryApi: {
    getInbox: (...a) => mockGetInbox(...a),
    sendReply: (...a) => mockSendReply(...a),
    getLeadEmails: vi.fn(),
    getThread: vi.fn(),
    triggerSync: vi.fn(),
  },
  repliesApi: {
    inbox: (...a) => mockDialtoneInbox(...a),
    stats: vi.fn(),
    detail: (...a) => mockDetail(...a),
    reclassify: vi.fn(),
    markRead: (...a) => mockMarkRead(...a),
  },
  smartReplyApi: {
    send: (...a) => mockSmartSend(...a),
  },
}));
vi.mock('react-hot-toast', () => ({
  default: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }),
}));
// SafeHtml pulls in dompurify; a light stub keeps the test focused on the merge.
vi.mock('../components/SafeHtml', () => ({
  default: ({ html }) => <div data-testid="safe-html">{html}</div>,
}));

import UnifiedInbox from './UnifiedInbox';

const THREAD = {
  gmail_thread_id: 't1',
  subject: 'Re: pricing question',
  lead_name: 'Acme Co',
  lead_id: 'co-acme',
  last_activity: '2026-07-18T10:00:00Z',
  has_unread: true,
  provider: 'gmail',
  messages: [
    { id: 'm1', direction: 'sent', to_email: 'buyer@acme.com', body_text: 'Hi there', timestamp: '2026-07-17T09:00:00Z' },
    { id: 'm2', direction: 'received', from_email: 'buyer@acme.com', body_text: 'What does it cost?', snippet: 'What does it cost?', timestamp: '2026-07-18T10:00:00Z' },
  ],
};

const REPLY = {
  id: 'r1',
  subject: 'Re: quick question',
  contact_name: 'Dana Reed',
  from_email: 'dana@precision.com',
  snippet: "Yes, we're interested",
  received_at: '2026-07-19T12:00:00Z',
  is_read: false,
  priority_flag: true,
  reply_classification: 'interested',
};

const renderPage = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter>
        <UnifiedInbox />
      </MemoryRouter>
    </QueryClientProvider>
  );

describe('UnifiedInbox page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetInbox.mockResolvedValue({ threads: [THREAD], total: 1 });
    mockDialtoneInbox.mockResolvedValue({ items: [REPLY], total: 1 });
    mockMarkRead.mockResolvedValue({});
  });

  it('merges both mailboxes into one list, newest first', async () => {
    renderPage();
    const rows = within(await screen.findByRole('list'));
    // The Dialtone reply (Jul 19) is newer than the email thread (Jul 18).
    const names = rows.getAllByText(/Dana Reed|Acme Co/);
    expect(names[0]).toHaveTextContent('Dana Reed');
    expect(rows.getByText('Acme Co')).toBeInTheDocument();
    // Mailbox pills identify each source.
    expect(rows.getByText('Dialtone')).toBeInTheDocument();
    expect(rows.getByText('Gmail')).toBeInTheDocument();
  });

  it('filters by mailbox', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Dana Reed');
    // Click the "Gmail" mailbox filter (not the row pill) — use the filter button.
    await user.click(screen.getByRole('button', { name: 'Gmail' }));
    expect(screen.getByText('Acme Co')).toBeInTheDocument();
    expect(screen.queryByText('Dana Reed')).not.toBeInTheDocument();
  });

  it('filters by unreplied status', async () => {
    const user = userEvent.setup();
    // Make the email thread "replied" (last message sent) so only the reply is unreplied.
    mockGetInbox.mockResolvedValue({
      threads: [{ ...THREAD, messages: [{ id: 'm1', direction: 'sent', body_text: 'hi', timestamp: '2026-07-18T10:00:00Z' }] }],
      total: 1,
    });
    renderPage();
    await screen.findByText('Dana Reed');
    await user.click(screen.getByRole('button', { name: 'Unreplied' }));
    expect(screen.getByText('Dana Reed')).toBeInTheDocument();
    expect(screen.queryByText('Acme Co')).not.toBeInTheDocument();
  });

  it('searches across mailboxes', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Dana Reed');
    await user.type(screen.getByLabelText(/search inbox/i), 'pricing');
    await user.keyboard('{Enter}');
    expect(screen.getByText('Acme Co')).toBeInTheDocument();
    expect(screen.queryByText('Dana Reed')).not.toBeInTheDocument();
  });

  it('replies in-thread to an email conversation', async () => {
    const user = userEvent.setup();
    mockSendReply.mockResolvedValue({ ok: true });
    renderPage();
    await user.click(await screen.findByText('Acme Co'));

    const bodyField = await screen.findByLabelText(/reply body/i);
    await user.type(bodyField, 'It is $500/mo.');
    await user.click(screen.getByRole('button', { name: /^send$/i }));

    expect(mockSendReply).toHaveBeenCalledWith('m2', expect.objectContaining({ body_text: 'It is $500/mo.' }));
  });

  it('approve-and-sends a Dialtone reply from the unified view', async () => {
    const user = userEvent.setup();
    mockDetail.mockResolvedValue({
      ...REPLY,
      body_text: "Yes, we're interested",
      suggested_draft: { draft_reply: { subject: 'Re: quick question', body: 'Great — Thursday 2pm?' } },
    });
    mockSmartSend.mockResolvedValue({ ok: true });
    renderPage();
    await user.click(await screen.findByText('Dana Reed'));

    // The composer is seeded with the suggested draft.
    expect(await screen.findByDisplayValue('Great — Thursday 2pm?')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /approve & send/i }));

    expect(mockSmartSend).toHaveBeenCalledWith({
      replyId: 'r1',
      subject: 'Re: quick question',
      body: 'Great — Thursday 2pm?',
    });
  });

  it('surfaces an error when a mailbox fails to load', async () => {
    mockDialtoneInbox.mockRejectedValue(new Error('boom'));
    renderPage();
    expect(await screen.findByText(/couldn't load one of your mailboxes/i)).toBeInTheDocument();
    expect(screen.getByText(/not an empty inbox/i)).toBeInTheDocument();
  });

  it('shows an empty state when both mailboxes are genuinely empty', async () => {
    mockGetInbox.mockResolvedValue({ threads: [], total: 0 });
    mockDialtoneInbox.mockResolvedValue({ items: [], total: 0 });
    renderPage();
    expect(await screen.findByText(/no conversations here/i)).toBeInTheDocument();
  });
});
