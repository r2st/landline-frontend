import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockSearch = vi.fn();
const mockResults = vi.fn();
const mockImport = vi.fn();
const mockStats = vi.fn();
const mockSaved = vi.fn();
const mockCreate = vi.fn();
const mockRunSaved = vi.fn();
const mockDelete = vi.fn();
const mockToast = vi.fn();
vi.mock('../api/client', () => ({
  api: { get: vi.fn(), post: vi.fn() },
  queryClient: { invalidateQueries: vi.fn() },
  placesDiscoveryApi: {
    search: (...a) => mockSearch(...a),
    results: (...a) => mockResults(...a),
    importBusiness: (...a) => mockImport(...a),
    stats: (...a) => mockStats(...a),
    savedSearches: (...a) => mockSaved(...a),
    createSearch: (...a) => mockCreate(...a),
    updateSearch: vi.fn(),
    deleteSearch: (...a) => mockDelete(...a),
    runSearch: (...a) => mockRunSaved(...a),
  },
}));
vi.mock('react-hot-toast', () => ({
  default: Object.assign((...a) => mockToast(...a), { success: vi.fn(), error: vi.fn() }),
}));

import PlacesDiscovery from './PlacesDiscovery';

const BIZ = {
  id: 'b1',
  place_id: 'p1',
  business_name: 'Shree Plastics',
  address: 'MIDC, Pune',
  city: 'Pune',
  state: 'MH',
  country: 'IN',
  phone: '+912012345678',
  website: 'https://shreeplastics.in',
  domain: 'shreeplastics.in',
  email: null,
  email_source: null,
  email_confidence: null,
  category: 'Plastic injection molding',
  rating: 4.3,
  review_count: 27,
  status: 'new',
  status_reason: null,
  discovered_via: 'google_places',
  search_query: 'injection molding manufacturers',
  search_id: null,
  company_id: null,
  contact_id: null,
  discovered_at: '2026-07-16T09:00:00Z',
  imported_at: null,
  created_at: '2026-07-16T09:00:00Z',
};

const STATS = {
  total: 120,
  by_status: { new: 100, imported: 12, skipped: 8 },
  with_website: 74,
  with_email: 9,
  imported: 12,
  by_email_source: { hunter: 6, scrape: 3 },
  email_yield: 0.075,
  import_yield: 0.1,
  searches_active: 2,
  credits_spent_today: 14,
};

const renderPage = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter>
        <PlacesDiscovery />
      </MemoryRouter>
    </QueryClientProvider>
  );

