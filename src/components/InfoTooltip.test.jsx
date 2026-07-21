import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import InfoTooltip from './InfoTooltip';

describe('InfoTooltip', () => {
  it('hides its text until the trigger is interacted with', () => {
    render(<InfoTooltip text="Explains the field" />);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('reveals the text on hover and hides it on leave', async () => {
    const user = userEvent.setup();
    render(<InfoTooltip text="Explains the field" />);
    const trigger = screen.getByRole('button', { name: /more information/i });

    await user.hover(trigger);
    expect(screen.getByRole('tooltip')).toHaveTextContent('Explains the field');

    await user.unhover(trigger);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('reveals the text on focus (keyboard & touch) and hides it on blur', async () => {
    const user = userEvent.setup();
    render(
      <>
        <InfoTooltip text="Tap me" />
        <button type="button">elsewhere</button>
      </>
    );
    const trigger = screen.getByRole('button', { name: /more information/i });

    await user.tab();
    expect(trigger).toHaveFocus();
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
    // The button advertises its expanded state for assistive tech.
    expect(trigger).toHaveAttribute('aria-expanded', 'true');

    // Moving focus away (tapping elsewhere / tabbing on) hides it.
    await user.tab();
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('does not submit or navigate when clicked inside interactive content', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn((e) => e.preventDefault());
    render(
      <form onSubmit={onSubmit}>
        <InfoTooltip text="x" />
      </form>
    );
    await user.click(screen.getByRole('button', { name: /more information/i }));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('uses a custom accessible label when provided', () => {
    render(<InfoTooltip text="x" label="What is throttle factor" />);
    expect(screen.getByRole('button', { name: 'What is throttle factor' })).toBeInTheDocument();
  });
});
