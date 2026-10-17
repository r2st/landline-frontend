import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));

const mockAuth = vi.fn(() => null);
vi.mock('../../context/AuthContext', () => ({ useOptionalAuth: () => mockAuth() }));

vi.mock('../../api/client', async () => {
  const { QueryClient } = await import('@tanstack/react-query');
  return {
    queryClient: new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } }),
    discoveryApi: { searchCompanies: vi.fn(), searchCompaniesGemini: vi.fn(), enrichCompany: vi.fn() },
    discoveryDocsApi: {
      aiStatus: vi.fn(),
      list: vi.fn(),
      get: vi.fn(),
      upload: vi.fn(),
      uploadMany: vi.fn(),
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

const { discoveryApi, discoveryDocsApi: docsApi, queryClient } = await import('../../api/client');
const { default: CompanySearch, toGeminiPayload, toSearchPayload } = await import('./CompanySearch');
const { default: DocumentDiscovery } = await import('./DocumentDiscovery');
const { default: DocumentReview } = await import('./DocumentReview');
const { default: DocumentOutreach } = await import('./DocumentOutreach');
const { default: GeminiKeyBanner } = await import('./GeminiKeyBanner');

function renderUi(ui, { route = '/discovery' } = {}) {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
    </QueryClientProvider>
  );
}

const SEARCH_RESULT = {
  total: 2,
  imported: 1,
  already_existed: 1,
  search_status: 'ok',
  companies: [
    { id: 'co-1', name: 'Acme Molding', domain: 'acme.com', status: 'imported', industry: 'Plastics', employee_count: 1250, city: 'Akron', state: 'OH' },
    { id: 'co-2', name: 'Beta CNC', domain: 'beta.com', status: 'exists', industry: 'Machining', employee_count: null },
  ],
};

beforeEach(() => {
  queryClient.clear();
  vi.clearAllMocks();
  mockAuth.mockReturnValue(null);
  window.sessionStorage.clear();
  window.localStorage.clear();
  docsApi.list.mockResolvedValue([]);
  docsApi.aiStatus.mockResolvedValue({ gemini_key_configured: true });
});

