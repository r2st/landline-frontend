import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * Gate a route behind authentication (and optionally a role).
 *
 * - Not logged in → redirect to /login (remembering where they were headed).
 * - Logged in but must change password → force /change-password.
 * - Logged in but lacking `requireRole` → send home.
 */
export default function ProtectedRoute({ children, requireRole }) {
  const { isAuthenticated, user, mustChangePassword } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (mustChangePassword && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />;
  }

  if (requireRole && user?.role !== requireRole) {
    return <Navigate to="/" replace />;
  }

  return children;
}
