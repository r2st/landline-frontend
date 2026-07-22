import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import RichTextComposer from './RichTextComposer';

describe('RichTextComposer', () => {
  it('renders formatting toolbar buttons', () => {
    render(<RichTextComposer value="" onChange={() => {}} />);
    expect(screen.getByLabelText('Bold')).toBeInTheDocument();
    expect(screen.getByLabelText('Italic')).toBeInTheDocument();
    expect(screen.getByLabelText('Insert link')).toBeInTheDocument();
  });

  it('renders the initial HTML value into the editable surface', () => {
    render(<RichTextComposer value="<p>hello there</p>" onChange={() => {}} ariaLabel="Reply body" />);
    expect(screen.getByLabelText('Reply body').textContent).toContain('hello there');
  });

  it('syncs an out-of-band value change (e.g. inserting a template)', () => {
    const { rerender } = render(
      <RichTextComposer value="" onChange={() => {}} ariaLabel="Reply body" />
    );
    rerender(<RichTextComposer value="<p>inserted copy</p>" onChange={() => {}} ariaLabel="Reply body" />);
    expect(screen.getByLabelText('Reply body').textContent).toContain('inserted copy');
  });

  it('calls onSend on ⌘/Ctrl+Enter', () => {
    const onSend = vi.fn();
    render(<RichTextComposer value="" onChange={() => {}} onSend={onSend} ariaLabel="Reply body" />);
    const editor = screen.getByLabelText('Reply body');
    fireEvent.keyDown(editor, { key: 'Enter', metaKey: true });
    expect(onSend).toHaveBeenCalledTimes(1);
  });

  it('emits html + text on input', () => {
    const onChange = vi.fn();
    render(<RichTextComposer value="" onChange={onChange} ariaLabel="Reply body" />);
    const editor = screen.getByLabelText('Reply body');
    editor.innerHTML = '<p>typed</p>';
    fireEvent.input(editor);
    expect(onChange).toHaveBeenCalled();
    const last = onChange.mock.calls[onChange.mock.calls.length - 1][0];
    expect(last.html).toContain('typed');
  });
});
