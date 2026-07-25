import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

const mockEngagement = vi.fn();
const mockUpdateTags = vi.fn();
const mutateAsync = vi.fn().mockResolvedValue({});
const mutate = vi.fn();

vi.mock('../hooks/useContacts', () => ({
  useContactEngagement: (...a) => mockEngagement(...a),
  useUpdateContactTags: (...a) => mockUpdateTags(...a),
}));

import ContactEngagement, { ContactTags } from './ContactEngagement';

const ENGAGEMENT = {
  contact_id: 'c-1',
  sent: 4,
  opened: 2,
  clicked: 0,
  replied: 1,
  bounced: 0,
  open_rate: 0.5,
  reply_rate: 0.25,
  active_enrollments: 1,
  events: [
    {
      type: 'replied',
      occurred_at: '2026-07-24T10:00:00Z',
      subject: 'Re: quick question',
      source: 'outreach',
      step_number: 2,
      sequence_name: 'Molding outreach',
    },
    {
      type: 'sent',
      occurred_at: '2026-07-20T09:00:00Z',
      subject: 'quick question about your presses',
      source: 'outreach',
      step_number: 1,
      sequence_name: 'Molding outreach',
    },
  ],
};

describe('ContactEngagement', () => {
  beforeEach(() => {
    mockEngagement.mockReset();
    mockUpdateTags.mockReset();
    mutateAsync.mockClear();
    mutate.mockClear();
    mockUpdateTags.mockReturnValue({ mutate, mutateAsync });
  });

  it('shows the counters and derived rates', () => {
    mockEngagement.mockReturnValue({ data: ENGAGEMENT, isLoading: false });
    render(<ContactEngagement contactId="c-1" />);

    // "Sent" is both a stat label and an event label — the stat is the one
    // carrying the count.
    expect(screen.getAllByText('Sent').length).toBeGreaterThan(0);
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText(/50% open · 25% reply/)).toBeInTheDocument();
    expect(screen.getByText(/1 active sequence/)).toBeInTheDocument();
  });

  it('lists the history with the sequence and step it came from', () => {
    mockEngagement.mockReturnValue({ data: ENGAGEMENT, isLoading: false });
    render(<ContactEngagement contactId="c-1" />);

    expect(screen.getByText(/Re: quick question/)).toBeInTheDocument();
    expect(screen.getAllByText(/Molding outreach · step/).length).toBe(2);
  });

  it('says plainly when nothing has been sent', () => {
    mockEngagement.mockReturnValue({
      data: { ...ENGAGEMENT, sent: 0, opened: 0, replied: 0, events: [] },
      isLoading: false,
    });
    render(<ContactEngagement contactId="c-1" />);
    expect(screen.getByText(/nothing sent to this contact yet/i)).toBeInTheDocument();
  });

  it('renders nothing rather than a broken panel when the fetch fails', () => {
    mockEngagement.mockReturnValue({ data: null, isLoading: false });
    const { container } = render(<ContactEngagement contactId="c-1" />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('ContactTags', () => {
  beforeEach(() => {
    mockUpdateTags.mockReset();
    mutateAsync.mockClear();
    mutate.mockClear();
    mockUpdateTags.mockReturnValue({ mutate, mutateAsync });
  });

  it('renders existing tags', () => {
    render(<ContactTags contactId="c-1" tags={['imts 2026', 'warm']} />);
    expect(screen.getByText('imts 2026')).toBeInTheDocument();
    expect(screen.getByText('warm')).toBeInTheDocument();
  });

  it('adds a tag as a delta, not a replacement set', async () => {
    // Sending the whole set would let two people editing the same contact from
    // two stale views overwrite each other.
    render(<ContactTags contactId="c-1" tags={['existing']} />);
    fireEvent.click(screen.getByRole('button', { name: /add tag/i }));

    const input = screen.getByLabelText('New tag');
    fireEvent.change(input, { target: { value: 'warm' } });
    fireEvent.submit(input.closest('form'));

    expect(mutateAsync).toHaveBeenCalledWith({ id: 'c-1', add: ['warm'] });
  });

  it('splits a comma-separated entry into several tags', async () => {
    render(<ContactTags contactId="c-1" tags={[]} />);
    fireEvent.click(screen.getByRole('button', { name: /add tag/i }));

    const input = screen.getByLabelText('New tag');
    fireEvent.change(input, { target: { value: 'imts, warm ,  ' } });
    fireEvent.submit(input.closest('form'));

    expect(mutateAsync).toHaveBeenCalledWith({ id: 'c-1', add: ['imts', 'warm'] });
  });

  it('removes a tag', () => {
    render(<ContactTags contactId="c-1" tags={['warm']} />);
    fireEvent.click(screen.getByRole('button', { name: 'Remove tag warm' }));
    expect(mutate).toHaveBeenCalledWith({ id: 'c-1', remove: ['warm'] });
  });

  it('says when there are none', () => {
    render(<ContactTags contactId="c-1" tags={[]} />);
    expect(screen.getByText('None yet')).toBeInTheDocument();
  });
});
