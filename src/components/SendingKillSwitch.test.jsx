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
  it('shows ACTIVE status and a stop button when sending is enabled', async () => {
    mockGet.mockResolvedValue({ data: { enabled: true, today_sent: 5, daily_limit: 25 } });
    render(<SendingKillSwitch />);

    expect(await screen.findByText('Sending ACTIVE')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /stop all sending/i })).toBeInTheDocument();
  });

  it('requires confirmation, then halts sending', async () => {
    const user = userEvent.setup();
    mockGet.mockResolvedValue({ data: { enabled: true } });
    mockPost.mockResolvedValue({ data: { enabled: false, enrollments_affected: 3 } });

    render(<SendingKillSwitch />);
    await screen.findByText('Sending ACTIVE');

    await user.click(screen.getByRole('button', { name: /stop all sending/i }));
    // Confirmation appears before anything is sent.
    expect(screen.getByText(/this stops all outgoing emails/i)).toBeInTheDocument();
    expect(mockPost).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: /confirm halt/i }));
    await waitFor(() =>
      expect(mockPost).toHaveBeenCalledWith('/system/sending-toggle', expect.objectContaining({ enabled: false }))
    );
    expect(await screen.findByText('Sending PAUSED')).toBeInTheDocument();
  });

  it('shows PAUSED status and a resume button when sending is disabled', async () => {
    mockGet.mockResolvedValue({ data: { enabled: false, reason: 'manual' } });
    render(<SendingKillSwitch />);

    expect(await screen.findByText('Sending PAUSED')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /resume sending/i })).toBeInTheDocument();
  });
});
