import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { hasRole } from '../lib/roles';

/**
 * Gate a route behind authentication (and optionally a role).
 *
 * - Not logged in → redirect to /login (remembering where they were headed).
 * - Logged in but must change password → force /change-password.
 * - Logged in but lacking `requireRole` → send home.
 *
 * `requireRole` uses privilege-hierarchy semantics (see lib/roles.js): the user
 * must hold that role *or a more privileged one*. So `requireRole="org_admin"`
 * also admits `platform_admin`. Legacy role strings are normalized.
 */
export default function ProtectedRoute({ children, requireRole }) {
  const { isAuthenticated, user, mustChangePassword, loading } = useAuth();
  const location = useLocation();

  // Still restoring a persisted session — don't redirect to login yet, or a
  // refresh would bounce an authenticated user out before the profile loads.
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (mustChangePassword && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />;
  }

  if (requireRole && !hasRole(user?.role, requireRole)) {
    return <Navigate to="/" replace />;
  }

  return children;
}
