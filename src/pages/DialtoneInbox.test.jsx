import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockInbox = vi.fn();
const mockStats = vi.fn();
const mockDetail = vi.fn();
const mockReclassify = vi.fn();
const mockMarkRead = vi.fn();
const mockSend = vi.fn();
vi.mock('../api/client', () => ({
  api: { get: vi.fn(), post: vi.fn() },
  queryClient: { invalidateQueries: vi.fn(), setQueryData: vi.fn() },
  repliesApi: {
    inbox: (...a) => mockInbox(...a),
    stats: (...a) => mockStats(...a),
    detail: (...a) => mockDetail(...a),
    reclassify: (...a) => mockReclassify(...a),
    markRead: (...a) => mockMarkRead(...a),
  },
  smartReplyApi: {
    send: (...a) => mockSend(...a),
  },
}));
vi.mock('react-hot-toast', () => ({
  default: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }),
}));

import DialtoneInbox from './DialtoneInbox';

const HOT = {
  id: 'r1',
  reply_classification: 'interested',
  classification_confidence: 0.92,
  priority_flag: true,
  handled_action: null,
  classified_at: '2026-07-16T10:00:00Z',
  is_read: false,
  from_email: 'dana@clevelandprecision.com',
  subject: 'Re: quick question about your CNC capacity',
  snippet: "Yes — we'd be interested. Can you do a call Thursday?",
  received_at: '2026-07-16T10:00:00Z',
  contact_id: 'c1',
  contact_name: 'Dana Reed',
  company_id: 'co1',
  company_name: 'Cleveland Precision Machining',
  classification_meta: {},
};

const OOO = {
  ...HOT,
  id: 'r2',
  reply_classification: 'out_of_office',
  classification_confidence: 0.99,
  priority_flag: false,
  is_read: true,
  from_email: 'sam@woodcraft.com',
  contact_name: 'Sam Ellis',
  company_name: 'Woodcraft Interiors',
  subject: 'Automatic reply: out of office',
  snippet: 'I am away until the 24th.',
};

const STATS = {
  by_category: { interested: 3, not_interested: 5, out_of_office: 2, unsubscribe: 1, unknown: 0 },
  total: 11,
  unclassified: 0,
  priority: 3,
  unread: 4,
};

const renderPage = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter>
        <DialtoneInbox />
      </MemoryRouter>
    </QueryClientProvider>
  );

