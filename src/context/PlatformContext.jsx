import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { platformApi, queryClient } from '../api/client';
import { impersonationStore } from '../api/impersonation';
import { useAuth } from './AuthContext';

const PlatformContext = createContext(null);

/**
 * Owns platform-admin state: the "viewing as [org]" impersonation selection.
 *
 * Only a `platform_admin` can impersonate. When one switches to an org, we mint
 * a scoped token for a user in that org (via the backend impersonate endpoint),
 * stash it in the impersonation store — which the axios interceptor prefers over
 * the admin's own token — and invalidate all cached queries so every view
 * refetches under the org's scope. Exiting clears it and refetches as the admin.
 *
 * A non-platform-admin (or a logged-out user) can never be impersonating; the
 * store is force-cleared for them.
 */
export function PlatformProvider({ children }) {
  const { user } = useAuth();
  const isPlatformAdmin = user?.role === 'platform_admin';

  const [impersonation, setImpersonationState] = useState(() =>
    impersonationStore.get()
  );

  // Keep React state in sync with the store, including when the axios
  // interceptor clears it after a stale-token 401.
  useEffect(() => {
    return impersonationStore.subscribe((v) => setImpersonationState(v));
  }, []);

  // Non-platform-admins (or logged out) can never be impersonating.
  useEffect(() => {
    if (!isPlatformAdmin && impersonationStore.get()) {
      impersonationStore.clear();
    }
  }, [isPlatformAdmin]);

  const startImpersonation = useCallback(async (org) => {
    if (!org?.impersonatable_user_id) {
      throw new Error('This organization has no user to view as yet.');
    }
    const data = await platformApi.impersonate(org.impersonatable_user_id);
    impersonationStore.set({
      token: data.access_token,
      orgId: org.id,
      orgName: org.name,
      userId: data.user_id,
      userEmail: data.email,
    });
    // Every scoped view must refetch as the impersonated org user.
    queryClient.invalidateQueries();
    return data;
  }, []);

  const stopImpersonation = useCallback(() => {
    impersonationStore.clear();
    queryClient.invalidateQueries();
  }, []);

  const value = useMemo(
    () => ({
      isPlatformAdmin,
      impersonation, // null | { token, orgId, orgName, userId, userEmail }
      isImpersonating: !!impersonation,
      startImpersonation,
      stopImpersonation,
    }),
    [isPlatformAdmin, impersonation, startImpersonation, stopImpersonation]
  );

  return (
    <PlatformContext.Provider value={value}>{children}</PlatformContext.Provider>
  );
}

export function usePlatform() {
  const ctx = useContext(PlatformContext);
  if (ctx === null) {
    throw new Error('usePlatform must be used within a PlatformProvider');
  }
  return ctx;
}
