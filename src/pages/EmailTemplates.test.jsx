import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const mockTemplates = vi.fn();
const createMutate = vi.fn().mockResolvedValue({ id: 't-new' });
const updateMutate = vi.fn().mockResolvedValue({});
const deleteMutate = vi.fn().mockResolvedValue({});
const defaultMutate = vi.fn();
const previewMutate = vi.fn();

vi.mock('../hooks/useEmailTemplates', () => ({
  useEmailTemplates: (...a) => mockTemplates(...a),
  useCreateTemplate: () => ({ mutateAsync: createMutate, isPending: false }),
  useUpdateTemplate: () => ({ mutateAsync: updateMutate, isPending: false }),
  useDeleteTemplate: () => ({ mutateAsync: deleteMutate, isPending: false }),
  useSetDefaultTemplate: () => ({ mutate: defaultMutate, isPending: false }),
  usePreviewTemplate: () => ({ mutateAsync: previewMutate, isPending: false }),
}));

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

import EmailTemplates from './EmailTemplates';

const TEMPLATES = [
  {
    id: 't-1',
    name: 'First touch — machining',
    subject: 'quick question about {{company}}',
    body: '<p>Hi {{first_name}},</p>',
    is_default: true,
  },
  {
    id: 't-2',
    name: 'Follow-up',
    subject: 'following up',
    body: '<p>Circling back.</p>',
    is_default: false,
  },
];

describe('EmailTemplates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockTemplates.mockReturnValue({ data: TEMPLATES, isLoading: false });
    previewMutate.mockResolvedValue({
      subject: 'quick question about Acme Precision Manufacturing',
      body: '<p>Hi Jordan,</p>',
      merge_context: {},
    });
  });

  it('opens on the default template rather than an empty pane', () => {
    render(<EmailTemplates />);
    expect(screen.getByLabelText('Name')).toHaveValue('First touch — machining');
    expect(screen.getByLabelText('Subject')).toHaveValue('quick question about {{company}}');
  });

  it('switches templates from the list', () => {
    render(<EmailTemplates />);
    fireEvent.click(screen.getByText('Follow-up'));
    expect(screen.getByLabelText('Name')).toHaveValue('Follow-up');
  });

  it('offers the merge fields before the first preview', () => {
    // Someone writing a new template needs to know what's available up front;
    // an empty palette until you click Preview is the wrong way round.
    render(<EmailTemplates />);
    expect(screen.getByText('{{first_name}}')).toBeInTheDocument();
    expect(screen.getByText('{{company}}')).toBeInTheDocument();
    expect(screen.getByText('{{demo_link}}')).toBeInTheDocument();
  });

  it('inserts a merge field at the cursor in the body', () => {
    render(<EmailTemplates />);
    const body = screen.getByLabelText('Body (HTML)');
    fireEvent.focus(body);
    body.setSelectionRange(0, 0);

    fireEvent.click(screen.getByText('{{city}}'));

    expect(body.value.startsWith('{{city}}')).toBe(true);
  });

  it('inserts into the subject when that is where the cursor was', () => {
    render(<EmailTemplates />);
    const subject = screen.getByLabelText('Subject');
    fireEvent.focus(subject);
    subject.setSelectionRange(0, 0);

    fireEvent.click(screen.getByText('{{first_name}}'));

    expect(subject.value.startsWith('{{first_name}}')).toBe(true);
  });

  it('warns about a misspelled merge field without blocking the save', () => {
    // An unknown field renders as empty text, so the email goes out reading
    // "Hi ," and nothing in any log says why.
    render(<EmailTemplates />);
    fireEvent.change(screen.getByLabelText('Body (HTML)'), {
      target: { value: '<p>Hi {{frist_name}},</p>' },
    });

    // The warning has to name the offending token — "something is wrong" is
    // not actionable when a body has a dozen fields in it.
    const warning = screen.getByText(/unknown merge field/i).closest('div');
    expect(warning).toHaveTextContent('{{frist_name}}');
    // Still savable — this is advice, not a gate.
    expect(screen.getByRole('button', { name: /save changes/i })).not.toBeDisabled();
  });

  it('does not flag known aliases as typos', () => {
    render(<EmailTemplates />);
    fireEvent.change(screen.getByLabelText('Body (HTML)'), {
      target: { value: '<p>Hi {{first_name}} at {{company_name}} — {{booking_link}}</p>' },
    });
    expect(screen.queryByText(/unknown merge field/i)).toBeNull();
  });

  it('renders the preview with sample data', async () => {
    render(<EmailTemplates />);
    fireEvent.click(screen.getByRole('button', { name: /preview/i }));

    await waitFor(() => {
      expect(screen.getByText('quick question about Acme Precision Manufacturing'))
        .toBeInTheDocument();
    });
    expect(screen.getByText(/Hi Jordan,/)).toBeInTheDocument();
    // The preview must not imply it's the literal wire format.
    expect(screen.getByText(/appends the unsubscribe footer/i)).toBeInTheDocument();
  });

  it('save is disabled until something changes', () => {
    render(<EmailTemplates />);
    expect(screen.getByRole('button', { name: /save changes/i })).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Subject'), { target: { value: 'new subject' } });
    expect(screen.getByRole('button', { name: /save changes/i })).not.toBeDisabled();
  });

  it('saves an edit against the selected template', async () => {
    render(<EmailTemplates />);
    fireEvent.change(screen.getByLabelText('Subject'), { target: { value: 'edited' } });
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(updateMutate).toHaveBeenCalledWith({
        id: 't-1',
        data: expect.objectContaining({ subject: 'edited' }),
      });
    });
  });

  it('creates a new template instead of overwriting the selected one', async () => {
    render(<EmailTemplates />);
    fireEvent.click(screen.getByRole('button', { name: /new template/i }));

    expect(screen.getByLabelText('Name')).toHaveValue('');

    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Third touch' } });
    fireEvent.change(screen.getByLabelText('Subject'), { target: { value: 'one more thought' } });
    fireEvent.click(screen.getByRole('button', { name: /create/i }));

    await waitFor(() => {
      expect(createMutate).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'Third touch', subject: 'one more thought' }),
      );
    });
    expect(updateMutate).not.toHaveBeenCalled();
  });

  it('only offers "make default" on a template that is not already the default', () => {
    render(<EmailTemplates />);
    expect(screen.queryByRole('button', { name: /make default/i })).toBeNull();

    fireEvent.click(screen.getByText('Follow-up'));
    expect(screen.getByRole('button', { name: /make default/i })).toBeInTheDocument();
  });

  it('confirms before deleting', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<EmailTemplates />);
    fireEvent.click(screen.getByRole('button', { name: /delete/i }));
    expect(deleteMutate).not.toHaveBeenCalled();

    confirm.mockReturnValue(true);
    fireEvent.click(screen.getByRole('button', { name: /delete/i }));
    await waitFor(() => expect(deleteMutate).toHaveBeenCalledWith('t-1'));
    confirm.mockRestore();
  });

  it('shows an empty state with no templates', () => {
    mockTemplates.mockReturnValue({ data: [], isLoading: false });
    render(<EmailTemplates />);
    expect(screen.getByText(/no templates yet/i)).toBeInTheDocument();
  });
});
