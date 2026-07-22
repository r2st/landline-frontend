import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import Avatar, { initialsFor, colorFor } from './Avatar';

describe('initialsFor', () => {
  it('takes first + last initials from a full name', () => {
    expect(initialsFor('Dana Lead')).toBe('DL');
  });

  it('takes two letters from a single name', () => {
    expect(initialsFor('Cher')).toBe('CH');
  });

  it('falls back to the email local-part', () => {
    expect(initialsFor('', 'sam@acme.com')).toBe('SA');
  });

  it('returns ? when there is nothing usable', () => {
    expect(initialsFor('', '')).toBe('?');
  });
});

describe('colorFor', () => {
  it('is deterministic for the same seed', () => {
    expect(colorFor('lead@acme.com')).toBe(colorFor('lead@acme.com'));
  });

  it('is case-insensitive', () => {
    expect(colorFor('Lead@Acme.com')).toBe(colorFor('lead@acme.com'));
  });
});

describe('Avatar', () => {
  it('renders initials from name/email', () => {
    render(<Avatar name="Dana Lead" email="lead@acme.com" />);
    expect(screen.getByText('DL')).toBeInTheDocument();
  });
});
