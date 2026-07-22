import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockGetInbox = vi.fn();
const mockGmailAccounts = vi.fn();
const mockSmtpAccounts = vi.fn();
const mockMarkRead = vi.fn();
const mockMarkUnread = vi.fn();
const mockArchive = vi.fn();
const mockUnarchive = vi.fn();
const mockBulkArchive = vi.fn();
const mockBulkMarkRead = vi.fn();
const mockIntelligence = vi.fn();
const mockGetTemplates = vi.fn();
const mockGetSignatures = vi.fn();

vi.mock('../api/client', () => ({
  queryClient: { invalidateQueries: vi.fn() },
  emailHistoryApi: {
    getInbox: (...a) => mockGetInbox(...a),
    sendReply: vi.fn(),
    getLeadEmails: vi.fn(),
    getThread: vi.fn(),
    triggerSync: vi.fn(),
    markThreadRead: (...a) => mockMarkRead(...a),
    markThreadUnread: (...a) => mockMarkUnread(...a),
    archiveThread: (...a) => mockArchive(...a),
    unarchiveThread: (...a) => mockUnarchive(...a),
    bulkArchive: (...a) => mockBulkArchive(...a),
    bulkMarkRead: (...a) => mockBulkMarkRead(...a),
    getThreadIntelligence: (...a) => mockIntelligence(...a),
  },
  emailApi: {
    getTemplates: (...a) => mockGetTemplates(...a),
    getSignatures: (...a) => mockGetSignatures(...a),
  },
  gmailApi: { accounts: (...a) => mockGmailAccounts(...a) },
  smtpApi: { accounts: (...a) => mockSmtpAccounts(...a) },
}));
vi.mock('react-hot-toast', () => ({
  default: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn(), dismiss: vi.fn() }),
}));
vi.mock('../components/SafeHtml', () => ({
  default: ({ html }) => <div data-testid="safe-html">{html}</div>,
}));

import Inbox from './Inbox';

const EMPTY_INBOX = { threads: [], total: 0, page: 1, per_page: 20 };

function makeThread(overrides = {}) {
  return {
    gmail_thread_id: 'thread-1',
    subject: 'Pilot proposal',
    has_unread: true,
    priority: false,
    classification: null,
    is_archived: false,
    last_activity: new Date().toISOString(),
    lead_name: 'Acme Co',
    lead_id: null,
    messages: [
      {
        id: 'm1',
        direction: 'received',
        from_email: 'lead@acme.com',
        to_email: 'us@company.com',
        contact_name: 'Dana Lead',
        subject: 'Pilot proposal',
        body_html: '<p>Interested</p>',
        body_text: 'Interested',
        snippet: 'Interested in a pilot',
        status: 'received',
        is_read: false,
        reply_classification: null,
        priority_flag: false,
        timestamp: new Date().toISOString(),
      },
    ],
    ...overrides,
  };
}

function renderInbox() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <Inbox />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetInbox.mockResolvedValue(EMPTY_INBOX);
  mockGmailAccounts.mockResolvedValue([
    { id: 'g1', email: 'sales@company.com', status: 'connected' },
    { id: 'g2', email: 'support@company.com', status: 'connected' },
  ]);
  mockSmtpAccounts.mockResolvedValue([
    { id: 's1', email: 'relay@company.com', status: 'connected' },
  ]);
  mockMarkRead.mockResolvedValue({ updated: 1, is_read: true });
  mockMarkUnread.mockResolvedValue({ updated: 1, is_read: false });
  mockArchive.mockResolvedValue({ updated: 1, is_archived: true });
  mockUnarchive.mockResolvedValue({ updated: 1, is_archived: false });
  mockBulkArchive.mockResolvedValue({ updated: 1, is_archived: true });
  mockBulkMarkRead.mockResolvedValue({ updated: 1, is_read: true });
  mockIntelligence.mockResolvedValue({
    status: 'ok',
    momentum_label: 'Warming',
    momentum_score: 62,
    unresolved_objections: ['Pricing unclear'],
    recommended_action: 'Send a pricing one-pager',
    next_message: { subject: 'Re: Pilot', body: 'Here is our pricing breakdown.' },
  });
  mockGetTemplates.mockResolvedValue([
    { id: 't1', name: 'Intro', subject: 'Hello', body: '<p>Hi {{name}}, quick intro</p>' },
  ]);
  mockGetSignatures.mockResolvedValue([
    { id: 'sig1', name: 'Default', content_html: '<p>Best,<br/>Sam</p>', is_default: true },
  ]);
});

