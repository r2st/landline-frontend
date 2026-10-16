import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import FeaturesPage from './FeaturesPage';
import { getArticle } from '../lib/helpContent';

const renderPage = () =>
  render(
    <MemoryRouter>
      <FeaturesPage />
    </MemoryRouter>
  );

describe('FeaturesPage', () => {
  it('renders the hero and every feature group heading', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: /everything doaide prospect can do/i })).toBeInTheDocument();
    for (const group of ['Contacts & Pipeline', 'Autopilot AI Agent', 'Deliverability', 'Platform & Settings']) {
      expect(screen.getByRole('heading', { name: group })).toBeInTheDocument();
    }
  });

  it('links each feature to its page and its help article', () => {
    renderPage();
    // Every "Learn" link points at a real help article route.
    const learnLinks = screen.getAllByRole('link', { name: /learn/i });
    expect(learnLinks.length).toBeGreaterThan(20);
    for (const link of learnLinks) {
      const href = link.getAttribute('href');
      expect(href).toMatch(/^\/help\//);
      const id = href.replace('/help/', '');
      expect(getArticle(id), `Learn link points at missing article: ${id}`).not.toBeNull();
    }
  });

  it('surfaces the marquee capabilities by name', () => {
    renderPage();
    expect(screen.getByRole('heading', { name: 'Autopilot Console' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Send-time optimization' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Spintax' })).toBeInTheDocument();
  });

  it('offers the Help Center as a primary call to action', () => {
    renderPage();
    expect(screen.getByRole('link', { name: /open the help center/i })).toHaveAttribute('href', '/help');
  });
});
