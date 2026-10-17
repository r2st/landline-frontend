import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));

vi.mock('../../api/client', async () => {
  const { QueryClient } = await import('@tanstack/react-query');
  return {
    queryClient: new QueryClient({ defaultOptions: { queries: { retry: false } } }),
    discoveryDocsApi: {
      aiStatus: vi.fn(),
      list: vi.fn(),
      get: vi.fn(),
      upload: vi.fn(),
      importCandidates: vi.fn(),
      draft: vi.fn(),
      preview: vi.fn(),
      send: vi.fn(),
      remove: vi.fn(),
      outreach: vi.fn(),
      setSequenceStatus: vi.fn(),
    },
  };
});

const { discoveryDocsApi: apiMock, queryClient } = await import('../../api/client');
const { default: DocumentDiscovery } = await import('./DocumentDiscovery');
const { default: DocumentOutreach } = await import('./DocumentOutreach');
const { default: FollowUpStatus } = await import('./FollowUpStatus');

function renderUi(ui) {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>
  );
}

const DOC = {
  id: 'doc-1',
  filename: 'leads.csv',
  status: 'ready',
  candidate_count: 1,
  sequence_id: null,
  candidates: [
    {
      id: 'c1',
      name: 'Acme Stamping',
      imported_company_id: 'co-1',
      contacts: [
        { first_name: 'Jane', last_name: 'Doe', email: 'jane@acme.com', imported_contact_id: 'ct-1' },
        { first_name: 'Raj', last_name: 'Patel', email: 'raj@acme.com', imported_contact_id: 'ct-2' },
      ],
    },
  ],
};

beforeEach(() => {
  queryClient.clear();
  vi.clearAllMocks();
  apiMock.list.mockResolvedValue([]);
});

describe('DocumentDiscovery', () => {
  it('blocks upload and points to Settings when the org has no Gemini key', async () => {
    apiMock.aiStatus.mockResolvedValue({ gemini_key_configured: false });
    renderUi(<DocumentDiscovery />);

    expect(await screen.findByText(/Add your Gemini API key/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Settings → API Keys/ })).toHaveAttribute('href', '/settings#api-keys');
    expect(screen.getByRole('button', { name: /Choose file/i })).toBeDisabled();
  });

  it('enables upload when a key is configured', async () => {
    apiMock.aiStatus.mockResolvedValue({ gemini_key_configured: true });
    renderUi(<DocumentDiscovery />);

    await waitFor(() => expect(apiMock.aiStatus).toHaveBeenCalled());
    expect(screen.queryByText(/Add your Gemini API key/i)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Choose file/i })).toBeEnabled();
  });

  it('opens an already-sent document on its follow-up status', async () => {
    apiMock.aiStatus.mockResolvedValue({ gemini_key_configured: true });
    apiMock.list.mockResolvedValue([
      { id: 'doc-1', filename: 'leads.csv', status: 'ready', candidate_count: 1, sequence_id: 'seq-1', created_at: '2026-10-17T00:00:00Z' },
    ]);
    apiMock.get.mockResolvedValue({ ...DOC, sequence_id: 'seq-1' });
    apiMock.outreach.mockResolvedValue({
      sequence_id: 'seq-1',
      sequence: { name: 'Document: leads.csv', status: 'active', is_active: true, total_steps: 3 },
      contacts: [],
      totals: { enrolled: 0, active: 0, replied: 0, completed: 0, stopped: 0, emails_sent: 0 },
    });
    renderUi(<DocumentDiscovery />);

    fireEvent.click(await screen.findByText('leads.csv'));
    expect(await screen.findByText('Follow-up status')).toBeInTheDocument();
  });
});

