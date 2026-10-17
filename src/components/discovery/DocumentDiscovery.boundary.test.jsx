import { render, screen, within } from '@testing-library/react';
import { QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it, vi } from 'vitest';

vi.mock('react-hot-toast', () => ({ default: { success: vi.fn(), error: vi.fn() } }));
vi.mock('./DocumentReview', () => ({
  default: () => {
    throw new Error('boom');
  },
}));
vi.mock('../../api/client', async () => {
  const { QueryClient } = await import('@tanstack/react-query');
  return {
    queryClient: new QueryClient({ defaultOptions: { queries: { retry: false } } }),
    discoveryDocsApi: {
      aiStatus: vi.fn().mockResolvedValue({ gemini_key_configured: true }),
      list: vi.fn().mockResolvedValue([]),
      get: vi.fn().mockResolvedValue({ id: 'd1', filename: 'list.csv', status: 'ready', candidate_count: 1, candidates: [] }),
    },
  };
});

const { queryClient } = await import('../../api/client');
const { default: DocumentDiscovery } = await import('./DocumentDiscovery');

describe('DocumentDiscovery error boundary', () => {
  it('contains a crashing step and keeps the wizard around it', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter initialEntries={['/discovery?tab=document&doc=d1']}>
          <DocumentDiscovery />
        </MemoryRouter>
      </QueryClientProvider>
    );

    expect(await screen.findByText('This step hit an unexpected error.')).toBeInTheDocument();
    // The stepper and file header still render.
    expect(screen.getByText('list.csv')).toBeInTheDocument();
    expect(screen.getByText('Review & import')).toBeInTheDocument();
    expect(within(screen.getByRole('alert')).getByRole('button', { name: 'Back to uploads' })).toBeInTheDocument();
  });
});
