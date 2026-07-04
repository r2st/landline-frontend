import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { authApi } from '../api/auth';
import { tokenStore } from '../api/authToken';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [mustChangePassword, setMustChangePassword] = useState(false);

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

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: !!user,
      isAdmin: user?.role === 'admin',
      mustChangePassword,
      login,
      logout,
      changePassword,
    }),
    [user, mustChangePassword, login, logout, changePassword]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (ctx === null) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
