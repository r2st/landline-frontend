import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockIcp = vi.fn();
const mockUpdate = vi.fn();
const mockLearn = vi.fn();
vi.mock('../api/client', () => ({
  api: { get: vi.fn(), post: vi.fn(), put: vi.fn() },
  queryClient: { invalidateQueries: vi.fn(), setQueryData: vi.fn() },
  prospectingApi: {
    icp: (...a) => mockIcp(...a),
    updateIcp: (...a) => mockUpdate(...a),
    learnIcp: (...a) => mockLearn(...a),
    reviewQueue: vi.fn(), approve: vi.fn(), reject: vi.fn(),
    runs: vi.fn(), runCandidates: vi.fn(), run: vi.fn(), provenance: vi.fn(),
  },
}));
vi.mock('react-hot-toast', () => ({
  default: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }),
}));

import Icp from './Icp';

const LEARNED = {
  id: 'icp-1',
  name: 'Learned ICP',
  is_active: true,
  industry_weights: { 'CNC Machining': 0.8, 'Injection Molding': 0.6 },
  size_range: { min: 50, max: 500, ideal: 150 },
  location_preferences: { countries: ['US', 'CA'], states: ['OH', 'MI'] },
  technology_signals: ['legacy ERP', 'spreadsheets'],
  pain_point_indicators: ['slow quoting'],
  exclusion_criteria: { industries: ['Staffing'], countries: [], max_employees: 2000, min_employees: 5 },
  learned_from_deal_count: 14,
  model_used: 'heuristic-v1',
  updated_at: '2026-07-14T09:00:00Z',
  manual_overrides: {},
  edited_at: null,
  edited_by: null,
};

const PINNED = {
  ...LEARNED,
  size_range: { min: 5, max: 40, ideal: 12 },
  manual_overrides: { size_range: { min: 5, max: 40, ideal: 12 } },
  edited_at: '2026-07-15T10:00:00Z',
  edited_by: 'sam@apprend.tech',
};

const renderPage = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter>
        <Icp />
      </MemoryRouter>
    </QueryClientProvider>
  );

// The card for one field, found by its heading.
const cardFor = (name) =>
  within(screen.getByRole('heading', { name: new RegExp(name, 'i') }).closest('div.rounded-xl'));

