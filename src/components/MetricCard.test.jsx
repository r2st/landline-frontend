import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Mail } from 'lucide-react';
import MetricCard from './MetricCard';

const renderCard = (props) =>
  render(
    <MemoryRouter>
      <MetricCard {...props} />
    </MemoryRouter>
  );

describe('MetricCard', () => {
  it('stays inert when there is nowhere to drill down to', () => {
    renderCard({ title: 'Avg Lead Score', value: 68, icon: Mail });
    expect(screen.getByText('68')).toBeInTheDocument();
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('links the whole card when given a destination', () => {
    renderCard({ title: 'Leads found', value: 67, icon: Mail, to: '/prospecting' });
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/prospecting');
    // The number itself has to be inside the hit area — it's what users aim at.
    expect(link).toContainElement(screen.getByText('67'));
  });

  it('names its destination for screen readers', () => {
    renderCard({ title: 'Leads found', value: 67, to: '/prospecting', linkLabel: 'Leads found — view the prospecting queue' });
    expect(screen.getByRole('link', { name: 'Leads found — view the prospecting queue' })).toBeInTheDocument();
  });

  it('falls back to title and value when no link label is given', () => {
    renderCard({ title: 'Total Leads', value: 67, to: '/companies' });
    expect(screen.getByRole('link', { name: /Total Leads: 67/ })).toBeInTheDocument();
  });
});