describe('Apollo search', () => {
  // Gemini is the default source; these exercise the Apollo path.
  beforeEach(() => {
    window.sessionStorage.setItem('prospect.discovery.search', JSON.stringify({ source: 'apollo' }));
  });

  it('sends the field names the API reads', () => {
    expect(
      toSearchPayload({
        industry_keyword: ' injection molding ',
        location: 'Ohio',
        min_employees: '10',
        max_employees: '',
        keywords: 'automotive, , aerospace',
        num_results: 25,
      })
    ).toEqual({
      industry: 'injection molding',
      location: 'Ohio',
      keywords: ['automotive', 'aerospace'],
      min_employees: 10,
      max_employees: null,
      per_page: 25,
    });
  });

  it('searches, shows company details and what landed in the pipeline', async () => {
    discoveryApi.searchCompanies.mockResolvedValue(SEARCH_RESULT);
    renderUi(<CompanySearch />);

    fireEvent.change(screen.getByLabelText('Industry'), { target: { value: 'Molding' } });
    fireEvent.click(screen.getByRole('button', { name: /Search Apollo/ }));

    expect(await screen.findByText('2 companies found')).toBeInTheDocument();
    expect(discoveryApi.searchCompanies).toHaveBeenCalledWith(
      expect.objectContaining({ industry: 'Molding', per_page: 10 })
    );
    expect(screen.getByText('1 added to your pipeline')).toBeInTheDocument();
    const [first, second] = screen.getAllByTestId('result-row');
    expect(within(first).getByText('1,250')).toBeInTheDocument();
    expect(within(first).getByText('Added')).toBeInTheDocument();
    expect(within(second).getByText('Already in Prospect')).toBeInTheDocument();
  });

  it('asks for at least one criterion instead of silently doing nothing', () => {
    renderUi(<CompanySearch />);
    fireEvent.click(screen.getByRole('button', { name: /Search Apollo/ }));
    expect(screen.getByRole('alert')).toHaveTextContent(/Enter an industry, a location or a keyword/);
    expect(discoveryApi.searchCompanies).not.toHaveBeenCalled();
  });

  it('explains a rate-limited search rather than showing "no results"', async () => {
    discoveryApi.searchCompanies.mockResolvedValue({ ...SEARCH_RESULT, total: 0, companies: [], search_status: 'rate_limited' });
    renderUi(<CompanySearch />);
    fireEvent.change(screen.getByLabelText('Location'), { target: { value: 'Ohio' } });
    fireEvent.click(screen.getByRole('button', { name: /Search Apollo/ }));

    expect(await screen.findByText(/rate-limiting searches/)).toBeInTheDocument();
    expect(screen.queryByText('No companies matched')).not.toBeInTheDocument();
  });

  it('links a platform admin to credentials when Apollo has no key', async () => {
    mockAuth.mockReturnValue({ user: { role: 'platform_admin' } });
    discoveryApi.searchCompanies.mockResolvedValue({ total: 0, companies: [], search_status: 'skipped' });
    renderUi(<CompanySearch />);
    fireEvent.change(screen.getByLabelText('Location'), { target: { value: 'Ohio' } });
    fireEvent.click(screen.getByRole('button', { name: /Search Apollo/ }));

    expect(await screen.findByRole('link', { name: /Platform credentials/ })).toHaveAttribute('href', '/platform/credentials');
  });

  it('names an Apollo key/plan refusal instead of suggesting a retry', async () => {
    mockAuth.mockReturnValue({ user: { role: 'platform_admin' } });
    discoveryApi.searchCompanies.mockResolvedValue({
      total: 0, companies: [], search_status: 'unauthorized',
      search_error: 'Apollo refused the request: … not included in your Free plan',
    });
    renderUi(<CompanySearch />);
    fireEvent.change(screen.getByLabelText('Location'), { target: { value: 'Ohio' } });
    fireEvent.click(screen.getByRole('button', { name: /Search Apollo/ }));

    expect(await screen.findByText('Apollo refused the search')).toBeInTheDocument();
    expect(screen.getByTestId('search-status-detail')).toHaveTextContent(/Free plan/);
    expect(screen.getByRole('link', { name: /Platform credentials/ })).toHaveAttribute('href', '/platform/credentials');
    expect(screen.queryByText(/loosen your filters/)).not.toBeInTheDocument();
  });

  it('says "not connected" when Apollo has no key, for a non-admin too', async () => {
    mockAuth.mockReturnValue({ user: { role: 'org_admin' } });
    discoveryApi.searchCompanies.mockResolvedValue({
      total: 0, companies: [], search_status: 'skipped',
      search_error: 'Apollo is not configured: no Apollo API key is set for this deployment.',
    });
    renderUi(<CompanySearch />);
    fireEvent.change(screen.getByLabelText('Location'), { target: { value: 'Ohio' } });
    fireEvent.click(screen.getByRole('button', { name: /Search Apollo/ }));

    expect(await screen.findByText(/Apollo isn.t connected yet/)).toBeInTheDocument();
    expect(screen.getByText(/Ask a platform admin to add the Apollo API key/)).toBeInTheDocument();
  });

  it('a 401 from our own session does not read as Apollo rejecting its key', async () => {
    discoveryApi.searchCompanies.mockRejectedValueOnce({
      response: { status: 401, data: { detail: 'Invalid or missing API key / Bearer token' } },
    });
    renderUi(<CompanySearch />);
    fireEvent.change(screen.getByLabelText('Location'), { target: { value: 'Ohio' } });
    fireEvent.click(screen.getByRole('button', { name: /Search Apollo/ }));

    expect(await screen.findByText(/nothing was sent to Apollo/)).toBeInTheDocument();
    expect(screen.queryByText(/Invalid or missing API key/)).not.toBeInTheDocument();
  });

  it('shows a failed request inline and retries it', async () => {
    discoveryApi.searchCompanies
      .mockRejectedValueOnce({ response: { data: { detail: 'Apollo timed out' } } })
      .mockResolvedValueOnce(SEARCH_RESULT);
    renderUi(<CompanySearch />);
    fireEvent.change(screen.getByLabelText('Location'), { target: { value: 'Ohio' } });
    fireEvent.click(screen.getByRole('button', { name: /Search Apollo/ }));

    expect(await screen.findByText('Apollo timed out')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Try again/ }));
    expect(await screen.findByText('2 companies found')).toBeInTheDocument();
    expect(discoveryApi.searchCompanies).toHaveBeenCalledTimes(2);
  });

  it('finds contacts for one company and shows how many', async () => {
    discoveryApi.searchCompanies.mockResolvedValue(SEARCH_RESULT);
    discoveryApi.enrichCompany.mockResolvedValue({ contacts_count: 3 });
    renderUi(<CompanySearch />);
    fireEvent.change(screen.getByLabelText('Location'), { target: { value: 'Ohio' } });
    fireEvent.click(screen.getByRole('button', { name: /Search Apollo/ }));

    fireEvent.click(await screen.findByRole('button', { name: 'Find contacts at Acme Molding' }));
    expect(await screen.findByRole('link', { name: /3 contacts found/ })).toHaveAttribute('href', '/companies/co-1');
    expect(discoveryApi.enrichCompany).toHaveBeenCalledWith('co-1', { find_contacts: true });
  });

  it('keeps the last results after leaving and coming back', async () => {
    discoveryApi.searchCompanies.mockResolvedValue(SEARCH_RESULT);
    const first = renderUi(<CompanySearch />);
    fireEvent.change(screen.getByLabelText('Location'), { target: { value: 'Ohio' } });
    fireEvent.click(screen.getByRole('button', { name: /Search Apollo/ }));
    await screen.findByText('2 companies found');
    first.unmount();

    renderUi(<CompanySearch />);
    expect(screen.getByText('2 companies found')).toBeInTheDocument();
    expect(screen.getByLabelText('Location')).toHaveValue('Ohio');
  });
});