describe('Icp page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockIcp.mockResolvedValue(LEARNED);
    mockUpdate.mockResolvedValue(PINNED);
    mockLearn.mockResolvedValue(LEARNED);
  });

  it('shows the rubric every fit score is judged against', async () => {
    renderPage();
    expect(await screen.findByText('CNC Machining')).toBeInTheDocument();
    expect(screen.getByText('80%')).toBeInTheDocument();
    expect(screen.getByText('14 won deals')).toBeInTheDocument();
    // Exclusions are the sharpest field — a match here means no email ever.
    expect(screen.getByText('Staffing')).toBeInTheDocument();
  });

  it('marks every field learned or pinned', async () => {
    renderPage();
    await screen.findByText('CNC Machining');
    // Nothing pinned on the learned fixture.
    expect(screen.getAllByText('Learned')).toHaveLength(6);
    expect(screen.queryByText('Pinned')).not.toBeInTheDocument();
  });

  it('says which fields are the operator\'s and who set them', async () => {
    mockIcp.mockResolvedValue(PINNED);
    renderPage();
    await screen.findByText('CNC Machining');

    expect(screen.getByText('Pinned')).toBeInTheDocument();
    expect(screen.getByText(/last by sam@apprend.tech/)).toBeInTheDocument();
    expect(screen.getByText(/1 field/)).toBeInTheDocument();
  });

  it('promises that pinned fields survive the weekly re-learn', async () => {
    renderPage();
    await screen.findByText('CNC Machining');
    // This is the claim the whole backend override mechanism exists to make
    // true. If the copy says it, the merge had better work.
    expect(screen.getByText(/Anything you pin is yours/)).toBeInTheDocument();
  });

  it('pins a field on save, sending only that field', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('CNC Machining');

    await user.click(cardFor('Company size').getByRole('button', { name: /edit/i }));
    const box = screen.getByLabelText(/company size as json/i);
    await user.clear(box);
    await user.click(box);
    await user.paste('{"min": 5, "max": 40, "ideal": 12}');
    await user.click(screen.getByRole('button', { name: /save & pin/i }));

    // Only the edited field is sent — everything else stays learned.
    expect(mockUpdate).toHaveBeenCalledWith({ size_range: { min: 5, max: 40, ideal: 12 } });
  });

  it('refuses to save malformed JSON rather than blanking a scored field', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('CNC Machining');

    await user.click(cardFor('Company size').getByRole('button', { name: /edit/i }));
    const box = screen.getByLabelText(/company size as json/i);
    await user.clear(box);
    await user.click(box);
    await user.paste('{not json');
    await user.click(screen.getByRole('button', { name: /save & pin/i }));

    // A typo must not be able to blank a field the agent scores every lead on.
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('refuses to turn an object field into a list', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('CNC Machining');

    await user.click(cardFor('Company size').getByRole('button', { name: /edit/i }));
    const box = screen.getByLabelText(/company size as json/i);
    await user.clear(box);
    await user.click(box);
    await user.paste('[1, 2]');
    await user.click(screen.getByRole('button', { name: /save & pin/i }));

    // The server would take it; the agent would then score on nonsense.
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(screen.getByText(/must stay a JSON object/i)).toBeInTheDocument();
  });

  it('offers unpin only for a field that is actually pinned', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('CNC Machining');
    await user.click(cardFor('Company size').getByRole('button', { name: /edit/i }));
    expect(screen.queryByRole('button', { name: /unpin/i })).not.toBeInTheDocument();
  });

  it('releases a pinned field back to the learner', async () => {
    const user = userEvent.setup();
    mockIcp.mockResolvedValue(PINNED);
    renderPage();
    await screen.findByText('CNC Machining');

    await user.click(cardFor('Company size').getByRole('button', { name: /edit/i }));
    await user.click(screen.getByRole('button', { name: /unpin & let it learn again/i }));

    expect(mockUpdate).toHaveBeenCalledWith({ unpin: ['size_range'] });
  });

  it('holds a re-learn behind a confirm that says pins are safe', async () => {
    const user = userEvent.setup();
    mockIcp.mockResolvedValue(PINNED);
    renderPage();
    await screen.findByText('CNC Machining');

    await user.click(screen.getByRole('button', { name: /re-learn from won deals/i }));
    expect(mockLearn).not.toHaveBeenCalled();
    // The operator's real question before clicking this is "do I lose my work?".
    expect(screen.getByText(/will be re-applied on top and will not change/i)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /refit now/i }));
    expect(mockLearn).toHaveBeenCalled();
  });

  it('warns that nothing is protected when nothing is pinned', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('CNC Machining');

    await user.click(screen.getByRole('button', { name: /re-learn from won deals/i }));
    expect(screen.getByText(/Nothing is pinned, so every field may change/i)).toBeInTheDocument();
  });

  it('offers to learn a first ICP when none exists', async () => {
    const user = userEvent.setup();
    mockIcp.mockResolvedValue(null);
    renderPage();

    expect(await screen.findByText(/no icp learned yet/i)).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /learn my icp/i }));
    expect(mockLearn).toHaveBeenCalled();
  });

  it('never renders a failed fetch as "no ICP learned"', async () => {
    mockIcp.mockRejectedValue(new Error('gateway timeout'));
    renderPage();

    // That empty state invites a re-learn — the wrong move against a profile
    // that already exists and is working.
    expect(await screen.findByText(/couldn't load the icp/i)).toBeInTheDocument();
    expect(screen.queryByText(/no icp learned yet/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /learn my icp/i })).not.toBeInTheDocument();
  });

  it('is explicit when the profile is defaults rather than learned', async () => {
    mockIcp.mockResolvedValue({ ...LEARNED, learned_from_deal_count: 0 });
    renderPage();
    await screen.findByText('CNC Machining');
    expect(screen.getByText(/defaults — no won deals yet/i)).toBeInTheDocument();
  });
});