describe('Inbox account filter', () => {
  it('lists All accounts plus every connected Gmail and SMTP address', async () => {
    renderInbox();
    const select = await screen.findByLabelText('Filter inbox by email account');

    expect(within(select).getByRole('option', { name: 'All accounts' })).toBeInTheDocument();
    expect(within(select).getByRole('option', { name: 'sales@company.com' })).toBeInTheDocument();
    expect(within(select).getByRole('option', { name: 'support@company.com' })).toBeInTheDocument();
    expect(within(select).getByRole('option', { name: 'relay@company.com (SMTP)' })).toBeInTheDocument();
  });

  it('defaults to All accounts and does not scope the initial fetch', async () => {
    renderInbox();
    await screen.findByLabelText('Filter inbox by email account');

    await waitFor(() => expect(mockGetInbox).toHaveBeenCalled());
    expect(mockGetInbox.mock.calls[0][0]).not.toHaveProperty('account_email');
  });

  it('scopes the inbox to the chosen account via account_email', async () => {
    renderInbox();
    const select = await screen.findByLabelText('Filter inbox by email account');

    await userEvent.selectOptions(select, 'relay@company.com');

    await waitFor(() =>
      expect(mockGetInbox).toHaveBeenCalledWith(
        expect.objectContaining({ account_email: 'relay@company.com', filter: 'all' })
      )
    );
  });

  it('keeps the account scope when switching tabs (Sent)', async () => {
    renderInbox();
    const select = await screen.findByLabelText('Filter inbox by email account');
    await userEvent.selectOptions(select, 'sales@company.com');

    await userEvent.click(screen.getByRole('button', { name: /Sent/i }));

    await waitFor(() =>
      expect(mockGetInbox).toHaveBeenCalledWith(
        expect.objectContaining({ account_email: 'sales@company.com', filter: 'sent' })
      )
    );
  });

  it('hides the selector entirely when no accounts are connected', async () => {
    mockGmailAccounts.mockResolvedValue([]);
    mockSmtpAccounts.mockResolvedValue([]);
    renderInbox();

    await waitFor(() => expect(mockGetInbox).toHaveBeenCalled());
    expect(screen.queryByLabelText('Filter inbox by email account')).not.toBeInTheDocument();
  });
});

describe('Inbox tabs & filters', () => {
  it('has Priority and Archived tabs that drive the filter param', async () => {
    renderInbox();
    await waitFor(() => expect(mockGetInbox).toHaveBeenCalled());

    await userEvent.click(screen.getByRole('button', { name: /Priority/i }));
    await waitFor(() =>
      expect(mockGetInbox).toHaveBeenCalledWith(expect.objectContaining({ filter: 'priority' }))
    );

    await userEvent.click(screen.getByRole('button', { name: /Archived/i }));
    await waitFor(() =>
      expect(mockGetInbox).toHaveBeenCalledWith(expect.objectContaining({ filter: 'archived' }))
    );
  });

  it('passes date_from / date_to when a range is set', async () => {
    renderInbox();
    await waitFor(() => expect(mockGetInbox).toHaveBeenCalled());

    await userEvent.type(screen.getByLabelText('From date'), '2026-07-01');
    await waitFor(() =>
      expect(mockGetInbox).toHaveBeenCalledWith(
        expect.objectContaining({ date_from: '2026-07-01T00:00:00' })
      )
    );
  });
});

describe('Inbox two-pane layout', () => {
  it('shows the "select a conversation" placeholder until a thread is opened', async () => {
    mockGetInbox.mockResolvedValue({ ...EMPTY_INBOX, threads: [makeThread()], total: 1 });
    renderInbox();

    expect(await screen.findByText('Select a conversation')).toBeInTheDocument();
  });

  it('marks the thread read and opens it in the detail pane on select', async () => {
    mockGetInbox.mockResolvedValue({ ...EMPTY_INBOX, threads: [makeThread()], total: 1 });
    renderInbox();

    const row = await screen.findByRole('button', { name: /Pilot proposal/i });
    await userEvent.click(row);

    await waitFor(() => expect(mockMarkRead).toHaveBeenCalledWith('thread-1'));
    // Detail pane now shows a reply composer.
    expect(await screen.findByLabelText('Reply body')).toBeInTheDocument();
  });

  it('renders a skeleton while the inbox is loading', async () => {
    let resolve;
    mockGetInbox.mockReturnValue(new Promise((r) => { resolve = r; }));
    renderInbox();

    expect(await screen.findByTestId('inbox-skeleton')).toBeInTheDocument();
    resolve(EMPTY_INBOX);
  });
});

