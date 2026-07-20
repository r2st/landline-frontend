// Global impersonation store for the platform-admin org switcher.
//
// When a platform admin "views as" an organization, the backend mints a JWT
// scoped to a user in that org (POST /platform/impersonate/:user_id). We hold
// that token here, outside React, so the plain axios request interceptor can
// prefer it over the admin's own bearer token — every API read then runs as the
// impersonated user and is naturally scoped to their org.
//
// The admin's real session (in `tokenStore`) is left untouched, so exiting
// impersonation restores the platform view without re-authenticating.
//
//   null                              → not impersonating (admin's own session)
//   { token, orgId, orgName, userId } → viewing as that org
//
// Like the token / view-as stores, the PlatformContext owns the React state and
// pushes updates here; the interceptor only reads.

const KEY = 'landline_impersonation';

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

let value = load();
const listeners = new Set();

export const impersonationStore = {
  get: () => value,

  // The scoped bearer token to send, or null when not impersonating.
  getToken: () => value?.token || null,

  set(next) {
    value = next || null;
    try {
      if (value) localStorage.setItem(KEY, JSON.stringify(value));
      else localStorage.removeItem(KEY);
    } catch {
      /* ignore storage failures (private mode, etc.) */
    }
    listeners.forEach((fn) => fn(value));
  },

  clear() {
    this.set(null);
  },

  subscribe(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};
