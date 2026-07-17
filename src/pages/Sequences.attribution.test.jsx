import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

// The Sequences page pulls sequence CRUD from useOutreach; stub them so the test
// focuses on the attribution panel fed by useDeals.
vi.mock('../hooks/useOutreach', () => ({
  useSequences: () => ({ data: [], isLoading: false, isError: false }),
  useCreateSequence: () => ({ mutate: vi.fn() }),
  useUpdateSequenceStatus: () => ({ mutate: vi.fn() }),
  useDeleteSequence: () => ({ mutate: vi.fn() }),
}));

const mockAttribution = vi.fn();
vi.mock('../hooks/useDeals', () => ({
  useDealAttribution: () => mockAttribution(),
}));

import Sequences from './Sequences';

function renderPage() {
  return render(
    <MemoryRouter>
      <Sequences />
    </MemoryRouter>
  );
}

describe('Sequence attribution panel', () => {
  it('renders per-sequence revenue and the unattributed bucket', () => {
    mockAttribution.mockReturnValue({
      data: {
        by_sequence: [
          {
            sequence_id: 's1',
            sequence_name: 'Injection Molding v1',
            sequence_status: 'active',
            enrollments: 40,
            total_deals: 3,
            won_deals: 2,
            pending_deals: 1,
            lost_deals: 0,
            won_revenue: 15000,
            pipeline_value: 3000,
          },
          {
            sequence_id: null,
            sequence_name: null,
            enrollments: null,
            total_deals: 1,
            won_deals: 1,
            won_revenue: 7000,
            pipeline_value: 0,
          },
        ],
        total_won_revenue: 22000,
        total_attributed_won_revenue: 15000,
        attributed_won_deals: 2,
        unattributed_won_deals: 1,
      },
      isLoading: false,
    });

    renderPage();

    expect(screen.getByText('Sequence Attribution')).toBeInTheDocument();
    expect(screen.getByText('Injection Molding v1')).toBeInTheDocument();
    expect(screen.getByText('Unattributed')).toBeInTheDocument();
    // Attributed won revenue summary ($15,000) and the per-row revenue render.
    expect(screen.getAllByText('$15,000').length).toBeGreaterThan(0);
    expect(screen.getByText('$7,000')).toBeInTheDocument();
  });

  it('stays hidden when no deals are attributed yet', () => {
    mockAttribution.mockReturnValue({
      data: { by_sequence: [], total_attributed_won_revenue: 0, attributed_won_deals: 0 },
      isLoading: false,
    });

    renderPage();
    expect(screen.queryByText('Sequence Attribution')).not.toBeInTheDocument();
  });

  it('stays hidden while loading', () => {
    mockAttribution.mockReturnValue({ data: null, isLoading: true });
    renderPage();
    expect(screen.queryByText('Sequence Attribution')).not.toBeInTheDocument();
  });
});
