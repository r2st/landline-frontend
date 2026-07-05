import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { authApi } from '../api/auth';
import { queryClient } from '../api/client';
import { viewAsStore } from '../api/viewAs';
import { useAuth } from './AuthContext';

const ViewAsContext = createContext(null);

const PRIVILEGED_ROLES = ['admin', 'manager'];

/**
 * Owns the admin/manager "View as" selection.
 *
 * Regular users never impersonate — the store is force-cleared and no team
 * list is fetched. Admins/managers can switch the active scope to any user or
 * "all"; changing it pushes to the axios interceptor store and invalidates all
 * cached queries so every view refetches under the new scope.
 */
export function ViewAsProvider({ children }) {
  const { user, isAuthenticated } = useAuth();
  const isPrivileged = !!user && PRIVILEGED_ROLES.includes(user.role);

  // `null` = own data, 'all' = everyone, or a user id string.
  const [viewAs, setViewAsState] = useState(() => viewAsStore.get());
  const [members, setMembers] = useState([]);

  // Non-privileged users (or logged out) can never be in an impersonated scope.
  useEffect(() => {
    if (!isPrivileged && viewAsStore.get()) {
      viewAsStore.clear();
      setViewAsState(null);
    }
  }, [isPrivileged]);

  // Load the team list once for the switcher.
  useEffect(() => {
    let cancelled = false;
    if (isPrivileged && isAuthenticated) {
      authApi
        .teamMembers()
        .then((list) => {
          if (!cancelled) setMembers(Array.isArray(list) ? list : []);
        })
        .catch(() => {
          if (!cancelled) setMembers([]);
        });
    } else {
      setMembers([]);
    }
    return () => {
      cancelled = true;
    };
  }, [isPrivileged, isAuthenticated]);

  const setViewAs = useCallback(
    (next) => {
      const normalized = next || null;
      viewAsStore.set(normalized);
      setViewAsState(normalized);
      // Every scoped view must refetch under the new scope.
      queryClient.invalidateQueries();
    },
    []
  );

  const value = useMemo(
    () => ({
      isPrivileged,
      viewAs, // null | 'all' | userId
      setViewAs,
      members, // [{ id, name, email, role }]
      // Human label for the current selection.
      currentLabel:
        viewAs === null
          ? 'My data'
          : viewAs === 'all'
            ? 'All users'
            : members.find((m) => m.id === viewAs)?.name || 'Selected user',
    }),
    [isPrivileged, viewAs, setViewAs, members]
  );

  return <ViewAsContext.Provider value={value}>{children}</ViewAsContext.Provider>;
}

export function useViewAs() {
  const ctx = useContext(ViewAsContext);
  if (ctx === null) {
    throw new Error('useViewAs must be used within a ViewAsProvider');
  }
  return ctx;
}
