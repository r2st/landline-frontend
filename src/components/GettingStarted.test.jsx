import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import GettingStarted, { GETTING_STARTED_STEPS } from './GettingStarted';

const renderChecklist = () =>
  render(
    <MemoryRouter>
      <GettingStarted />
    </MemoryRouter>
  );

describe('GettingStarted', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders every setup step with a deep link', () => {
    renderChecklist();
    for (const step of GETTING_STARTED_STEPS) {
      expect(screen.getByText(step.title)).toBeInTheDocument();
    }
    // Each row has a "Go" link to the matching page.
    const goLinks = screen.getAllByRole('link', { name: /go/i });
    expect(goLinks).toHaveLength(GETTING_STARTED_STEPS.length);
    expect(goLinks[0]).toHaveAttribute('href', GETTING_STARTED_STEPS[0].to);
  });

  it('starts at zero of five complete', () => {
    renderChecklist();
    expect(screen.getByText(`0 of ${GETTING_STARTED_STEPS.length} steps complete`)).toBeInTheDocument();
  });

  it('checks a step off and advances the progress bar', async () => {
    const user = userEvent.setup();
    renderChecklist();

    await user.click(screen.getByRole('button', { name: /mark "connect a mailbox" done/i }));
    expect(screen.getByText(`1 of ${GETTING_STARTED_STEPS.length} steps complete`)).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '1');
  });

  it('shows a done state once every step is checked', async () => {
    const user = userEvent.setup();
    renderChecklist();
    for (const step of GETTING_STARTED_STEPS) {
      await user.click(screen.getByRole('button', { name: new RegExp(`mark "${step.title}" done`, 'i') }));
    }
    expect(screen.getByText(/you're all set up/i)).toBeInTheDocument();
  });

  it('persists progress across remounts via localStorage', async () => {
    const user = userEvent.setup();
    const { unmount } = renderChecklist();
    await user.click(screen.getByRole('button', { name: /mark "import or discover contacts" done/i }));
    unmount();

    renderChecklist();
    expect(screen.getByText(`1 of ${GETTING_STARTED_STEPS.length} steps complete`)).toBeInTheDocument();
  });

  it('can be dismissed and stays dismissed', async () => {
    const user = userEvent.setup();
    const { unmount } = renderChecklist();
    await user.click(screen.getByRole('button', { name: /dismiss getting started/i }));
    expect(screen.queryByText(/getting started/i)).not.toBeInTheDocument();

    unmount();
    const { container } = renderChecklist();
    expect(container).toBeEmptyDOMElement();
  });
});
