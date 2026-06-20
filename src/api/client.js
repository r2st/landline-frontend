import axios from 'axios';
import { QueryClient } from '@tanstack/react-query';

const baseURL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api/v1`
  : '/api/v1';

export const api = axios.create({
  baseURL,
  timeout: 10000,
});

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export const companiesApi = {
  getAll: (params) => api.get('/companies/', { params }).then(r => r.data),
  getById: (id) => api.get(`/companies/${id}`).then(r => r.data),
  create: (data) => api.post('/companies/', data).then(r => r.data),
  update: (id, data) => api.patch(`/companies/${id}`, data).then(r => r.data),
  delete: (id) => api.delete(`/companies/${id}`).then(r => r.data),
  getScores: (id) => api.get(`/companies/${id}/scores`).then(r => r.data),
  importCSV: (formData) => api.post('/import-export/import/csv', formData, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data),
  score: (id) => api.post('/leads/score', { company_id: id }).then(r => r.data),
};

export const pipelineApi = {
  getPipeline: (params) => api.get('/leads/pipeline', { params }).then(r => r.data),
  transitionStage: (id, stage) => api.patch(`/companies/${id}/stage`, { stage }).then(r => r.data),
};

export const dashboardApi = {
  getMetrics: () => api.get('/dashboard/overview').then(r => r.data),
  getRecentActivity: (params) => api.get('/dashboard/recent-activity', { params }).then(r => r.data),
  getTopLeads: (params) => api.get('/dashboard/top-leads', { params }).then(r => r.data),
  getIndustry: (params) => api.get('/dashboard/industry', { params }).then(r => r.data),
  getEmailTrends: (params) => api.get('/dashboard/email-trends', { params }).then(r => r.data),
};

export const followUpsApi = {
  list: (params) => api.get('/follow-ups', { params }).then(r => r.data),
  create: (data) => api.post('/follow-ups', data).then(r => r.data),
  update: (id, data) => api.patch(`/follow-ups/${id}`, data).then(r => r.data),
  remove: (id) => api.delete(`/follow-ups/${id}`).then(r => r.data),
  staleContacts: (params) => api.get('/follow-ups/stale-contacts', { params }).then(r => r.data),
};

export const outreachApi = {
  getSequences: () => api.get('/outreach/sequences').then(r => r.data),
  createSequence: (data) => api.post('/outreach/sequences', data).then(r => r.data),
  enrollCompany: (data) => api.post('/outreach/enrollments', data).then(r => r.data),
  getEvents: (params) => api.get('/outreach/events', { params }).then(r => r.data),
};

export const contactsApi = {
  getAll: (params) => api.get('/contacts/', { params }).then(r => r.data),
  getById: (id) => api.get(`/contacts/${id}`).then(r => r.data),
  getByCompany: (companyId) => api.get(`/contacts/company/${companyId}`).then(r => r.data),
  create: (data) => api.post('/contacts/', data).then(r => r.data),
  update: (id, data) => api.patch(`/contacts/${id}`, data).then(r => r.data),
  remove: (id) => api.delete(`/contacts/${id}`).then(r => r.data),
  quickAdd: (data) => api.post('/contacts/quick-add', data).then(r => r.data),
};

export const emailApi = {
  getTemplates: () => api.get('/email-templates').then(r => r.data),
  createTemplate: (data) => api.post('/email-templates', data).then(r => r.data),
  updateTemplate: (id, data) => api.put(`/email-templates/${id}`, data).then(r => r.data),
  deleteTemplate: (id) => api.delete(`/email-templates/${id}`).then(r => r.data),
  setDefault: (id) => api.post(`/email-templates/${id}/set-default`).then(r => r.data),
  preview: (data) => api.post('/email-templates/preview', data).then(r => r.data),
  compose: (data) => api.post('/email-compose', data).then(r => r.data),
  getSends: (params) => api.get('/email-sends', { params }).then(r => r.data),
};

// Gmail OAuth — connect a Google account so outreach sends from the user's own
// address (with Gmail's SPF/DKIM/DMARC, so it stays out of spam).
export const gmailApi = {
  status: () => api.get('/gmail/status').then(r => r.data),
  authorize: () => api.get('/gmail/oauth/authorize').then(r => r.data),
  setActive: (id) => api.post(`/gmail/accounts/${id}/set-active`).then(r => r.data),
  disconnect: (id) => api.delete(`/gmail/accounts/${id}`).then(r => r.data),
};