describe('PlacesDiscovery page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockResults.mockResolvedValue({ total: 1, limit: 50, offset: 0, results: [BIZ] });
    mockStats.mockResolvedValue(STATS);
    mockSaved.mockResolvedValue([]);
  });

  it('leads with the funnel yield, not a flattering total', async () => {
    renderPage();
    await screen.findByText('Shree Plastics');
    // Places → emailable contact loses volume at every hop. 120 discovered and
    // 9 emails is the honest story; email_yield is the number that matters.
    expect(screen.getByText('8%')).toBeInTheDocument(); // email_yield 0.075
    expect(screen.getByText('10%')).toBeInTheDocument(); // import_yield 0.1
    expect(screen.getByText('120')).toBeInTheDocument();
  });

  it('runs an ad-hoc search with the typed query', async () => {
    const user = userEvent.setup();
    mockSearch.mockResolvedValue({ status: 'ok', found: 20, created: 15, duplicates: 5, credits_spent: 1, results: [] });
    renderPage();
    await screen.findByText('Shree Plastics');

    await user.type(screen.getByLabelText(/what are you looking for/i), 'injection molding');
    await user.type(screen.getByLabelText(/where/i), 'Pune, India');
    await user.click(screen.getByRole('button', { name: /search places/i }));

    expect(mockSearch).toHaveBeenCalledWith(
      expect.objectContaining({ query: 'injection molding', location: 'Pune, India', save: true })
    );
  });

  it('reports a throttle as a throttle, never as "found nothing"', async () => {
    const user = userEvent.setup();
    mockSearch.mockResolvedValue({
      status: 'rate_limited', found: 0, created: 0, duplicates: 0, credits_spent: 0, results: [],
    });
    renderPage();
    await screen.findByText('Shree Plastics');

    await user.type(screen.getByLabelText(/what are you looking for/i), 'cnc machining');
    await user.click(screen.getByRole('button', { name: /search places/i }));

    // `found: 0` here does NOT mean the category is empty — it means we never
    // got to ask. Conflating them costs a pointless retry or a wrong decision.
    expect(mockToast).toHaveBeenCalledWith(expect.stringMatching(/rate-limited/i), expect.anything());
  });

  it('reports an exhausted budget distinctly too', async () => {
    const user = userEvent.setup();
    mockSearch.mockResolvedValue({
      status: 'budget_exhausted', found: 0, created: 0, duplicates: 0, credits_spent: 0, results: [],
    });
    renderPage();
    await screen.findByText('Shree Plastics');

    await user.type(screen.getByLabelText(/what are you looking for/i), 'cnc machining');
    await user.click(screen.getByRole('button', { name: /search places/i }));
    expect(mockToast).toHaveBeenCalledWith(expect.stringMatching(/budget is exhausted/i), expect.anything());
  });

  it('warns that a preview still costs credits', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Shree Plastics');

    await user.click(screen.getByLabelText(/stage the results/i));
    // Unticking doesn't skip the API call — it just discards the answer.
    expect(screen.getByText(/still spends API credits/i)).toBeInTheDocument();
  });

  it('is honest that Places never returns an email', async () => {
    renderPage();
    await screen.findByText('Shree Plastics');
    expect(screen.getByText(/Places never returns one/i)).toBeInTheDocument();
  });

  it('imports without enrichment by default', async () => {
    const user = userEvent.setup();
    mockImport.mockResolvedValue({ status: 'ok', business: BIZ, created_company: true, contacts_created: 0 });
    renderPage();
    await screen.findByText('Shree Plastics');

    await user.click(screen.getByRole('button', { name: /^import$/i }));
    // Enrichment spends a Hunter credit and blocks on a scrape — never implicit.
    expect(mockImport).toHaveBeenCalledWith('b1', { enrich: false });
  });

  it('enriches only when that button is chosen', async () => {
    const user = userEvent.setup();
    mockImport.mockResolvedValue({ status: 'ok', business: BIZ, created_company: true, contacts_created: 1 });
    renderPage();
    await screen.findByText('Shree Plastics');

    await user.click(screen.getByRole('button', { name: /import & find email/i }));
    expect(mockImport).toHaveBeenCalledWith('b1', { enrich: true });
  });

  it('filters staged results by status and email', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('Shree Plastics');

    await user.click(screen.getByRole('button', { name: 'Imported' }));
    expect(mockResults).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'imported' }));

    await user.click(screen.getByLabelText(/has an email/i));
    expect(mockResults).toHaveBeenLastCalledWith(expect.objectContaining({ has_email: true }));
  });

  it('links an imported business to the company it became', async () => {
    mockResults.mockResolvedValue({
      total: 1, limit: 50, offset: 0,
      results: [{ ...BIZ, status: 'imported', company_id: 'co9' }],
    });
    renderPage();
    const link = await screen.findByRole('link', { name: /view company/i });
    expect(link).toHaveAttribute('href', '/companies/co9');
  });

  it('never renders a failed load as nothing staged', async () => {
    mockResults.mockRejectedValue(new Error('500'));
    renderPage();

    expect(await screen.findByText(/couldn't load staged businesses/i)).toBeInTheDocument();
    expect(screen.queryByText(/nothing staged yet/i)).not.toBeInTheDocument();
  });

  it('runs a saved search on demand', async () => {
    const user = userEvent.setup();
    mockSaved.mockResolvedValue([{
      id: 's1', name: 'Pune molders', query: 'injection molding', location_text: 'Pune, India',
      radius_km: null, lat: null, lng: null, business_type: null, country: 'IN',
      schedule: 'weekly', is_active: true, last_run_at: '2026-07-15T09:00:00Z',
      results_count: 40, last_status: 'ok', last_error: null, credits_spent: 3,
      created_at: '2026-07-01T09:00:00Z',
    }]);
    mockRunSaved.mockResolvedValue({ status: 'ok', found: 10, created: 2, duplicates: 8, credits_spent: 1, results: [] });
    renderPage();

    await user.click(screen.getByRole('button', { name: /saved searches/i }));
    expect(await screen.findByText('Pune molders')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /run now/i }));
    expect(mockRunSaved).toHaveBeenCalledWith('s1');
  });
});