describe('Inbox thread actions', () => {
  it('archives a thread from its row', async () => {
    mockGetInbox.mockResolvedValue({ ...EMPTY_INBOX, threads: [makeThread()], total: 1 });
    renderInbox();

    const archiveBtn = await screen.findByTitle('Archive');
    await userEvent.click(archiveBtn);

    await waitFor(() => expect(mockArchive).toHaveBeenCalledWith('thread-1'));
  });

  it('renders a classification chip on the thread row', async () => {
    mockGetInbox.mockResolvedValue({
      ...EMPTY_INBOX,
      threads: [makeThread({ classification: 'interested' })],
      total: 1,
    });
    renderInbox();

    expect(await screen.findByTitle('Reply classified: Interested')).toBeInTheDocument();
  });

  it('shows a "Needs attention" status pill for an unanswered inbound', async () => {
    mockGetInbox.mockResolvedValue({ ...EMPTY_INBOX, threads: [makeThread()], total: 1 });
    renderInbox();

    expect(await screen.findByText('Needs attention')).toBeInTheDocument();
  });
});

describe('Inbox bulk actions', () => {
  it('bulk-archives the selected threads', async () => {
    mockGetInbox.mockResolvedValue({
      ...EMPTY_INBOX,
      threads: [
        makeThread({ gmail_thread_id: 'thread-1' }),
        makeThread({ gmail_thread_id: 'thread-2', subject: 'Second' }),
      ],
      total: 2,
    });
    renderInbox();

    const checkbox = await screen.findByLabelText('Select thread Pilot proposal');
    await userEvent.click(checkbox);

    const bar = (await screen.findByText('1 selected')).closest('div');
    await userEvent.click(within(bar).getByRole('button', { name: /Archive/i }));

    await waitFor(() => expect(mockBulkArchive).toHaveBeenCalledWith(['thread-1'], true));
  });
});

describe('Inbox composer', () => {
  it('inserts a saved template into the reply body', async () => {
    mockGetInbox.mockResolvedValue({ ...EMPTY_INBOX, threads: [makeThread()], total: 1 });
    renderInbox();

    await userEvent.click(await screen.findByRole('button', { name: /Pilot proposal/i }));

    const templateSelect = await screen.findByLabelText('Insert template');
    await userEvent.selectOptions(templateSelect, 't1');

    const editor = screen.getByLabelText('Reply body');
    await waitFor(() => expect(editor.textContent).toContain('quick intro'));
  });

  it('fills the composer with an AI draft', async () => {
    mockGetInbox.mockResolvedValue({ ...EMPTY_INBOX, threads: [makeThread()], total: 1 });
    renderInbox();

    await userEvent.click(await screen.findByRole('button', { name: /Pilot proposal/i }));
    await userEvent.click(screen.getByRole('button', { name: /AI draft/i }));

    const editor = screen.getByLabelText('Reply body');
    await waitFor(() => expect(editor.textContent).toContain('pricing breakdown'));
  });
});

describe('Inbox draft autosave', () => {
  it('restores an unsent draft after switching threads and back', async () => {
    mockGetInbox.mockResolvedValue({
      ...EMPTY_INBOX,
      threads: [
        makeThread({ gmail_thread_id: 'thread-1', subject: 'Pilot proposal' }),
        makeThread({ gmail_thread_id: 'thread-2', subject: 'Second thread' }),
      ],
      total: 2,
    });
    renderInbox();

    // Open thread 1 and drop a draft into it via the AI-draft path.
    await userEvent.click(await screen.findByRole('button', { name: /Pilot proposal/i }));
    await userEvent.click(screen.getByRole('button', { name: /AI draft/i }));
    await waitFor(() =>
      expect(screen.getByLabelText('Reply body').textContent).toContain('pricing breakdown')
    );

    // Switch to thread 2 — its composer is a clean slate.
    await userEvent.click(screen.getByRole('button', { name: /Second thread/i }));
    await waitFor(() =>
      expect(screen.getByLabelText('Reply body').textContent).not.toContain('pricing breakdown')
    );

    // Back to thread 1 — the draft is still there.
    await userEvent.click(screen.getByRole('button', { name: /Pilot proposal/i }));
    await waitFor(() =>
      expect(screen.getByLabelText('Reply body').textContent).toContain('pricing breakdown')
    );
  });
});