describe('Gemini search', () => {
  const describeAs = (text) =>
    fireEvent.change(screen.getByLabelText(/Describe the companies/), { target: { value: text } });
  const submit = () => fireEvent.click(screen.getByRole('button', { name: /Search with Gemini/ }));

  it('folds the optional filters into the plain-language description', () => {
    const payload = toGeminiPayload({
      query: ' SaaS companies focused on healthcare ',
      industry_keyword: 'Software',
      location: 'Bangalore',
      min_employees: '50',
      max_employees: '200',
      keywords: 'EHR, telehealth',
      num_results: 15,
    });
    expect(payload).toMatchObject({ industry: 'Software', location: 'Bangalore', min_employees: 50, max_employees: 200, per_page: 15 });
    // The endpoint prompts from structured fields, so the sentence leads the keywords.
    expect(payload.keywords).toEqual(['SaaS companies focused on healthcare', 'EHR', 'telehealth']);
    expect(payload.query).toBe(
      'SaaS companies focused on healthcare\nFilters — industry: Software; located in Bangalore; 50-200 employees; keywords: EHR, telehealth.'
    );
  });

  it('builds a description from filters alone when none was typed', () => {
    const payload = toGeminiPayload({ query: '', industry_keyword: '', location: 'Ohio', min_employees: '', max_employees: '', keywords: '', num_results: 10 });
    expect(payload.query).toBe('Companies — located in Ohio.');
    expect(payload.keywords).toEqual([]);
  });

  it('shows what Gemini adds: a description, the people it found and its web sources', async () => {
    discoveryApi.searchCompaniesGemini.mockResolvedValue({
      ...SEARCH_RESULT,
      source: 'gemini',
      sources: [{ title: 'medtech-saas.in', url: 'https://example.org/grounding/1' }],
      companies: [{
        ...SEARCH_RESULT.companies[0],
        city: null,
        state: null,
        location: 'Bangalore, India',
        description: 'Cloud EHR for clinics.',
        contacts: [{ name: 'Asha Rao', title: 'CEO', email: null, linkedin: null }],
      }],
    });
    renderUi(<CompanySearch />);
    describeAs('Healthcare SaaS in Bangalore');
    submit();

    const row = (await screen.findAllByTestId('result-row'))[0];
    expect(within(row).getByText('Cloud EHR for clinics.')).toBeInTheDocument();
    expect(within(row).getByTestId('contacts-found')).toHaveTextContent('1 contact found');
    expect(within(row).getByText('Bangalore, India')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /medtech-saas.in/ })).toHaveAttribute('href', 'https://example.org/grounding/1');
  });

  it('shows the key banner when the search comes back "skipped: no Gemini key"', async () => {
    mockAuth.mockReturnValue({ user: { role: 'org_admin' } });
    discoveryApi.searchCompaniesGemini.mockResolvedValue({
      source: 'gemini', total: 0, companies: [], sources: [],
      search_status: 'skipped', search_error_code: 'gemini_key_required',
      search_error: 'Add your Gemini API key in Settings → API Keys to search with Gemini.',
    });
    renderUi(<CompanySearch />);
    describeAs('Dental clinics in Pune');
    submit();

    expect(await screen.findByText('Add your Gemini API key to use Gemini search')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Add Gemini key/ })).toHaveAttribute('href', '/settings#api-keys');
    expect(screen.queryByText('No companies matched')).not.toBeInTheDocument();
  });

  it('is the default, and shows results in the same table as Apollo', async () => {
    discoveryApi.searchCompaniesGemini.mockResolvedValue(SEARCH_RESULT);
    renderUi(<CompanySearch />);

    expect(screen.getByRole('radio', { name: /Gemini web search/ })).toHaveAttribute('aria-checked', 'true');
    describeAs('SaaS companies in Bangalore with 50-200 employees focused on healthcare');
    submit();

    expect(await screen.findByText('2 companies found')).toBeInTheDocument();
    expect(discoveryApi.searchCompaniesGemini).toHaveBeenCalledWith(
      expect.objectContaining({ query: 'SaaS companies in Bangalore with 50-200 employees focused on healthcare', per_page: 10 })
    );
    expect(discoveryApi.searchCompanies).not.toHaveBeenCalled();
    const [first] = screen.getAllByTestId('result-row');
    expect(within(first).getByText('Acme Molding')).toBeInTheDocument();
    expect(within(first).getByText('acme.com')).toBeInTheDocument();
    expect(within(first).getByRole('button', { name: 'Find contacts at Acme Molding' })).toBeInTheDocument();
  });

  it('shows a loading state while Gemini searches', async () => {
    let resolve;
    discoveryApi.searchCompaniesGemini.mockReturnValue(new Promise((r) => { resolve = r; }));
    renderUi(<CompanySearch />);
    describeAs('Dental clinics in Pune');
    submit();

    expect(await screen.findByTestId('results-skeleton')).toHaveTextContent(/Gemini is searching the web/);
    expect(screen.getByRole('button', { name: /Searching/ })).toBeDisabled();
    resolve(SEARCH_RESULT);
    expect(await screen.findByText('2 companies found')).toBeInTheDocument();
  });

  it('asks for a description or a filter before searching', () => {
    renderUi(<CompanySearch />);
    submit();
    expect(screen.getByRole('alert')).toHaveTextContent(/Describe the companies you.re looking for/);
    expect(discoveryApi.searchCompaniesGemini).not.toHaveBeenCalled();
  });

  it('switches to Apollo and back', async () => {
    discoveryApi.searchCompanies.mockResolvedValue(SEARCH_RESULT);
    renderUi(<CompanySearch />);
    fireEvent.click(screen.getByRole('radio', { name: /Apollo database/ }));

    expect(screen.queryByLabelText(/Describe the companies/)).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Location'), { target: { value: 'Ohio' } });
    fireEvent.click(screen.getByRole('button', { name: /Search Apollo/ }));
    expect(await screen.findByText('2 companies found')).toBeInTheDocument();
    expect(discoveryApi.searchCompaniesGemini).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('radio', { name: /Gemini web search/ }));
    expect(screen.getByLabelText(/Describe the companies/)).toBeInTheDocument();
  });

  it('does not block search for an org with only a Groq key', async () => {
    docsApi.aiStatus.mockResolvedValue({
      gemini_key_configured: false, ai_key_configured: true, providers: ['groq'],
    });
    renderUi(<CompanySearch />);
    await waitFor(() => expect(docsApi.aiStatus).toHaveBeenCalled());
    expect(screen.queryByText(/Add your Gemini API key/)).not.toBeInTheDocument();
    describeAs('Dental clinics in Pune');
    expect(screen.getByRole('button', { name: /Search with Gemini/ })).toBeEnabled();
  });

  it('flags results that came from a fallback model instead of a web search', async () => {
    discoveryApi.searchCompaniesGemini.mockResolvedValue({
      ...SEARCH_RESULT,
      provider: 'groq',
      grounded: false,
      sources: [],
      notice: "Gemini search was unavailable (quota), so these results come from Groq's training data, not a live web search.",
    });
    renderUi(<CompanySearch />);
    describeAs('Healthcare SaaS in Bangalore');
    submit();

    expect(await screen.findByText('Results from Groq, not a live web search')).toBeInTheDocument();
    expect(screen.getByText(/training data, not a live web search/)).toBeInTheDocument();
  });

  it('shows no fallback notice for a grounded Gemini answer', async () => {
    discoveryApi.searchCompaniesGemini.mockResolvedValue({
      ...SEARCH_RESULT, provider: 'gemini', grounded: true, notice: null,
    });
    renderUi(<CompanySearch />);
    describeAs('Healthcare SaaS in Bangalore');
    submit();
    await screen.findAllByTestId('result-row');
    expect(screen.queryByText(/not a live web search/)).not.toBeInTheDocument();
  });

  it('shows the key banner up front and blocks the search when no Gemini key is set', async () => {
    mockAuth.mockReturnValue({ user: { role: 'org_admin' } });
    docsApi.aiStatus.mockResolvedValue({ gemini_key_configured: false });
    renderUi(<CompanySearch />);

    expect(await screen.findByText('Add your Gemini API key to use Gemini search')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Add Gemini key/ })).toHaveAttribute('href', '/settings#api-keys');
    expect(screen.getByRole('button', { name: /Search with Gemini/ })).toBeDisabled();

    // Apollo doesn't need the Gemini key.
    fireEvent.click(screen.getByRole('radio', { name: /Apollo database/ }));
    expect(screen.queryByText(/Add your Gemini API key/)).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Search Apollo/ })).toBeEnabled();
  });

  it('turns a "gemini key required" refusal into the banner, not an error', async () => {
    discoveryApi.searchCompaniesGemini.mockRejectedValue({
      response: { status: 409, data: { detail: { code: 'gemini_key_required', message: 'Add your Gemini API key…' } } },
    });
    renderUi(<CompanySearch />);
    describeAs('Dental clinics in Pune');
    submit();

    expect(await screen.findByText('Add your Gemini API key to use Gemini search')).toBeInTheDocument();
    expect(screen.queryByText(/The search didn.t go through/)).not.toBeInTheDocument();
  });

  it('names Gemini when it rate-limits, rather than showing "no results"', async () => {
    discoveryApi.searchCompaniesGemini.mockResolvedValue({ total: 0, companies: [], search_status: 'rate_limited' });
    renderUi(<CompanySearch />);
    describeAs('Dental clinics in Pune');
    submit();

    const notice = (await screen.findByText('Gemini is rate-limiting searches right now')).closest('[role="alert"]');
    expect(notice).not.toHaveTextContent(/Apollo/);
    expect(screen.queryByText('No companies matched')).not.toBeInTheDocument();
  });

  it('suggests a broader description when nothing matched', async () => {
    discoveryApi.searchCompaniesGemini.mockResolvedValue({ total: 0, imported: 0, already_existed: 0, companies: [], search_status: 'ok' });
    renderUi(<CompanySearch />);
    describeAs('Quantum dog groomers on the Moon');
    submit();

    expect(await screen.findByText('No companies matched')).toBeInTheDocument();
    expect(screen.getByText(/describing the companies more broadly/)).toBeInTheDocument();
  });

  it('shows a failed request inline, naming Gemini, and retries it', async () => {
    discoveryApi.searchCompaniesGemini
      .mockRejectedValueOnce({ message: 'Network Error' })
      .mockResolvedValueOnce(SEARCH_RESULT);
    renderUi(<CompanySearch />);
    describeAs('Dental clinics in Pune');
    submit();

    expect(await screen.findByText('Network Error')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Try again/ }));
    expect(await screen.findByText('2 companies found')).toBeInTheDocument();
    expect(discoveryApi.searchCompaniesGemini).toHaveBeenCalledTimes(2);
  });

  it('says nothing was sent to Gemini when our session is refused', async () => {
    discoveryApi.searchCompaniesGemini.mockRejectedValue({ response: { status: 401, data: { detail: 'Invalid or missing API key' } } });
    renderUi(<CompanySearch />);
    describeAs('Dental clinics in Pune');
    submit();

    expect(await screen.findByText(/nothing was sent to Gemini/)).toBeInTheDocument();
  });
});

