import { api } from './client';

// Organization self-service management (Phase 3). The backend resolves the org
// from the caller's JWT, so none of these take an org id — they always act on
// the current user's own organization.
export const orgApi = {
  // Settings.
  getSettings: () => api.get('/org/settings').then((r) => r.data),
  updateSettings: (payload) => api.put('/org/settings', payload).then((r) => r.data),

  // Team members.
  listMembers: () => api.get('/org/members').then((r) => r.data),
  invite: (payload) => api.post('/org/members/invite', payload).then((r) => r.data),
  changeRole: (id, role) => api.put(`/org/members/${id}/role`, { role }).then((r) => r.data),
  remove: (id) => api.delete(`/org/members/${id}`).then((r) => r.data),

  // Usage.
  getUsage: () => api.get('/org/usage').then((r) => r.data),
};

// Roles that can perform org-management writes. Legacy ``admin`` is included so
// a not-yet-migrated token still grants access.
const WRITE_ROLES = new Set(['org_admin', 'platform_admin', 'admin']);

// Whether a user (from AuthContext) may perform org_admin write actions.
export function canManageOrg(user) {
  return !!user && WRITE_ROLES.has(user.role);
}
