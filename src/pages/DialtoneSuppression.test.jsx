import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockList = vi.fn();
const mockAdd = vi.fn();
const mockImport = vi.fn();
const mockDelete = vi.fn();
vi.mock('../api/client', () => ({
  api: { get: vi.fn(), post: vi.fn(), delete: vi.fn() },
  queryClient: { invalidateQueries: vi.fn() },
  dialtoneApi: {
    suppressionList: (...a) => mockList(...a),
    addSuppression: (...a) => mockAdd(...a),
    importSuppression: (...a) => mockImport(...a),
    deleteSuppression: (...a) => mockDelete(...a),
  },
}));
vi.mock('react-hot-toast', () => ({
  default: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }),
}));

import DialtoneSuppression from './DialtoneSuppression';

const ROWS = [
  { id: 's1', email: 'block@x.com', reason: 'unsubscribe', source: 'import', created_at: '2026-07-15T10:00:00Z' },
  { id: 's2', email: 'spam@y.com', reason: 'complaint', source: 'manual', created_at: '2026-07-16T10:00:00Z' },
];

const renderPage = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <DialtoneSuppression />
    </QueryClientProvider>
  );

describe('DialtoneSuppression page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockList.mockResolvedValue({ items: ROWS, total: 2, page: 1, page_size: 25 });
    mockAdd.mockResolvedValue({ id: 's3', email: 'new@z.com', reason: 'manual', source: 'manual', created_at: '2026-07-17T10:00:00Z' });
    mockImport.mockResolvedValue({ added: 3, duplicates: 1, invalid: 0, total: 4 });
    mockDelete.mockResolvedValue({});
  });

  it('lists suppressed addresses with reason and source', async () => {
    renderPage();
    expect(await screen.findByText('block@x.com')).toBeInTheDocument();
    expect(screen.getByText('spam@y.com')).toBeInTheDocument();
    expect(screen.getByText('unsubscribe')).toBeInTheDocument();
    expect(screen.getByText('complaint')).toBeInTheDocument();
    // Header count reflects the total.
    expect(screen.getByText(/2 addresses that Dialtone will never contact/i)).toBeInTheDocument();
  });

  it('shows an empty state when the list is empty', async () => {
    mockList.mockResolvedValue({ items: [], total: 0, page: 1, page_size: 25 });
    renderPage();
    expect(await screen.findByText('No suppressed addresses')).toBeInTheDocument();
  });

  it('adds a single address by hand', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('block@x.com');

    await user.click(screen.getByRole('button', { name: /add address/i }));
    await user.type(screen.getByLabelText(/email to suppress/i), 'new@z.com');
    await user.click(screen.getByRole('button', { name: /^add$/i }));

    await waitFor(() =>
      expect(mockAdd).toHaveBeenCalledWith({ email: 'new@z.com', reason: 'manual' })
    );
  });

  it('searches the list, resetting to page 1', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('block@x.com');

    await user.type(screen.getByLabelText(/search suppression list/i), 'spam');
    await waitFor(() =>
      expect(mockList).toHaveBeenLastCalledWith(
        expect.objectContaining({ q: 'spam', page: 1 })
      )
    );
  });

  it('removes an address', async () => {
    const user = userEvent.setup();
    renderPage();
    await screen.findByText('block@x.com');

    await user.click(screen.getByRole('button', { name: /remove block@x\.com/i }));
    await waitFor(() => expect(mockDelete).toHaveBeenCalledWith('s1'));
  });

  it('uploads a CSV via the import panel', async () => {
    const { container } = renderPage();
    await screen.findByText('block@x.com');

    // The file input is visually hidden (a styled button proxies for it), so
    // drive it with fireEvent rather than userEvent's visibility-gated upload.
    const file = new File(['a@b.com\n'], 'suppress.csv', { type: 'text/csv' });
    const input = container.querySelector('input[type="file"]');
    fireEvent.change(input, { target: { files: [file] } });

    // The hook forwards to dialtoneApi.importSuppression(file, reason).
    await waitFor(() => expect(mockImport).toHaveBeenCalledWith(file, 'unsubscribe'));
  });
});
