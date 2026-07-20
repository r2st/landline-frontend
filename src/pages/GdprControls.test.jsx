import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const mockExport = vi.fn();
const mockErase = vi.fn();
vi.mock('../api/client', () => ({
  api: { get: vi.fn(), post: vi.fn() },
  gdprApi: {
    export: (...a) => mockExport(...a),
    erase: (...a) => mockErase(...a),
  },
}));
vi.mock('react-hot-toast', () => ({
  default: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }),
}));

import GdprControls from './GdprControls';

const EXPORT = {
  contact: { name: 'Dana Reed', email: 'dana@precision.com' },
  companies: [{ id: 1 }, { id: 2 }],
  emails_sent: 7,
};

const renderPage = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <GdprControls />
    </QueryClientProvider>
  );

describe('GdprControls page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockExport.mockResolvedValue(EXPORT);
    mockErase.mockResolvedValue({ ok: true });
  });

  it('keeps the lookup disabled until a valid email is entered', async () => {
    const user = userEvent.setup();
    renderPage();
    const lookup = screen.getByRole('button', { name: /look up/i });
    expect(lookup).toBeDisabled();

    await user.type(screen.getByLabelText(/contact email/i), 'not-an-email');
    expect(lookup).toBeDisabled();

    await user.type(screen.getByLabelText(/contact email/i), '{Backspace>12/}dana@precision.com');
    expect(lookup).toBeEnabled();
  });

  it('exports and summarizes what is held for the contact', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.type(screen.getByLabelText(/contact email/i), 'dana@precision.com');
    await user.click(screen.getByRole('button', { name: /look up/i }));

    expect(await screen.findByText('dana@precision.com')).toBeInTheDocument();
    expect(mockExport).toHaveBeenCalledWith('dana@precision.com');
    // Summary tiles reflect the payload shape.
    expect(screen.getByText('Companies')).toBeInTheDocument();
    expect(screen.getByText('Emails Sent')).toBeInTheDocument();
  });

  it('gates erasure behind a typed email confirmation', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.type(screen.getByLabelText(/contact email/i), 'dana@precision.com');
    await user.click(screen.getByRole('button', { name: /look up/i }));
    await screen.findByText('dana@precision.com');

    await user.click(screen.getByRole('button', { name: /erase all data/i }));
    const dialog = within(screen.getByRole('dialog', { name: /confirm erasure/i }));
    const eraseBtn = dialog.getByRole('button', { name: /erase permanently/i });
    // Locked until the email is retyped exactly.
    expect(eraseBtn).toBeDisabled();

    await user.type(dialog.getByLabelText(/confirm email/i), 'wrong@example.com');
    expect(eraseBtn).toBeDisabled();

    await user.clear(dialog.getByLabelText(/confirm email/i));
    await user.type(dialog.getByLabelText(/confirm email/i), 'dana@precision.com');
    expect(eraseBtn).toBeEnabled();

    await user.click(eraseBtn);
    expect(mockErase).toHaveBeenCalledWith('dana@precision.com');
  });

  it('surfaces an export failure instead of pretending there is no data', async () => {
    const user = userEvent.setup();
    mockExport.mockRejectedValue(new Error('subject not found'));
    renderPage();
    await user.type(screen.getByLabelText(/contact email/i), 'ghost@nowhere.com');
    await user.click(screen.getByRole('button', { name: /look up/i }));

    expect(await screen.findByText(/couldn't load this contact/i)).toBeInTheDocument();
    expect(screen.getByText(/subject not found/i)).toBeInTheDocument();
  });
});
