import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock the API client and toast so the component is deterministic offline.
const mockGet = vi.fn();
const mockPost = vi.fn();
vi.mock('../api/client', () => ({
  api: {
    get: (...a) => mockGet(...a),
    post: (...a) => mockPost(...a),
  },
}));
vi.mock('react-hot-toast', () => ({
  default: { success: vi.fn(), error: vi.fn() },
}));

import SendingKillSwitch from './SendingKillSwitch';

beforeEach(() => {
  mockGet.mockReset();
  mockPost.mockReset();
});

describe('SendingKillSwitch', () => {
  it('shows active status and a pause button when Dialtone is enabled', async () => {
    mockGet.mockResolvedValue({ data: { enabled: true, today_sent: 5, daily_limit: 25 } });
    render(<SendingKillSwitch />);

    expect(await screen.findByText('Dialtone active')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /pause dialtone/i })).toBeInTheDocument();
  });

  it('requires confirmation, then pauses Dialtone', async () => {
    const user = userEvent.setup();
    mockGet.mockResolvedValue({ data: { enabled: true } });
    mockPost.mockResolvedValue({ data: { enabled: false, enrollments_affected: 3 } });

    render(<SendingKillSwitch />);
    await screen.findByText('Dialtone active');

    await user.click(screen.getByRole('button', { name: /pause dialtone/i }));
    // Confirmation appears before anything is sent.
    expect(screen.getByText(/pauses dialtone and stops all outgoing emails/i)).toBeInTheDocument();
    expect(mockPost).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: /confirm halt/i }));
    await waitFor(() =>
      expect(mockPost).toHaveBeenCalledWith('/system/sending-toggle', expect.objectContaining({ enabled: false }))
    );
    expect(await screen.findByText('Dialtone paused')).toBeInTheDocument();
  });

  it('shows paused status and a resume button when Dialtone is disabled', async () => {
    mockGet.mockResolvedValue({ data: { enabled: false, reason: 'manual' } });
    render(<SendingKillSwitch />);

    expect(await screen.findByText('Dialtone paused')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /resume dialtone/i })).toBeInTheDocument();
  });
});
