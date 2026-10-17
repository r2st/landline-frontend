import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

const ALL_SCOPES = [
  'contacts:read', 'contacts:write', 'companies:read', 'companies:write',
  'deals:read', 'deals:write', 'sequences:read', 'sequences:write',
];

const mockCreate = vi.fn();
const mockSetLlmKey = vi.fn();
vi.mock('../api/client', () => ({
  settingsApi: {
    getLlmKey: () => Promise.resolve({ provider: 'gemini', key_hint: '', has_key: false }),
    setLlmKey: (...a) => mockSetLlmKey(...a),
    deleteLlmKey: vi.fn(),
  },
  apiKeysApi: {
    list: () => Promise.resolve([]),
    scopes: () => Promise.resolve({ scopes: ALL_SCOPES }),
    create: (...a) => mockCreate(...a),
    revoke: vi.fn(),
  },
}));
vi.mock('react-hot-toast', () => ({
  default: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }),
}));

import toast from 'react-hot-toast';
import ApiKeysSettings from './ApiKeysSettings';

describe('ApiKeysSettings', () => {
  beforeEach(() => {
    mockCreate.mockReset();
    mockCreate.mockResolvedValue({ api_key: 'lk_secret_value' });
  });

  // A key minted with no scopes authenticates and then 403s on every public
  // endpoint, so the read scopes are on by default.
  it('mints a key with the read scopes selected by default', async () => {
    const user = userEvent.setup();
    render(<ApiKeysSettings />);

    await user.type(await screen.findByPlaceholderText(/key name/i), 'Zapier');
    await screen.findByLabelText('contacts:write');
    await user.click(screen.getByRole('button', { name: /create key/i }));

    await waitFor(() => expect(mockCreate).toHaveBeenCalled());
    expect(mockCreate).toHaveBeenCalledWith({
      name: 'Zapier',
      scopes: ['contacts:read', 'companies:read', 'deals:read', 'sequences:read'],
    });
    expect(await screen.findByText('lk_secret_value')).toBeInTheDocument();
  });

  it('will not mint a key with every scope unchecked', async () => {
    const user = userEvent.setup();
    render(<ApiKeysSettings />);

    await user.type(await screen.findByPlaceholderText(/key name/i), 'Empty');
    for (const scope of ['contacts:read', 'companies:read', 'deals:read', 'sequences:read']) {
      await user.click(await screen.findByLabelText(scope));
    }

    expect(screen.getByRole('button', { name: /create key/i })).toBeDisabled();
    expect(screen.getByText(/select at least one scope/i)).toBeInTheDocument();
  });

  describe('Gemini key', () => {
    beforeEach(() => {
      mockSetLlmKey.mockReset();
      toast.error.mockReset();
      toast.success.mockReset();
    });

    it('saves the trimmed key and shows only its hint afterwards', async () => {
      mockSetLlmKey.mockResolvedValue({ provider: 'gemini', key_hint: '****abcd', has_key: true });
      const user = userEvent.setup();
      render(<ApiKeysSettings />);

      const input = await screen.findByPlaceholderText('Enter your Gemini API key');
      expect(screen.getAllByRole('button', { name: 'Save' })[0]).toBeDisabled();
      await user.type(input, '  AIzaSyTest-abcd  ');
      await user.click(screen.getAllByRole('button', { name: 'Save' })[0]);

      await waitFor(() => expect(mockSetLlmKey).toHaveBeenCalledWith('AIzaSyTest-abcd'));
      expect(await screen.findByText('****abcd')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Replace with a new key...')).toHaveValue('');
      expect(toast.success).toHaveBeenCalledWith('Gemini API key saved');
    });

    it('keeps the typed key and reports the server message when saving fails', async () => {
      mockSetLlmKey.mockRejectedValue({ response: { status: 403, data: { detail: 'Insufficient permissions' } } });
      const user = userEvent.setup();
      render(<ApiKeysSettings />);

      const input = await screen.findByPlaceholderText('Enter your Gemini API key');
      await user.type(input, 'AIzaSyTest');
      await user.click(screen.getAllByRole('button', { name: 'Save' })[0]);

      await waitFor(() => expect(toast.error).toHaveBeenCalledWith('Insufficient permissions'));
      expect(input).toHaveValue('AIzaSyTest');
    });

    // A 422 carries ``detail`` as a list of objects; passing that to toast
    // would throw while rendering.
    it('turns a validation-error list into a plain message', async () => {
      mockSetLlmKey.mockRejectedValue({
        response: { status: 422, data: { detail: [{ loc: ['body', 'api_key'], msg: 'String should have at most 500 characters' }] } },
      });
      const user = userEvent.setup();
      render(<ApiKeysSettings />);

      await user.type(await screen.findByPlaceholderText('Enter your Gemini API key'), 'x');
      await user.click(screen.getAllByRole('button', { name: 'Save' })[0]);

      await waitFor(() => expect(toast.error).toHaveBeenCalledWith('String should have at most 500 characters'));
    });
  });
});
