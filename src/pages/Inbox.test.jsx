import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockGetInbox = vi.fn();
const mockGmailAccounts = vi.fn();
const mockSmtpAccounts = vi.fn();

vi.mock('../api/client', () => ({
  queryClient: { invalidateQueries: vi.fn() },
  emailHistoryApi: {
    getInbox: (...a) => mockGetInbox(...a),
    sendReply: vi.fn(),
    getLeadEmails: vi.fn(),
    getThread: vi.fn(),
    triggerSync: vi.fn(),
  },
  gmailApi: { accounts: (...a) => mockGmailAccounts(...a) },
  smtpApi: { accounts: (...a) => mockSmtpAccounts(...a) },
}));
vi.mock('react-hot-toast', () => ({
  default: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }),
}));
vi.mock('../components/SafeHtml', () => ({
  default: ({ html }) => <div data-testid="safe-html">{html}</div>,
}));

import Inbox from './Inbox';

const EMPTY_INBOX = { threads: [], total: 0, page: 1, per_page: 20 };

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
});

describe('Inbox account filter', () => {
  it('lists All accounts plus every connected Gmail and SMTP address', async () => {
    renderInbox();
    const select = await screen.findByLabelText('Filter inbox by email account');

    expect(within(select).getByRole('option', { name: 'All accounts' })).toBeInTheDocument();
    expect(within(select).getByRole('option', { name: 'sales@company.com' })).toBeInTheDocument();
    expect(within(select).getByRole('option', { name: 'support@company.com' })).toBeInTheDocument();
    // SMTP accounts are tagged so same-domain identities stay distinct.
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