describe('Document upload', () => {
  const pick = (files) =>
    fireEvent.change(screen.getByTestId('upload-input'), { target: { files } });

  it('rejects an unsupported file before uploading it', async () => {
    renderUi(<DocumentDiscovery />);
    await waitFor(() => expect(screen.getByRole('button', { name: /Choose files/ })).toBeEnabled());

    pick([new File(['x'], 'photo.png', { type: 'image/png' })]);
    expect(screen.getByRole('alert')).toHaveTextContent(/photo\.png: Not a supported file type/);
    expect(docsApi.upload).not.toHaveBeenCalled();
  });

  it('shows the upload error next to the file instead of only a toast', async () => {
    docsApi.upload.mockRejectedValue({ response: { data: { detail: 'No readable text in this PDF' } } });
    renderUi(<DocumentDiscovery />);
    await waitFor(() => expect(screen.getByRole('button', { name: /Choose files/ })).toBeEnabled());

    pick([new File(['x'], 'scan.pdf', { type: 'application/pdf' })]);
    expect(await screen.findByText('scan.pdf: No readable text in this PDF')).toBeInTheDocument();
  });

  it('guides a first-time user, and gets out of the way once they have uploads', async () => {
    const view = renderUi(<DocumentDiscovery />);
    expect(await screen.findByTestId('how-it-works')).toBeInTheDocument();
    view.unmount();

    queryClient.clear();
    docsApi.list.mockResolvedValue([{ id: 'd1', filename: 'a.csv', status: 'ready', candidate_count: 2, created_at: '2026-10-01' }]);
    renderUi(<DocumentDiscovery />);
    expect(await screen.findByText('a.csv')).toBeInTheDocument();
    expect(screen.queryByTestId('how-it-works')).not.toBeInTheDocument();
  });

  it('reopens the document named in the URL', async () => {
    docsApi.get.mockResolvedValue({ id: 'doc-9', filename: 'expo.xlsx', status: 'ready', candidate_count: 0, candidates: [] });
    renderUi(<DocumentDiscovery />, { route: '/discovery?tab=document&doc=doc-9' });
    expect(await screen.findByText('expo.xlsx')).toBeInTheDocument();
    expect(docsApi.get).toHaveBeenCalledWith('doc-9');
  });
});

