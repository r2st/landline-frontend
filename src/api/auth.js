import { api } from './client';

// Auth endpoints. Login/refresh set a `_skipAuthRefresh` marker so a 401 from
// them doesn't recurse through the token-refresh interceptor.
export const authApi = {
  login: (email, password) =>
    api
      .post('/auth/login', { email, password }, { _skipAuthRefresh: true })
      .then((r) => r.data),

  refresh: (refreshToken) =>
    api
      .post('/auth/refresh', { refresh_token: refreshToken }, { _skipAuthRefresh: true })
      .then((r) => r.data),

  changePassword: (currentPassword, newPassword) =>
    api
      .post('/auth/change-password', {
        current_password: currentPassword,
        new_password: newPassword,
      })
      .then((r) => r.data),

  me: () => api.get('/auth/me').then((r) => r.data),
};

// Admin user-management endpoints (admin role only).
export const adminUsersApi = {
  list: () => api.get('/admin/users').then((r) => r.data),
  create: (payload) => api.post('/admin/users', payload).then((r) => r.data),
  update: (id, payload) => api.patch(`/admin/users/${id}`, payload).then((r) => r.data),
  deactivate: (id) => api.delete(`/admin/users/${id}`).then((r) => r.data),
};
