// Global "View as" store for the admin/manager data switcher.
//
// Holds the currently-selected scope so the axios request interceptor can
// attach `?view_as_user_id` to every request without each hook threading it
// through. The backend only honours it for admins/managers on user-scoped
// endpoints and ignores it everywhere else, so attaching it globally is safe.
//
//   null      → the caller's own data (no param sent)
//   'all'     → every user's data (admins/managers only)
//   '<uuid>'  → a specific user's data (admins/managers only)
//
// Like the token store, this lives outside React so the plain axios interceptor
// can read it; the ViewAsContext owns the real state and pushes updates here.

const KEY = 'landline_view_as';

let value = null;
try {
  value = localStorage.getItem(KEY) || null;
} catch {
  value = null;
}

const listeners = new Set();

export const viewAsStore = {
  get: () => value,

  set(next) {
    value = next || null;
    try {
      if (value) localStorage.setItem(KEY, value);
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
