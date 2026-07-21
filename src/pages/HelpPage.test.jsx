import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import HelpPage from './HelpPage';

// Render the help routes under a MemoryRouter so /help and /help/:articleId
// both resolve to HelpPage, and links inside it navigate for real.
const renderAt = (path) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/help" element={<HelpPage />} />
        <Route path="/help/:articleId" element={<HelpPage />} />
        <Route path="/dialtone" element={<div>DIALTONE PAGE</div>} />
      </Routes>
    </MemoryRouter>
  );

describe('HelpPage — home', () => {
  it('shows the header, search box, and category navigation', () => {
    renderAt('/help');
    expect(screen.getByRole('heading', { name: /help center/i })).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /search help articles/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /all articles/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /dialtone ai agent/i })).toBeInTheDocument();
  });

  it('filters to a category when its chip is clicked', async () => {
    const user = userEvent.setup();
    renderAt('/help');
    await user.click(screen.getByRole('button', { name: /deliverability/i }));
    // A deliverability article shows; a dialtone-only one does not.
    expect(screen.getByRole('heading', { name: /warmup plans/i })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /reply triage/i })).not.toBeInTheDocument();
  });

  it('searches across articles and reports the count', async () => {
    const user = userEvent.setup();
    renderAt('/help');
    await user.type(screen.getByRole('textbox', { name: /search/i }), 'dmarc');
    expect(await screen.findByText(/result.*for .dmarc./i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /spf, dkim & dmarc/i })).toBeInTheDocument();
  });

  it('shows an empty state when nothing matches', async () => {
    const user = userEvent.setup();
    renderAt('/help');
    await user.type(screen.getByRole('textbox', { name: /search/i }), 'zzzznope');
    expect(await screen.findByText(/nothing found/i)).toBeInTheDocument();
  });
});

describe('HelpPage — article', () => {
  it('renders the article body with breadcrumbs and a feature link', () => {
    renderAt('/help/dialtone-console');
    // Breadcrumb trail: Help Center › Dialtone AI Agent › title
    expect(screen.getByRole('link', { name: /help center/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /dialtone console/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /go to this feature/i })).toHaveAttribute(
      'href',
      '/dialtone'
    );
  });

  it('navigates to the feature when the deep link is followed', async () => {
    const user = userEvent.setup();
    renderAt('/help/dialtone-console');
    await user.click(screen.getByRole('link', { name: /go to this feature/i }));
    expect(screen.getByText('DIALTONE PAGE')).toBeInTheDocument();
  });

  it('lists sibling articles from the same category', () => {
    renderAt('/help/ai-drafts');
    expect(screen.getByText(/more in dialtone ai agent/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /reply triage/i })).toBeInTheDocument();
  });

  it('shows a not-found state for an unknown article', () => {
    renderAt('/help/does-not-exist');
    expect(screen.getByText(/article not found/i)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /back to help center/i })).toBeInTheDocument();
  });
});