describe('DialtoneInbox page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockInbox.mockResolvedValue({ items: [HOT, OOO], total: 2, page: 1, page_size: 50 });
    mockStats.mockResolvedValue(STATS);
    mockMarkRead.mockResolvedValue({});
  });

  it('shows each reply with the intent the classifier assigned', async () => {
    renderPage();
    const rows = within(await screen.findByRole('list'));
    expect(rows.getByText('Dana Reed')).toBeInTheDocument();
    // Scoped to the list: the category names also appear as filter buttons.
    expect(rows.getByText('Interested')).toBeInTheDocument();
    expect(rows.getByText('Out of office')).toBeInTheDocument();
    expect(rows.getByText('92% sure')).toBeInTheDocument();
  });

  it('never renders a failed load as an empty inbox', async () => {
    mockInbox.mockRejectedValue(new Error('boom'));
    renderPage();

    // "Nothing waiting on you" for a failed request is how the last contract
    // break hid for weeks.
    expect(await screen.findByText(/couldn't load replies/i)).toBeInTheDocument();
    expect(screen.getByText(/not an empty inbox/i)).toBeInTheDocument();
    expect(screen.queryByText(/no replies here/i)).not.toBeInTheDocument();
  });

  it('asks the API for one category when filtered', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Dana Reed');
    await user.click(screen.getByRole('button', { name: 'Interested' }));

    expect(mockInbox).toHaveBeenLastCalledWith(expect.objectContaining({ category: 'interested' }));
  });

  it('filters to hot and unread on request', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Dana Reed');

    await user.click(screen.getByLabelText(/hot only/i));
    expect(mockInbox).toHaveBeenLastCalledWith(expect.objectContaining({ priority_only: true }));

    await user.click(screen.getByLabelText(/unread only/i));
    expect(mockInbox).toHaveBeenLastCalledWith(expect.objectContaining({ unread_only: true }));
  });

  it("shows the server's drafted reply for an interested lead", async () => {
    const user = userEvent.setup();
    mockDetail.mockResolvedValue({
      ...HOT,
      body_text: "Yes — we'd be interested. Can you do a call Thursday?",
      suggested_draft: {
        intent: 'interested',
        confidence: 0.9,
        summary: 'Wants a call Thursday.',
        draft_reply: { subject: 'Re: quick question', body: 'Thursday works — 2pm ET?' },
        should_send: true,
        suggested_action: 'schedule_meeting',
      },
    });
    renderPage();
    await user.click(await screen.findByText('Dana Reed'));

    expect(await screen.findByText(/suggested reply/i)).toBeInTheDocument();
    // The draft is editable before send — subject and body land in form fields.
    expect(screen.getByDisplayValue('Thursday works — 2pm ET?')).toBeInTheDocument();
    expect(screen.getByText(/schedule meeting/i)).toBeInTheDocument();
    // Until approved, nothing goes out.
    expect(screen.getByText(/nothing is sent until you approve/i)).toBeInTheDocument();
  });

  it('approves and sends the (possibly edited) draft', async () => {
    const user = userEvent.setup();
    mockDetail.mockResolvedValue({
      ...HOT,
      body_text: "Yes — we'd be interested.",
      suggested_draft: {
        intent: 'interested',
        confidence: 0.9,
        draft_reply: { subject: 'Re: quick question', body: 'Thursday works — 2pm ET?' },
        should_send: true,
      },
    });
    mockSend.mockResolvedValue({ ok: true });
    renderPage();
    await user.click(await screen.findByText('Dana Reed'));

    // Edit the body, then approve.
    const bodyField = await screen.findByLabelText(/reply body/i);
    await user.clear(bodyField);
    await user.type(bodyField, 'Thursday at 3pm ET works.');
    await user.click(screen.getByRole('button', { name: /approve & send/i }));

    expect(mockSend).toHaveBeenCalledWith({
      replyId: 'r1',
      subject: 'Re: quick question',
      body: 'Thursday at 3pm ET works.',
    });
  });

  it('shows a sent confirmation instead of the editor once dispatched', async () => {
    const user = userEvent.setup();
    mockDetail.mockResolvedValue({
      ...HOT,
      body_text: 'Interested!',
      reply_sent_at: '2026-07-16T12:00:00Z',
      suggested_draft: {
        intent: 'interested',
        draft_reply: { subject: 'Re: quick question', body: 'Thursday works.' },
      },
    });
    renderPage();
    await user.click(await screen.findByText('Dana Reed'));

    expect(await screen.findByText(/reply sent/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /approve & send/i })).not.toBeInTheDocument();
  });

  it('says the drafter failed rather than showing a blank card', async () => {
    const user = userEvent.setup();
    mockDetail.mockResolvedValue({
      ...HOT,
      body_text: 'Interested!',
      suggested_draft: { error: 'rate limited', should_send: false },
    });
    renderPage();
    await user.click(await screen.findByText('Dana Reed'));

    expect(await screen.findByText(/no draft available/i)).toBeInTheDocument();
    expect(screen.getByText(/rate limited/i)).toBeInTheDocument();
  });

  it('offers no draft section for a reply that is not interested', async () => {
    const user = userEvent.setup();
    mockDetail.mockResolvedValue({ ...OOO, body_text: 'Away until the 24th.', suggested_draft: null });
    renderPage();
    await user.click(await screen.findByText('Sam Ellis'));

    await screen.findByText('Away until the 24th.');
    // The server only drafts for `interested`; promising one here would be a lie.
    expect(screen.queryByText(/suggested reply/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/no draft available/i)).not.toBeInTheDocument();
  });

  it('marks a reply read when it is opened, and only if it was unread', async () => {
    const user = userEvent.setup();
    mockDetail.mockResolvedValue({ ...HOT, body_text: 'Interested!' });
    renderPage();
    await user.click(await screen.findByText('Dana Reed'));

    await screen.findByText('Interested!');
    expect(mockMarkRead).toHaveBeenCalledWith('r1');
  });

  it('does not re-mark an already-read reply', async () => {
    const user = userEvent.setup();
    mockDetail.mockResolvedValue({ ...OOO, body_text: 'Away.' });
    renderPage();
    await user.click(await screen.findByText('Sam Ellis'));

    await screen.findByText('Away.');
    expect(mockMarkRead).not.toHaveBeenCalled();
  });

  it('sends `category` when an operator overrides the classifier', async () => {
    const user = userEvent.setup();
    mockDetail.mockResolvedValue({ ...HOT, body_text: 'Interested!' });
    mockReclassify.mockResolvedValue({ ...HOT, reply_classification: 'not_interested' });
    renderPage();
    await user.click(await screen.findByText('Dana Reed'));
    await screen.findByText('Interested!');

    // Scoped to the drawer — the same label exists as a list filter.
    const drawer = within(screen.getByRole('dialog', { name: /reply detail/i }));
    await user.click(drawer.getByRole('button', { name: 'Not interested' }));
    // The API field is `category`, not `classification` — getting this wrong is
    // a silent 422.
    expect(mockReclassify).toHaveBeenCalledWith('r1', { category: 'not_interested', priorityFlag: undefined });
  });

  it('shows an empty state only when the inbox is genuinely empty', async () => {
    mockInbox.mockResolvedValue({ items: [], total: 0, page: 1, page_size: 50 });
    renderPage();
    expect(await screen.findByText(/no replies here/i)).toBeInTheDocument();
  });

  it('shows the bounce breakdown with diagnostic codes for a bounce reply', async () => {
    const user = userEvent.setup();
    const BOUNCE = {
      ...OOO,
      id: 'r3',
      reply_classification: 'bounce',
      from_email: 'mailer-daemon@googlemail.com',
      subject: 'Delivery Status Notification (Failure)',
    };
    mockInbox.mockResolvedValue({ items: [BOUNCE], total: 1, page: 1, page_size: 50 });
    mockDetail.mockResolvedValue({
      ...BOUNCE,
      body_text: 'Your message could not be delivered.',
      bounce: {
        category: 'hard',
        status_code: '5.1.1',
        diagnostic: '550 5.1.1 The email account that you tried to reach does not exist.',
        recipient: 'sam@woodcraft.com',
        bounce_count: 1,
        last_bounced_at: '2026-07-16T10:00:00Z',
        suppressed: true,
      },
    });
    renderPage();
    await user.click(await screen.findByText('Sam Ellis'));

    const drawer = within(await screen.findByRole('dialog', { name: /reply detail/i }));
    expect(await drawer.findByText(/delivery failed/i)).toBeInTheDocument();
    // Hard-bounce category is surfaced as a chip.
    expect(drawer.getByText(/hard bounce/i)).toBeInTheDocument();
    // The DSN status + diagnostic codes are shown verbatim.
    expect(drawer.getByText('5.1.1')).toBeInTheDocument();
    expect(drawer.getByText(/does not exist/i)).toBeInTheDocument();
    expect(drawer.getByText('sam@woodcraft.com')).toBeInTheDocument();
  });

  it('does not show a bounce breakdown for a non-bounce reply', async () => {
    const user = userEvent.setup();
    mockDetail.mockResolvedValue({ ...HOT, body_text: 'Interested!', bounce: null });
    renderPage();
    await user.click(await screen.findByText('Dana Reed'));
    await screen.findByText('Interested!');
    expect(screen.queryByText(/delivery failed/i)).not.toBeInTheDocument();
  });
});
