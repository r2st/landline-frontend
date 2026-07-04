import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';

/**
 * The currently authenticated user, or null when running in API-key / anonymous
 * mode (no Bearer token). Resolves the profile from the backend `/auth/me`
 * endpoint and falls back to a locally cached user so the greeting can render a
 * name immediately after login, before the network round-trip completes.
 *
 * This is intentionally self-contained (no AuthContext dependency) so it works
 * whether or not the login UI is wired up.
 */
function readCachedUser() {
  try {
    const raw =
      localStorage.getItem('landline_user') || localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function useCurrentUser() {
  const cached = readCachedUser();

  const query = useQuery({
    queryKey: ['current-user'],
    queryFn: async () => {
      try {
        const { data } = await api.get('/auth/me');
        return data;
      } catch {
        // 401 (no token) or offline — greet anonymously.
        return null;
      }
    },
    retry: false,
    staleTime: 5 * 60 * 1000,
    initialData: cached || undefined,
  });

  return query.data || null;
}

// Re-exported for convenience; the implementation lives in the pure,
// unit-tested greeting module.
export { firstNameOf } from '../lib/greeting';
