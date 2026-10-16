import { describe, it, expect } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import HelpIcon from './HelpIcon';

const renderIcon = (props) =>
  render(
    <MemoryRouter>
      <HelpIcon {...props} />
    </MemoryRouter>
  );

describe('HelpIcon', () => {
  it('renders nothing for an unknown article id', () => {
    const { container } = renderIcon({ articleId: 'no-such-article' });
    expect(container).toBeEmptyDOMElement();
  });

  it('shows a trigger button but no panel until clicked', () => {
    renderIcon({ articleId: 'dialtone-console' });
    expect(screen.getByRole('button', { name: /help/i })).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens a slide-over with the article content', async () => {
    const user = userEvent.setup();
    renderIcon({ articleId: 'dialtone-console' });

    await user.click(screen.getByRole('button', { name: /help/i }));
    const dialog = screen.getByRole('dialog', { name: /autopilot console/i });
    // The article body is rendered inside the panel.
    expect(within(dialog).getByText(/autonomous cold-email agent/i)).toBeInTheDocument();
    // And a deep link to the feature itself.
    expect(within(dialog).getByRole('link', { name: /go to this feature/i })).toHaveAttribute(
      'href',
      '/dialtone'
    );
  });

  it('lists related articles from the same category', async () => {
    const user = userEvent.setup();
    renderIcon({ articleId: 'ai-drafts' });
    await user.click(screen.getByRole('button', { name: /help/i }));
    const dialog = screen.getByRole('dialog');
    // Reply triage is a sibling in the "dialtone" category.
    expect(within(dialog).getByRole('link', { name: /reply triage/i })).toBeInTheDocument();
  });

  it('closes on the close button and on Escape', async () => {
    const user = userEvent.setup();
    renderIcon({ articleId: 'ai-drafts' });

    await user.click(screen.getByRole('button', { name: /help/i }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /close help/i }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /help/i }));
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
});
