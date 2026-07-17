import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

// Mock the auth context so each test can drive ProtectedRoute with an exact
// auth state.
const mockUseAuth = vi.fn();
vi.mock('../context/AuthContext', () => ({
  useAuth: () => mockUseAuth(),
}));

import ProtectedRoute from './ProtectedRoute';

function renderAt(path, element) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/login" element={<div>LOGIN PAGE</div>} />
        <Route path="/change-password" element={<div>CHANGE PASSWORD PAGE</div>} />
        <Route path="/" element={<div>HOME PAGE</div>} />
        <Route path="/secret" element={element} />
        <Route path="/admin" element={element} />
      </Routes>
    </MemoryRouter>
  );
}

const PROTECTED = <ProtectedRoute><div>SECRET CONTENT</div></ProtectedRoute>;
const ADMIN_ONLY = (
  <ProtectedRoute requireRole="org_admin">
    <div>ADMIN CONTENT</div>
  </ProtectedRoute>
);

function authed(role, extra = {}) {
  return { loading: false, isAuthenticated: true, user: { role }, mustChangePassword: false, ...extra };
}

describe('ProtectedRoute redirect matrix', () => {
  beforeEach(() => {
    mockUseAuth.mockReset();
  });

  it('shows a loading spinner while the session is restoring', () => {
    mockUseAuth.mockReturnValue({ loading: true });
    const { container } = renderAt('/secret', PROTECTED);

    expect(screen.queryByText('SECRET CONTENT')).not.toBeInTheDocument();
    expect(screen.queryByText('LOGIN PAGE')).not.toBeInTheDocument();
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('redirects unauthenticated users to /login', () => {
    mockUseAuth.mockReturnValue({ loading: false, isAuthenticated: false });
    renderAt('/secret', PROTECTED);

    expect(screen.getByText('LOGIN PAGE')).toBeInTheDocument();
    expect(screen.queryByText('SECRET CONTENT')).not.toBeInTheDocument();
  });

  it('renders children for an authenticated user', () => {
    mockUseAuth.mockReturnValue({
      loading: false,
      isAuthenticated: true,
      user: { role: 'sales' },
      mustChangePassword: false,
    });
    renderAt('/secret', PROTECTED);

    expect(screen.getByText('SECRET CONTENT')).toBeInTheDocument();
  });

  it('forces a password change when mustChangePassword is set', () => {
    mockUseAuth.mockReturnValue({
      loading: false,
      isAuthenticated: true,
      user: { role: 'sales' },
      mustChangePassword: true,
    });
    renderAt('/secret', PROTECTED);

    expect(screen.getByText('CHANGE PASSWORD PAGE')).toBeInTheDocument();
    expect(screen.queryByText('SECRET CONTENT')).not.toBeInTheDocument();
  });

  it('redirects home when the required role is missing (org_agent → org_admin route)', () => {
    mockUseAuth.mockReturnValue(authed('org_agent'));
    renderAt('/admin', ADMIN_ONLY);

    expect(screen.getByText('HOME PAGE')).toBeInTheDocument();
    expect(screen.queryByText('ADMIN CONTENT')).not.toBeInTheDocument();
  });

  it('redirects home for an org_manager on an org_admin route', () => {
    mockUseAuth.mockReturnValue(authed('org_manager'));
    renderAt('/admin', ADMIN_ONLY);

    expect(screen.getByText('HOME PAGE')).toBeInTheDocument();
    expect(screen.queryByText('ADMIN CONTENT')).not.toBeInTheDocument();
  });

  it('renders children when the required role matches exactly', () => {
    mockUseAuth.mockReturnValue(authed('org_admin'));
    renderAt('/admin', ADMIN_ONLY);

    expect(screen.getByText('ADMIN CONTENT')).toBeInTheDocument();
  });

  it('admits a more-privileged role (platform_admin → org_admin route)', () => {
    mockUseAuth.mockReturnValue(authed('platform_admin'));
    renderAt('/admin', ADMIN_ONLY);

    expect(screen.getByText('ADMIN CONTENT')).toBeInTheDocument();
  });

  it('normalizes a legacy role string (admin satisfies org_admin route)', () => {
    mockUseAuth.mockReturnValue(authed('admin'));
    renderAt('/admin', ADMIN_ONLY);

    expect(screen.getByText('ADMIN CONTENT')).toBeInTheDocument();
  });
});
