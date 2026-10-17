import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const docs = { list: vi.fn(), get: vi.fn(), uploadMany: vi.fn() };
const camp = { get: vi.fn(), create: vi.fn(), update: vi.fn() };
vi.mock('../api/client', () => ({
  queryClient: { invalidateQueries: vi.fn(), setQueryData: vi.fn(), removeQueries: vi.fn() },
  discoveryDocsApi: {
    list: (...a) => docs.list(...a),
    get: (...a) => docs.get(...a),
    uploadMany: (...a) => docs.uploadMany(...a),
  },
  campaignsApi: {
    get: (...a) => camp.get(...a),
    create: (...a) => camp.create(...a),
    update: (...a) => camp.update(...a),
  },
}));
const toastMock = vi.hoisted(() => Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }));
vi.mock('react-hot-toast', () => ({ default: toastMock }));

import CampaignNew from './CampaignNew';

const DOCS = [
  { id: 'd1', filename: 'deck.pdf', status: 'ready', candidate_count: 3, created_at: '2026-10-10T00:00:00Z' },
  { id: 'd2', filename: 'customers.csv', status: 'ready', candidate_count: 12, created_at: '2026-10-11T00:00:00Z' },
];

const CAMPAIGN = {
  id: 'c1',
  name: 'Outreach — deck',
  status: 'ready',
  documents: [{ id: 'd1', filename: 'deck.pdf' }],
  document_ids: ['d1'],
  icp: {
    industries: ['CNC machining'],
    company_size: '51-200',
    geographies: ['Germany'],
    titles: ['Plant Manager'],
    value_props: ['Quotes in minutes'],
  },
  settings: { daily_limit: 25, send_window_start: '09:00', send_window_end: '17:00' },
};

