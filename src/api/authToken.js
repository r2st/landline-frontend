// Token store with localStorage persistence.
//
// Access and refresh tokens are mirrored into localStorage so a full page
// reload keeps the user logged in. An in-memory copy is kept as the fast path
// (and so the axios interceptors, which are plain functions outside React, can
// read the current token synchronously). The two are kept in sync on every
// set/clear.
//
// This module is the bridge between the axios interceptors (which register no
// state of their own) and the AuthContext (which owns the React state and
// registers the refresh/logout handlers here).

const ACCESS_KEY = 'll_access_token';
const REFRESH_KEY = 'll_refresh_token';

// Guard localStorage access — it can throw (private mode, disabled storage) or
// be undefined during SSR/tests. Fall back to memory-only in that case.
function safeGet(key) {
  try {
    return typeof localStorage !== 'undefined' ? localStorage.getItem(key) : null;
  } catch {
    return null;
  }
}

function safeSet(key, value) {
  try {
    if (typeof localStorage === 'undefined') return;
    if (value == null) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
  } catch {
    /* ignore — memory copy still works for this session */
  }
}

// Hydrate from localStorage at module load so a reload starts authenticated.
let accessToken = safeGet(ACCESS_KEY);
let refreshToken = safeGet(REFRESH_KEY);
let refreshHandler = null; // async () => newAccessToken | null
let logoutHandler = null; // () => void

export const tokenStore = {
  getAccess: () => accessToken,
  getRefresh: () => refreshToken,

  // True when we have any persisted credential to attempt a session restore.
  hasSession: () => !!(accessToken || refreshToken),

  // Set tokens. Pass refresh === undefined to leave the refresh token as-is.
  set(access, refresh) {
    accessToken = access ?? null;
    safeSet(ACCESS_KEY, accessToken);
    if (refresh !== undefined) {
      refreshToken = refresh ?? null;
      safeSet(REFRESH_KEY, refreshToken);
    }
  },

  clear() {
    accessToken = null;
    refreshToken = null;
    safeSet(ACCESS_KEY, null);
    safeSet(REFRESH_KEY, null);
  },

  setRefreshHandler(fn) {
    refreshHandler = fn;
  },
  setLogoutHandler(fn) {
    logoutHandler = fn;
  },

  // Called by the response interceptor on a 401. Returns a fresh access token
  // or null if refresh is impossible.
  runRefresh() {
    return refreshHandler ? refreshHandler() : Promise.resolve(null);
  },

  runLogout() {
    if (logoutHandler) logoutHandler();
  },
};
