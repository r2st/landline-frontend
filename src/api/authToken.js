// In-memory token store.
//
// Access and refresh tokens are kept in module memory only — never in
// localStorage/sessionStorage — so a stolen persistent store can't leak them.
// The tradeoff is deliberate: a full page reload drops the tokens and the user
// must log in again.
//
// This module is the bridge between the axios interceptors (which are plain
// functions, outside React) and the AuthContext (which owns the real state and
// registers the refresh/logout handlers here).

let accessToken = null;
let refreshToken = null;
let refreshHandler = null; // async () => newAccessToken | null
let logoutHandler = null; // () => void

export const tokenStore = {
  getAccess: () => accessToken,
  getRefresh: () => refreshToken,

  // Set tokens. Pass refresh === undefined to leave the refresh token as-is.
  set(access, refresh) {
    accessToken = access ?? null;
    if (refresh !== undefined) refreshToken = refresh ?? null;
  },

  clear() {
    accessToken = null;
    refreshToken = null;
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