const REVIEW_DOC = {
  id: 'doc-1',
  candidates: [
    {
      id: 'c1',
      name: 'Acme Stamping',
      confidence: 0.9,
      contacts: [
        { id: 'c1-p1', first_name: 'Jane', last_name: 'Doe', email: 'jane@acme.com' },
        { id: 'c1-p2', first_name: 'Raj', last_name: 'Patel', email: 'raj@acme.com' },
      ],
    },
    {
      id: 'c2',
      name: 'Beta Tools',
      confidence: 0.95,
      imported_company_id: 'co-2',
      contacts: [
        { id: 'c2-p1', first_name: 'Lee', email: 'lee@beta.com', imported_contact_id: 'ct-9' },
        { id: 'c2-p2', first_name: 'Ana', email: 'ana@beta.com' },
      ],
    },
  ],
};

describe('Document review', () => {
  it('imports only the people left ticked', async () => {
    docsApi.importCandidates.mockResolvedValue({ companies_created: 1, companies_matched: 0, contacts_created: 1 });
    renderUi(<DocumentReview doc={REVIEW_DOC} canContinue={false} onContinue={() => {}} />);

    fireEvent.click(screen.getByLabelText('Select Raj Patel'));
    fireEvent.click(screen.getByRole('button', { name: /Import 1 company · 1 person/ }));

    await waitFor(() => expect(docsApi.importCandidates).toHaveBeenCalledWith('doc-1', ['c1'], ['c1-p1']));
  });

  it('lets you come back for someone not imported the first time', async () => {
    docsApi.importCandidates.mockResolvedValue({ companies_created: 0, companies_matched: 1, contacts_created: 1 });
    renderUi(<DocumentReview doc={REVIEW_DOC} canContinue onContinue={() => {}} />);

    // Already-imported people are marked, not offered again.
    expect(screen.queryByLabelText('Select Lee')).not.toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Select Acme Stamping')); // untick the default
    fireEvent.click(screen.getByLabelText('Select Ana'));
    fireEvent.click(screen.getByRole('button', { name: /Import 0 companies · 1 person/ }));

    await waitFor(() => expect(docsApi.importCandidates).toHaveBeenCalledWith('doc-1', ['c2'], ['c2-p2']));
  });

  it('says why drafting is locked until someone is imported', () => {
    renderUi(<DocumentReview doc={REVIEW_DOC} canContinue={false} onContinue={() => {}} />);
    expect(screen.getByRole('button', { name: /Next: draft emails/ })).toBeDisabled();
    expect(screen.getByText(/Import at least one person with an email address/)).toBeInTheDocument();
  });
});