function renderAt(url) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route path="/campaigns/new" element={<CampaignNew />} />
          <Route path="/campaigns/:id" element={<p>dashboard</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe('CampaignNew wizard', () => {
  beforeEach(() => {
    [...Object.values(docs), ...Object.values(camp)].forEach((f) => f.mockReset());
    toastMock.success.mockReset();
    docs.list.mockResolvedValue(DOCS);
    docs.get.mockResolvedValue({ ...DOCS[0], candidates: [{ id: 'k1', name: 'Acme Tooling', industry: 'CNC' }] });
    camp.get.mockResolvedValue(CAMPAIGN);
    camp.create.mockResolvedValue(CAMPAIGN);
    camp.update.mockImplementation((id, body) => Promise.resolve({ ...CAMPAIGN, ...body }));
  });

  it('preselects documents passed from Discovery and creates the campaign', async () => {
    renderAt('/campaigns/new?docs=d1');
    const deck = await screen.findByRole('checkbox', { name: 'Use deck.pdf' });
    expect(deck).toBeChecked();
    expect(screen.getByRole('checkbox', { name: 'Use customers.csv' })).not.toBeChecked();

    await userEvent.click(screen.getByRole('button', { name: /Analyze documents/ }));
    await waitFor(() =>
      expect(camp.create).toHaveBeenCalledWith({ name: 'Outreach — deck', document_ids: ['d1'] })
    );
    // On to the ICP step for the new campaign.
    expect(await screen.findByText('Your ideal customer')).toBeInTheDocument();
  });

  it('needs at least one document before analysing', async () => {
    renderAt('/campaigns/new');
    await screen.findByRole('checkbox', { name: 'Use deck.pdf' });
    const next = screen.getByRole('button', { name: /Analyze documents/ });
    expect(next).toBeDisabled();
    await userEvent.click(screen.getByRole('checkbox', { name: 'Use customers.csv' }));
    expect(next).toBeEnabled();
  });

  it('shows a document preview on demand', async () => {
    renderAt('/campaigns/new');
    await userEvent.click(await screen.findByRole('button', { name: 'Show preview of deck.pdf' }));
    expect(await screen.findByTestId('doc-preview-d1')).toHaveTextContent('Acme Tooling');
  });

  it('uploads new documents and selects them', async () => {
    docs.uploadMany.mockResolvedValue({
      documents: [{ id: 'd3', filename: 'pricing.pdf', status: 'parsing' }],
      rejected: [],
    });
    renderAt('/campaigns/new');
    await screen.findByRole('checkbox', { name: 'Use deck.pdf' });
    const file = new File(['x'], 'pricing.pdf', { type: 'application/pdf' });
    await userEvent.upload(screen.getByTestId('campaign-upload'), file);
    await waitFor(() => expect(docs.uploadMany).toHaveBeenCalled());
    expect(docs.uploadMany.mock.calls[0][0]).toEqual([file]);
  });

  it('waits while the documents are analysed', async () => {
    camp.get.mockResolvedValue({ ...CAMPAIGN, status: 'analyzing', icp: null });
    renderAt('/campaigns/new?id=c1&step=1');
    expect(await screen.findByTestId('icp-analyzing')).toBeInTheDocument();
  });

  it('edits the ICP and saves it', async () => {
    renderAt('/campaigns/new?id=c1&step=1');
    expect(await screen.findByText('CNC machining')).toBeInTheDocument();
    await userEvent.type(screen.getByLabelText('Decision-maker titles'), 'COO{enter}');
    await userEvent.click(screen.getByRole('button', { name: 'Remove Germany from Geography' }));
    await userEvent.click(screen.getByRole('button', { name: /^Next/ }));
    await waitFor(() => expect(camp.update).toHaveBeenCalled());
    expect(camp.update).toHaveBeenCalledWith('c1', {
      icp: {
        industries: ['CNC machining'],
        company_size: '51-200',
        geographies: [],
        titles: ['Plant Manager', 'COO'],
        value_props: ['Quotes in minutes'],
      },
    });
    expect(await screen.findByText('Sending settings')).toBeInTheDocument();
  });

  it('saves sending settings and rejects an inverted window', async () => {
    renderAt('/campaigns/new?id=c1&step=2');
    const slider = await screen.findByLabelText('Daily send limit');
    fireEvent.change(slider, { target: { value: '60' } });
    expect(screen.getByTestId('daily-limit-value')).toHaveTextContent('60 emails/day');

    await userEvent.click(screen.getByRole('switch', { name: 'Send on weekends' }));
    await userEvent.click(screen.getByRole('switch', { name: 'Review before send' }));

    const end = screen.getByLabelText('Send window end');
    fireEvent.change(end, { target: { value: '08:00' } });
    expect(screen.getByText('The window has to end after it starts.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Next/ })).toBeDisabled();
    fireEvent.change(end, { target: { value: '18:00' } });

    await userEvent.click(screen.getByRole('button', { name: /^Next/ }));
    await waitFor(() =>
      expect(camp.update).toHaveBeenCalledWith('c1', {
        settings: {
          daily_limit: 60,
          send_window_start: '09:00',
          send_window_end: '18:00',
          send_on_weekends: true,
          review_before_send: false,
        },
      })
    );
  });

  it('summarises everything and starts the campaign', async () => {
    camp.update.mockResolvedValue({ ...CAMPAIGN, status: 'active' });
    renderAt('/campaigns/new?id=c1&step=3');
    expect(await screen.findByText('Ready to launch')).toBeInTheDocument();
    const summary = screen.getByText('Ideal customer', { selector: 'dt' }).closest('div');
    expect(within(summary).getByText(/CNC machining/)).toBeInTheDocument();
    expect(screen.getByText(/Up to 25 emails\/day/)).toBeInTheDocument();

    await userEvent.click(screen.getByRole('button', { name: /Start Campaign/ }));
    await waitFor(() => expect(camp.update).toHaveBeenCalledWith('c1', { status: 'active' }));
    expect(toastMock.success).toHaveBeenCalledWith('Campaign started');
    expect(await screen.findByText('dashboard')).toBeInTheDocument();
  });

  it('jumps back to a step from the summary', async () => {
    renderAt('/campaigns/new?id=c1&step=3');
    await userEvent.click(await screen.findByRole('button', { name: 'Edit Sending' }));
    expect(await screen.findByText('Sending settings')).toBeInTheDocument();
  });

  it('sends a launched campaign to its dashboard', async () => {
    camp.get.mockResolvedValue({ ...CAMPAIGN, status: 'active' });
    renderAt('/campaigns/new?id=c1&step=1');
    expect(await screen.findByText('This campaign has already been launched.')).toBeInTheDocument();
  });
});
