import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authApi } from '../api/auth';
import { tokenStore } from '../api/authToken';
import { isManager, isOrgAdmin, isPlatformAdmin } from '../lib/roles';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  // Start in a "restoring" state whenever a persisted token exists, so gated
  // routes wait for the profile fetch instead of flashing the login page.
  const [loading, setLoading] = useState(() => tokenStore.hasSession());

  const clearSession = useCallback(() => {
    tokenStore.clear();
    setUser(null);
    setMustChangePassword(false);
  }, []);

  const login = useCallback(async (email, password) => {
    const data = await authApi.login(email, password);
    tokenStore.set(data.access_token, data.refresh_token);
    setMustChangePassword(!!data.must_change_password);
    const profile = await authApi.me();
    setUser(profile);
    return data;
  }, []);

  const logout = useCallback(() => {
    clearSession();
  }, [clearSession]);

  const changePassword = useCallback(async (currentPassword, newPassword) => {
    await authApi.changePassword(currentPassword, newPassword);
    setMustChangePassword(false);
  }, []);

  // Register the refresh + logout handlers the axios interceptor calls on 401.
  useEffect(() => {
    tokenStore.setRefreshHandler(async () => {
      const rt = tokenStore.getRefresh();
      if (!rt) return null;
      try {
        const data = await authApi.refresh(rt);
        tokenStore.set(data.access_token, data.refresh_token);
        return data.access_token;
      } catch {
        return null;
      }
    });
    tokenStore.setLogoutHandler(() => clearSession());
  }, [clearSession]);

  // On first mount, restore the session from a persisted token. The request
  // interceptor attaches the (possibly stale) access token; if it's expired,
  // the 401 interceptor transparently refreshes via the handler above. Runs
  // after the handler-registration effect so that refresh path is wired up.
  useEffect(() => {
    let cancelled = false;
    if (!tokenStore.hasSession()) {
      setLoading(false);
      return;
    }
    (async () => {
      try {
        const profile = await authApi.me();
        if (!cancelled) setUser(profile);
      } catch {
        // Token invalid/expired and refresh failed — drop the dead session.
        if (!cancelled) clearSession();
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const value = useMemo(() => {
    const role = user?.role;
    // Role flags mirror the backend hierarchy (see lib/roles.js): a higher role
    // always satisfies a lower-role check. Legacy role strings are normalized.
    const admin = isOrgAdmin(role);
    return {
      user,
      isAuthenticated: !!user,
      isAdmin: admin,
      isPlatformAdmin: isPlatformAdmin(role),
      isManager: isManager(role),
      canManageOrg: admin,
      mustChangePassword,
      loading,
      login,
      logout,
      changePassword,
    };
  }, [user, mustChangePassword, loading, login, logout, changePassword]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (ctx === null) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
