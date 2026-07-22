import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import UndoToast from './UndoToast';

describe('UndoToast', () => {
  it('shows the message', () => {
    render(<UndoToast message="Archived 3" onUndo={() => {}} onDismiss={() => {}} />);
    expect(screen.getByText('Archived 3')).toBeInTheDocument();
  });

  it('invokes onUndo and onDismiss when Undo is clicked', async () => {
    const onUndo = vi.fn();
    const onDismiss = vi.fn();
    render(<UndoToast message="Archived" onUndo={onUndo} onDismiss={onDismiss} />);

    await userEvent.click(screen.getByRole('button', { name: /Undo/i }));

    expect(onUndo).toHaveBeenCalledTimes(1);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