describe('DocumentOutreach', () => {
  it('drafts with AI, keeps edits, and sends the approved copy on the 3 / 7 business-day cadence', async () => {
    apiMock.draft.mockResolvedValue({
      steps: [
        { step_number: 1, subject: 'Idea for {{ company_name }}', body: 'Hi {{ first_name }}, first.', delay_days: 0 },
        { step_number: 2, subject: 'Re: idea', body: 'Bumping this.', delay_days: 3 },
        { step_number: 3, subject: 'Re: idea', body: 'Last note.', delay_days: 4 },
      ],
    });
    apiMock.send.mockResolvedValue({ sequence_id: 'seq-1', enrolled: ['ct-1', 'ct-2'], skipped: [], enrolled_count: 2, skipped_count: 0 });
    apiMock.outreach.mockResolvedValue({
      sequence_id: 'seq-1',
      sequence: { name: 'Document: leads.csv', status: 'active', is_active: true, total_steps: 3 },
      contacts: [],
      totals: { enrolled: 2, active: 2, replied: 0, completed: 0, stopped: 0, emails_sent: 0 },
    });
    renderUi(<DocumentOutreach doc={DOC} onBack={() => {}} />);

    fireEvent.change(screen.getByPlaceholderText(/quick-change stamping dies/i), {
      target: { value: 'We build quick-change dies. Book a call.' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Draft with AI/i }));
    await waitFor(() => expect(apiMock.draft).toHaveBeenCalledWith('doc-1', {
      brief: 'We build quick-change dies. Book a call.', tone: 'professional', follow_ups: 2,
    }));

    const subject = await screen.findByLabelText('Subject for email 1');
    fireEvent.change(subject, { target: { value: 'Edited subject' } });
    expect(screen.getByText(/business day 3, if no reply/)).toBeInTheDocument();
    expect(screen.getByText(/business day 7, if no reply/)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Send to 2 contacts/i }));
    fireEvent.click(screen.getByRole('button', { name: /^Send$/ }));

    await waitFor(() => expect(apiMock.send).toHaveBeenCalled());
    const [docId, payload] = apiMock.send.mock.calls[0];
    expect(docId).toBe('doc-1');
    expect(payload.contact_ids).toEqual(['ct-1', 'ct-2']);
    expect(payload.steps.map((s) => s.delay_days)).toEqual([0, 3, 4]);
    expect(payload.steps[0].subject).toBe('Edited subject');
    expect(await screen.findByText('Follow-up status')).toBeInTheDocument();
  });

  it('shows the Gemini key banner when drafting is refused for a missing key', async () => {
    apiMock.draft.mockRejectedValue({
      response: { status: 409, data: { detail: { code: 'gemini_key_required', message: 'Add your key' } } },
    });
    renderUi(<DocumentOutreach doc={DOC} onBack={() => {}} />);

    fireEvent.change(screen.getByPlaceholderText(/quick-change stamping dies/i), {
      target: { value: 'We build quick-change dies. Book a call.' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Draft with AI/i }));
    expect(await screen.findByText(/Add your Gemini API key/i)).toBeInTheDocument();
  });
});

describe('FollowUpStatus', () => {
  const STATUS = {
    sequence_id: 'seq-1',
    sequence: { name: 'Document: leads.csv', status: 'active', is_active: true, total_steps: 3 },
    contacts: [
      { enrollment_id: 'e1', contact_id: 'ct-1', email: 'jane@acme.com', name: 'Jane Doe', state: 'replied',
        enrollment_status: 'replied', emails_sent: 1, total_steps: 3, next_send_at: null, replied_at: '2026-10-18T10:00:00Z' },
      { enrollment_id: 'e2', contact_id: 'ct-2', email: 'raj@acme.com', name: 'Raj Patel', state: 'active',
        enrollment_status: 'active', emails_sent: 1, total_steps: 3, next_send_at: '2026-10-21T10:00:00Z', replied_at: null },
    ],
    totals: { enrolled: 2, active: 1, replied: 1, completed: 0, stopped: 0, emails_sent: 2 },
  };

  it('shows each contact’s place in the cadence', async () => {
    apiMock.outreach.mockResolvedValue(STATUS);
    renderUi(<FollowUpStatus docId="doc-1" />);

    const jane = (await screen.findByText('Jane Doe')).closest('tr');
    expect(within(jane).getByText(/Replied — follow-ups stopped/)).toBeInTheDocument();
    expect(within(jane).getByText('1 of 3')).toBeInTheDocument();
    const raj = screen.getByText('Raj Patel').closest('tr');
    expect(within(raj).getByText('Follow-ups scheduled')).toBeInTheDocument();
    expect(within(raj).getByText('Oct 21, 2026')).toBeInTheDocument();
  });

  it('pauses the sequence', async () => {
    apiMock.outreach.mockResolvedValue(STATUS);
    apiMock.setSequenceStatus.mockResolvedValue({});
    renderUi(<FollowUpStatus docId="doc-1" />);

    fireEvent.click(await screen.findByRole('button', { name: /Pause follow-ups/ }));
    await waitFor(() => expect(apiMock.setSequenceStatus).toHaveBeenCalledWith('seq-1', 'paused'));
  });
});

describe('no AI secrets in the frontend', () => {
  function files(dir) {
    return readdirSync(dir).flatMap((name) => {
      const p = join(dir, name);
      return statSync(p).isDirectory() ? files(p) : /\.(jsx?|tsx?)$/.test(name) && !/\.test\./.test(name) ? [p] : [];
    });
  }

  it('never calls Gemini directly or embeds a Google API key', () => {
    for (const f of files(join(process.cwd(), 'src'))) {
      const src = readFileSync(f, 'utf8');
      expect(src, f).not.toMatch(/generativelanguage\.googleapis\.com/);
      expect(src, f).not.toMatch(/AIza[0-9A-Za-z_-]{20,}/);
    }
  });
});
