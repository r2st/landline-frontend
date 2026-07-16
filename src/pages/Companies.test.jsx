import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Link, MemoryRouter } from 'react-router-dom';

// Stub the data layer so the page renders offline. `useCompanies` is the
// assertion target: it's what turns UI filter state into a server query.
const mockUseCompanies = vi.fn();
vi.mock('../hooks/useCompanies', () => ({
  useCompanies: (...a) => mockUseCompanies(...a),
  useCreateCompany: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteCompany: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));
vi.mock('../hooks/useGroups', () => ({
  useGroups: () => ({ data: [] }),
  useAddGroupMembers: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));
vi.mock('../hooks/useOutreach', () => ({ useSequences: () => ({ data: [] }) }));
vi.mock('../api/client', () => ({
  api: { get: vi.fn(), post: vi.fn() },
  pipelineApi: { bulkUpdateStage: vi.fn() },
  contactsApi: { getAll: vi.fn() },
  companiesApi: { bulkTag: vi.fn() },
  outreachApi: { enroll: vi.fn() },
  queryClient: { invalidateQueries: vi.fn() },
}));

import Companies from './Companies';

const PLACES_CO = {
  id: 'co-1', name: 'Acme Metals', domain: 'acme.test', source: 'google_places',
  stage: 'new_lead', score: 72, country: 'IN', city: 'Pune', contacts: [],
};

const renderPage = (path = '/companies') =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Companies />
    </MemoryRouter>
  );

describe('Companies filters from the URL', () => {
  beforeEach(() => {
    mockUseCompanies.mockReturnValue({
      data: { items: [PLACES_CO], total: 1, page: 1, pageSize: 50 },
      isLoading: false,
      isError: false,
    });
  });

  it('asks the server for the source, so the filter covers every page not just the loaded one', () => {
    renderPage('/companies?source=google_places');
    expect(mockUseCompanies).toHaveBeenCalledWith(expect.objectContaining({ source: 'google_places' }));
  });

  it('opens the filter panel so a linked-in filter is visible rather than an unexplained short list', () => {
    renderPage('/companies?source=google_places');
    // The panel's Source control is only mounted while the panel is open.
    expect(screen.getByDisplayValue('Google Places')).toBeInTheDocument();
  });

  it('leaves the panel closed and the query unfiltered without params', () => {
    renderPage('/companies');
    expect(mockUseCompanies).toHaveBeenCalledWith(expect.not.objectContaining({ source: expect.anything() }));
    expect(screen.queryByDisplayValue('Google Places')).toBeNull();
  });

  it('carries stage and search params through to the query', () => {
    renderPage('/companies?stage=outreach&q=acme');
    expect(mockUseCompanies).toHaveBeenCalledWith(
      expect.objectContaining({ stage: 'outreach', search: 'acme' })
    );
  });

  // Navigating /companies?source=a → /companies?source=b reuses this component,
  // so the filter has to follow the URL rather than only seed at mount.
  it('re-filters when navigating between two filtered links without remounting', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/companies?source=google_places']}>
        <Link to="/companies?source=apollo">switch to apollo</Link>
        <Companies />
      </MemoryRouter>
    );
    expect(mockUseCompanies).toHaveBeenCalledWith(expect.objectContaining({ source: 'google_places' }));

    await user.click(screen.getByText('switch to apollo'));
    expect(mockUseCompanies).toHaveBeenLastCalledWith(expect.objectContaining({ source: 'apollo' }));
  });
});

// The reported bug: Places found these companies and enrichment found emails
// for most of them, but the table showed only names.
describe('Companies list shows who to contact', () => {
  const withContact = {
    ...PLACES_CO,
    contact_count: 1,
    primary_contact: {
      id: 'ct-1',
      first_name: 'Dana',
      last_name: 'Reed',
      full_name: 'Dana Reed',
      title: 'Owner',
      email: 'dana@acme.test',
      phone: '+12165550256',
      is_primary: false,
      unsubscribed: false,
      suppressed: false,
    },
  };

  const renderWith = (company) => {
    mockUseCompanies.mockReturnValue({
      data: { items: [company], total: 1, page: 1, pageSize: 50 },
      isLoading: false,
      isError: false,
    });
    return renderPage('/companies');
  };

  it('renders the primary contact email as a mailto link', () => {
    renderWith(withContact);
    const link = screen.getByRole('link', { name: 'dana@acme.test' });
    expect(link).toHaveAttribute('href', 'mailto:dana@acme.test');
  });

  it('renders the contact name and phone alongside the address', () => {
    renderWith(withContact);
    expect(screen.getByText('Dana Reed · Owner')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '+12165550256' })).toHaveAttribute('href', 'tel:+12165550256');
  });

  it('shows the address alone when enrichment found no name', () => {
    renderWith({
      ...withContact,
      primary_contact: { ...withContact.primary_contact, first_name: null, last_name: null, full_name: null, title: null },
    });
    expect(screen.getByRole('link', { name: 'dana@acme.test' })).toBeInTheDocument();
  });

  it('marks an opted-out contact rather than inviting a send', () => {
    renderWith({
      ...withContact,
      primary_contact: { ...withContact.primary_contact, suppressed: true },
    });
    expect(screen.getByRole('link', { name: 'dana@acme.test' })).toHaveClass('line-through');
  });

  it('degrades to a dash when a company genuinely has no contact', () => {
    renderWith({ ...PLACES_CO, contact_count: 0, primary_contact: null });
    expect(screen.queryByRole('link', { name: /@/ })).not.toBeInTheDocument();
  });
});
