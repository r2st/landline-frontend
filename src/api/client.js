import axios from 'axios';
import { QueryClient } from '@tanstack/react-query';

const baseURL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api/v1`
  : '/api/v1';

export const api = axios.create({
  baseURL,
  timeout: 30000,
});

// Add API key to all requests
api.interceptors.request.use((config) => {
  const apiKey = import.meta.env.VITE_API_KEY;
  if (apiKey) {
    config.headers['X-API-Key'] = apiKey;
  }
  return config;
});

// Handle auth errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.error('API authentication failed. Check your API key.');
    }
    return Promise.reject(error);
  }
);

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
  getContactGrowth: (params) => api.get('/dashboard/contact-growth', { params }).then(r => r.data),
  getKPIs: () => api.get('/dashboard/kpis').then(r => r.data),
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
  deleteSequence: (id) => api.delete(`/outreach/sequences/${id}`).then(r => r.data),
  // The enrollment endpoint enrolls a single contact (contact_id + sequence_id).
  enrollContact: (data) => api.post('/outreach/enrollments', data).then(r => r.data),
  getEvents: (params) => api.get('/outreach/events', { params }).then(r => r.data),
  updateSequenceStatus: (id, status) => api.patch(`/sequences/${id}/status`, { status }).then(r => r.data),
  enrollBatch: (sequenceId, contactIds) => api.post(`/sequences/${sequenceId}/enroll`, { contact_ids: contactIds }).then(r => r.data),
};

export const contactsApi = {
  getAll: (params) => api.get('/contacts/', { params }).then(r => r.data),
  getById: (id) => api.get(`/contacts/${id}`).then(r => r.data),
  getByCompany: (companyId) => api.get(`/contacts/company/${companyId}`).then(r => r.data),
  create: (data) => api.post('/contacts/', data).then(r => r.data),
  update: (id, data) => api.patch(`/contacts/${id}`, data).then(r => r.data),
  remove: (id) => api.delete(`/contacts/${id}`).then(r => r.data),
  quickAdd: (data) => api.post('/contacts/quick-add', data).then(r => r.data),
  // Find existing contacts that look like the one about to be saved (email / phone / name).
  checkDuplicate: (params) => api.get('/contacts/check-duplicate', { params }).then(r => r.data),
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
  sendTest: (data) => api.post('/email-templates/send-test', data).then(r => r.data),
  getABStats: (templateId) => api.get(`/email-sends/ab-stats`, { params: { template_id: templateId } }).then(r => r.data),
  getAnalytics: () => api.get('/email-sends/analytics').then(r => r.data),
};

export const discoveryApi = {
  searchCompanies: (data) => api.post('/discovery/search-companies', data).then(r => r.data),
  enrichCompany: (id, data) => api.post(`/discovery/enrich/${id}`, data).then(r => r.data),
};

export const aiApi = {
  generateEmail: (data) => api.post('/ai/generate-email', data).then(r => r.data),
  improveEmail: (data) => api.post('/ai/improve-email', data).then(r => r.data),
  scoreLead: (data) => api.post('/ai/score-lead', data).then(r => r.data),
  analyzeCompany: (id) => api.post(`/ai/analyze-company/${id}`).then(r => r.data),
  generateFollowup: (data) => api.post('/ai/generate-followup', data).then(r => r.data),
  scanCard: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post('/ai/scan-card', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 30000,
    }).then(r => r.data);
  },
};

export const groupsApi = {
  getAll: () => api.get('/groups').then(r => r.data),
  create: (data) => api.post('/groups', data).then(r => r.data),
  update: (id, data) => api.patch(`/groups/${id}`, data).then(r => r.data),
  remove: (id) => api.delete(`/groups/${id}`).then(r => r.data),
  addMembers: (id, companyIds) => api.post(`/groups/${id}/members`, { company_ids: companyIds }).then(r => r.data),
  removeMembers: (id, companyIds) => api.delete(`/groups/${id}/members`, { data: { company_ids: companyIds } }).then(r => r.data),
  autoGroupByIndustry: () => api.post('/groups/auto-group-by-industry').then(r => r.data),
  autoGroupByCountry: () => api.post('/groups/auto-group-by-country').then(r => r.data),
  autoGroupByStage: () => api.post('/groups/auto-group-by-stage').then(r => r.data),
};

export const sendLimiterApi = {
  getStats: () => api.get('/discovery/send-stats').then(r => r.data),
};

export const newsApi = {
  getAll: (params) => api.get('/news', { params }).then(r => r.data),
  checkCompany: (id) => api.post(`/news/check/${id}`).then(r => r.data),
  checkAll: (limit) => api.post(`/news/check-all?limit=${limit || 5}`).then(r => r.data),
  markActioned: (id) => api.patch(`/news/${id}/action`).then(r => r.data),
};

export const tacticsApi = {
  discoverExecutives: (companyId) => api.post(`/tactics/discover-executives/${companyId}`).then(r => r.data),
  linkedinDraft: (data) => api.post('/tactics/linkedin-draft', data).then(r => r.data),
  phoneScript: (data) => api.post('/tactics/phone-script', data).then(r => r.data),
  referralDraft: (data) => api.post('/tactics/referral-draft', data).then(r => r.data),
  eventOutreach: (data) => api.post('/tactics/event-outreach', data).then(r => r.data),
  multiTouchPlan: (companyId) => api.post(`/tactics/multi-touch-plan/${companyId}`).then(r => r.data),
};

// ─── Client management ──────────────────────────────────────────────────────
// These hit the in-progress client-lifecycle backend. Hooks wrap every call in
// try/catch with graceful empty states so the UI renders before the API ships.

export const clientsApi = {
  // Aggregate stats + chart series for the client dashboard.
  getOverview: () => api.get('/clients/overview').then(r => r.data),
  // List of companies in the client stage, enriched with health/deal/task data.
  list: (params) => api.get('/clients', { params }).then(r => r.data),
};

export const dealsApi = {
  list: (params) => api.get('/deals', { params }).then(r => r.data),
  getByCompany: (companyId) => api.get('/deals', { params: { company_id: companyId } }).then(r => r.data),
  getById: (id) => api.get(`/deals/${id}`).then(r => r.data),
  create: (data) => api.post('/deals', data).then(r => r.data),
  update: (id, data) => api.patch(`/deals/${id}`, data).then(r => r.data),
  remove: (id) => api.delete(`/deals/${id}`).then(r => r.data),
  metrics: () => api.get('/deals/metrics').then(r => r.data),
  stages: () => api.get('/deals/stages').then(r => r.data),
  addNote: (id, data) => api.post(`/deals/${id}/notes`, data).then(r => r.data),
  listNotes: (id) => api.get(`/deals/${id}/notes`).then(r => r.data),
  listActivity: (id) => api.get(`/deals/${id}/activity`).then(r => r.data),
};

export const tasksApi = {
  list: (params) => api.get('/tasks', { params }).then(r => r.data),
  create: (data) => api.post('/tasks', data).then(r => r.data),
  update: (id, data) => api.patch(`/tasks/${id}`, data).then(r => r.data),
  remove: (id) => api.delete(`/tasks/${id}`).then(r => r.data),
};

export const interactionsApi = {
  list: (params) => api.get('/interactions', { params }).then(r => r.data),
  getByCompany: (companyId) => api.get('/interactions', { params: { company_id: companyId } }).then(r => r.data),
  create: (data) => api.post('/interactions', data).then(r => r.data),
  update: (id, data) => api.patch(`/interactions/${id}`, data).then(r => r.data),
  remove: (id) => api.delete(`/interactions/${id}`).then(r => r.data),
};

export const healthApi = {
  getForCompany: (id) => api.get(`/companies/${id}/health`).then(r => r.data),
};

export const reportsApi = {
  retention: (params) => api.get('/reports/retention', { params }).then(r => r.data),
  revenueFunnel: (params) => api.get('/reports/revenue-funnel', { params }).then(r => r.data),
  activityHeatmap: (params) => api.get('/reports/activity-heatmap', { params }).then(r => r.data),
  topClients: (params) => api.get('/reports/top-clients', { params }).then(r => r.data),
  emailPerformance: (params) => api.get('/reports/email-performance', { params }).then(r => r.data),
  pipelineAnalytics: (params) => api.get('/reports/pipeline-analytics', { params }).then(r => r.data),
};

// Email communication — unified inbox, lead threads, reply sending
export const emailHistoryApi = {
  getLeadEmails: (companyId, params) => api.get(`/emails/lead/${companyId}`, { params }).then(r => r.data),
  getInbox: (params) => api.get('/emails/inbox', { params }).then(r => r.data),
  getThread: (threadId) => api.get(`/emails/thread/${encodeURIComponent(threadId)}`).then(r => r.data),
  sendReply: (emailId, data) => api.post(`/emails/reply/${emailId}`, data).then(r => r.data),
  triggerSync: () => api.post('/emails/sync').then(r => r.data),
};

// Gmail OAuth — connect a Google account so outreach sends from the user's own
// address (with Gmail's SPF/DKIM/DMARC, so it stays out of spam).
export const gmailApi = {
  status: () => api.get('/gmail/status').then(r => r.data),
  accounts: () => api.get('/gmail/accounts').then(r => r.data),
  authorize: () => api.get('/gmail/oauth/authorize').then(r => r.data),
  setActive: (id) => api.post(`/gmail/accounts/${id}/set-active`).then(r => r.data),
  toggleSending: (id, enabled) => api.post(`/gmail/accounts/${id}/toggle-sending`, { sending_enabled: enabled }).then(r => r.data),
  disconnect: (id) => api.delete(`/gmail/accounts/${id}`).then(r => r.data),
  purge: (id) => api.delete(`/gmail/accounts/${id}/purge`).then(r => r.data),
  testSend: (id, toEmail) => api.post(`/gmail/accounts/${id}/test`, { to_email: toEmail || null }).then(r => r.data),
};

export const smtpApi = {
  accounts: () => api.get('/smtp/accounts').then(r => r.data),
  add: (payload) => api.post('/smtp/accounts', payload).then(r => r.data),
  update: (id, payload) => api.put(`/smtp/accounts/${id}`, payload).then(r => r.data),
  remove: (id) => api.delete(`/smtp/accounts/${id}`).then(r => r.data),
  setActive: (id) => api.post(`/smtp/accounts/${id}/set-active`).then(r => r.data),
  toggleSending: (id, enabled) => api.post(`/smtp/accounts/${id}/toggle-sending`, { sending_enabled: enabled }).then(r => r.data),
  verify: (id) => api.post(`/smtp/accounts/${id}/verify`).then(r => r.data),
  testSend: (id, toEmail) => api.post(`/smtp/accounts/${id}/test`, { to_email: toEmail || null }).then(r => r.data),
};
