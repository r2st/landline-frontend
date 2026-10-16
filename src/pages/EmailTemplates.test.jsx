import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const mockTemplates = vi.fn();
const createMutate = vi.fn().mockResolvedValue({ id: 't-new' });
const updateMutate = vi.fn().mockResolvedValue({});
const deleteMutate = vi.fn().mockResolvedValue({});
const defaultMutate = vi.fn();
const previewMutate = vi.fn();
const uploadMutate = vi.fn().mockResolvedValue({});
const deleteAttachmentMutate = vi.fn().mockResolvedValue({});

vi.mock('../hooks/useEmailTemplates', () => ({
  useEmailTemplates: (...a) => mockTemplates(...a),
  useCreateTemplate: () => ({ mutateAsync: createMutate, isPending: false }),
  useUpdateTemplate: () => ({ mutateAsync: updateMutate, isPending: false }),
  useDeleteTemplate: () => ({ mutateAsync: deleteMutate, isPending: false }),
  useSetDefaultTemplate: () => ({ mutate: defaultMutate, isPending: false }),
  usePreviewTemplate: () => ({ mutateAsync: previewMutate, isPending: false }),
  useUploadTemplateAttachment: () => ({ mutateAsync: uploadMutate, isPending: false }),
  useDeleteTemplateAttachment: () => ({ mutateAsync: deleteAttachmentMutate, isPending: false }),
}));

vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

import toast from 'react-hot-toast';
import EmailTemplates from './EmailTemplates';

const pdf = (name = 'deck.pdf', size = 2048) =>
  new File([new Uint8Array(size)], name, { type: 'application/pdf' });

const pick = (files) => {
  fireEvent.change(screen.getByTestId('template-attachment-input'), {
    target: { files },
  });
};

const TEMPLATES = [
  {
    id: 't-1',
    name: 'First touch — machining',
    subject: 'quick question about {{company}}',
    body: '<p>Hi {{first_name}},</p>',
    is_default: true,
    attachments: [
      {
        id: 'a-1',
        filename: 'Capabilities deck.pdf',
        content_type: 'application/pdf',
        size_bytes: 2 * 1024 * 1024,
        created_at: '2026-10-16T00:00:00Z',
      },
    ],
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
  describe('attachments', () => {
    it("lists the selected template's files", () => {
      render(<EmailTemplates />);
      expect(screen.getByText('Capabilities deck.pdf')).toBeInTheDocument();
      expect(screen.getByText('2.0 MB')).toBeInTheDocument();
      // Named per file: several remove buttons can share the section.
      expect(screen.getByRole('button', { name: 'Remove Capabilities deck.pdf' }))
        .toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Download Capabilities deck.pdf' }))
        .toBeInTheDocument();
    });

    it('shows no files for a template without attachments', () => {
      render(<EmailTemplates />);
      fireEvent.click(screen.getByText('Follow-up'));
      expect(screen.queryByText('Capabilities deck.pdf')).toBeNull();
      expect(screen.getByText(/sent with every email from this template/i)).toBeInTheDocument();
    });

    it('uploads straight away on a saved template', async () => {
      render(<EmailTemplates />);
      const file = pdf();
      pick([file]);
      await waitFor(() => {
        expect(uploadMutate).toHaveBeenCalledWith({ templateId: 't-1', file });
      });
      // Not a text edit — nothing to save.
      expect(screen.getByRole('button', { name: /save changes/i })).toBeDisabled();
    });

    it('confirms before removing a saved file', async () => {
      const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
      render(<EmailTemplates />);
      fireEvent.click(screen.getByRole('button', { name: 'Remove Capabilities deck.pdf' }));
      expect(deleteAttachmentMutate).not.toHaveBeenCalled();

      confirm.mockReturnValue(true);
      fireEvent.click(screen.getByRole('button', { name: 'Remove Capabilities deck.pdf' }));
      await waitFor(() => {
        expect(deleteAttachmentMutate).toHaveBeenCalledWith({
          templateId: 't-1', attachmentId: 'a-1',
        });
      });
      confirm.mockRestore();
    });

    it('queues files on a new template and uploads them after create', async () => {
      render(<EmailTemplates />);
      fireEvent.click(screen.getByRole('button', { name: /new template/i }));
      const file = pdf('one-pager.pdf');
      pick([file]);

      // Nothing to upload to yet.
      expect(uploadMutate).not.toHaveBeenCalled();
      expect(screen.getByText('one-pager.pdf')).toBeInTheDocument();
      expect(screen.getByText(/uploads on create/i)).toBeInTheDocument();

      fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'With deck' } });
      fireEvent.change(screen.getByLabelText('Subject'), { target: { value: 'our deck' } });
      fireEvent.click(screen.getByRole('button', { name: /^create$/i }));

      await waitFor(() => {
        expect(uploadMutate).toHaveBeenCalledWith({ templateId: 't-new', file });
      });
      expect(createMutate.mock.invocationCallOrder[0])
        .toBeLessThan(uploadMutate.mock.invocationCallOrder[0]);
    });

    it('drops a queued file without uploading it', () => {
      render(<EmailTemplates />);
      fireEvent.click(screen.getByRole('button', { name: /new template/i }));
      pick([pdf('draft.pdf')]);
      fireEvent.click(screen.getByRole('button', { name: 'Remove draft.pdf' }));
      expect(screen.queryByText('draft.pdf')).toBeNull();
    });

    it('refuses a blocked file type before uploading', () => {
      render(<EmailTemplates />);
      pick([new File(['MZ'], 'setup.exe', { type: 'application/octet-stream' })]);
      expect(uploadMutate).not.toHaveBeenCalled();
      expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/\.exe/));
    });
  });
});