const OUTREACH_DOC = {
  id: 'doc-7',
  sequence_id: null,
  candidates: [
    { id: 'c1', name: 'Acme', contacts: [{ id: 'p1', first_name: 'Jane', email: 'jane@acme.com', imported_contact_id: 'ct-1' }] },
  ],
};

describe('Outreach drafts', () => {
  it('keeps the brief and edited emails after leaving the step', async () => {
    docsApi.draft.mockResolvedValue({ steps: [{ subject: 'Quick idea', body: 'Hi {{ first_name }}' }] });
    docsApi.preview.mockResolvedValue({ to_email: 'jane@acme.com', steps: [{ step_number: 1, subject: 'Quick idea', body: 'Hi Jane' }] });
    const view = renderUi(<DocumentOutreach doc={OUTREACH_DOC} onBack={() => {}} />);

    fireEvent.change(screen.getByPlaceholderText(/quick-change stamping dies/), {
      target: { value: 'We cut die changeovers to ten minutes.' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Draft with AI/ }));
    // Drafting previews straight away for the first recipient.
    expect(await screen.findByText('Hi Jane')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Subject for email 1'), { target: { value: 'Ten-minute changeovers' } });
    view.unmount();

    renderUi(<DocumentOutreach doc={OUTREACH_DOC} onBack={() => {}} />);
    expect(screen.getByPlaceholderText(/quick-change stamping dies/)).toHaveValue('We cut die changeovers to ten minutes.');
    expect(screen.getByLabelText('Subject for email 1')).toHaveValue('Ten-minute changeovers');
  });
});

describe('Gemini key banner', () => {
  it('sends an org admin straight to the API Keys tab', () => {
    mockAuth.mockReturnValue({ user: { role: 'org_admin' } });
    renderUi(<GeminiKeyBanner />);
    expect(screen.getByRole('link', { name: /Add Gemini key/ })).toHaveAttribute('href', '/settings#api-keys');
  });

  it('tells everyone else who can add it, without a dead-end link', () => {
    mockAuth.mockReturnValue({ user: { role: 'org_agent' } });
    renderUi(<GeminiKeyBanner />);
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.getByText(/Ask an org admin/)).toBeInTheDocument();
  });
});
