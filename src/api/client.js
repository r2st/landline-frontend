import axios from 'axios';
import { QueryClient } from '@tanstack/react-query';
import { tokenStore } from './authToken';
import { viewAsStore } from './viewAs';

const baseURL = import.meta.env.VITE_API_URL
  ? `${import.meta.env.VITE_API_URL}/api/v1`
  : '/api/v1';

export const api = axios.create({
  baseURL,
  timeout: 30000,
});

// Attach auth to every request: a JWT bearer token when logged in, plus the
// legacy VITE_API_KEY (kept for backward compatibility during the transition).
api.interceptors.request.use((config) => {
  const token = tokenStore.getAccess();
  if (token) {
    config.headers['Authorization'] = `Bearer ${token}`;
  }
  const apiKey = import.meta.env.VITE_API_KEY;
  if (apiKey) {
    config.headers['X-API-Key'] = apiKey;
  }
  // Admin/manager "View as": scope reads to another user (or "all"). Harmless
  // on endpoints that don't support it — the backend ignores the extra param.
  const viewAs = viewAsStore.get();
  if (viewAs) {
    config.params = { ...(config.params || {}), view_as_user_id: viewAs };
  }
  return config;
});

// On a 401, transparently try one token refresh and replay the request. If the
// refresh fails (or this IS an auth request), clear the session so the app
// routes back to login.
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;

    if (
      status === 401 &&
      original &&
      !original._retry &&
      !original._skipAuthRefresh
    ) {
      original._retry = true;
      const newToken = await tokenStore.runRefresh();
      if (newToken) {
        original.headers = original.headers || {};
        original.headers['Authorization'] = `Bearer ${newToken}`;
        return api(original);
      }
      tokenStore.runLogout();
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
  leadQuality: (params) => api.get('/reports/lead-quality', { params }).then(r => r.data),
  // Daily autonomous-activity summary: latest + short history, or a specific date.
  dailySummary: (days = 30) => api.get('/reports/daily-summary', { params: { days } }).then(r => r.data),
  dailySummaryByDate: (date) => api.get(`/reports/daily-summary/${date}`).then(r => r.data),
};

// Deliverability — sender health + sending-domain SPF/DKIM/DMARC checks
export const deliverabilityApi = {
  senders: () => api.get('/deliverability/senders').then(r => r.data),
  domainAuth: (domain, dkimSelector) =>
    api.get('/deliverability/domain-auth', { params: { domain, dkim_selector: dkimSelector || undefined } }).then(r => r.data),
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

// ─── Knowledge Base (migration 027) ─────────────────────────────────────────
// Industry contacts, sales guideline docs, industry-vertical configs, and the
// AI sales-guidelines config. Hooks wrap each call in try/catch with empty-state
// fallbacks so the UI renders even before the backend ships.
export const knowledgeApi = {
  // Industry contacts
  getContacts: (params) => api.get('/knowledge/contacts', { params }).then(r => r.data),
  getContact: (id) => api.get(`/knowledge/contacts/${id}`).then(r => r.data),
  getIndustryCounts: () => api.get('/knowledge/contacts/industries').then(r => r.data),
  createContact: (data) => api.post('/knowledge/contacts', data).then(r => r.data),
  updateContact: (id, data) => api.put(`/knowledge/contacts/${id}`, data).then(r => r.data),
  deleteContact: (id) => api.delete(`/knowledge/contacts/${id}`).then(r => r.data),
  // Knowledge documents
  getDocuments: () => api.get('/knowledge/documents').then(r => r.data),
  getDocument: (slug) => api.get(`/knowledge/documents/${slug}`).then(r => r.data),
  getGuidelines: () => api.get('/knowledge/guidelines').then(r => r.data),
  getStrategy: () => api.get('/knowledge/strategy').then(r => r.data),
  // Industry verticals
  getIndustries: () => api.get('/knowledge/industries').then(r => r.data),
  getIndustry: (key) => api.get(`/knowledge/industries/${key}`).then(r => r.data),
  // AI sales-guidelines config
  getAiGuidelines: () => api.get('/knowledge/ai-guidelines').then(r => r.data),
};

// ─── Investor CRM (migration 029) ───────────────────────────────────────────
// Investor pipeline: firms, contacts, interaction timeline, data-room documents,
// pipeline funnel stats, and AI-drafted outreach. Hooks wrap each call in
// try/catch with graceful empty states so the UI renders before the backend ships.
export const investorsApi = {
  // Investors
  getAll: (params) => api.get('/investors/', { params }).then(r => r.data),
  getById: (id) => api.get(`/investors/${id}`).then(r => r.data),
  create: (data) => api.post('/investors/', data).then(r => r.data),
  update: (id, data) => api.patch(`/investors/${id}`, data).then(r => r.data),
  remove: (id) => api.delete(`/investors/${id}`).then(r => r.data),
  // Move an investor along the outreach pipeline (status progression).
  updateStatus: (id, status) => api.patch(`/investors/${id}/status`, { status }).then(r => r.data),
  // Pipeline funnel counts by status (+ stage breakdown).
  getPipeline: (params) => api.get('/investors/pipeline', { params }).then(r => r.data),
  // Interaction timeline (emails, calls, meetings, LinkedIn messages).
  getInteractions: (id) => api.get(`/investors/${id}/interactions`).then(r => r.data),
  createInteraction: (id, data) => api.post(`/investors/${id}/interactions`, data).then(r => r.data),
  removeInteraction: (id, interactionId) => api.delete(`/investors/${id}/interactions/${interactionId}`).then(r => r.data),
  // Data-room documents (pitch deck, financials, etc.).
  getDocuments: (id) => api.get(`/investors/${id}/documents`).then(r => r.data),
  createDocument: (id, data) => api.post(`/investors/${id}/documents`, data).then(r => r.data),
  removeDocument: (id, documentId) => api.delete(`/investors/${id}/documents/${documentId}`).then(r => r.data),
  // AI-drafted personalised outreach email for this investor.
  generateEmail: (id, data) => api.post(`/investors/${id}/generate-email`, data).then(r => r.data),
};

// ─── Cold Calling (migration 028) ───────────────────────────────────────────
// Call task queue, per-task briefings, industry scripts, notifications, and the
// AI queue generator.
export const callsApi = {
  // Call tasks
  getTasks: (params) => api.get('/calls/tasks', { params }).then(r => r.data),
  getToday: () => api.get('/calls/tasks/today').then(r => r.data),
  createTask: (data) => api.post('/calls/tasks', data).then(r => r.data),
  updateTask: (id, data) => api.put(`/calls/tasks/${id}`, data).then(r => r.data),
  getBriefing: (id) => api.get(`/calls/tasks/${id}/briefing`).then(r => r.data),
  // Scripts
  getScripts: () => api.get('/calls/scripts').then(r => r.data),
  getScript: (industry) => api.get(`/calls/scripts/${industry}`).then(r => r.data),
  saveScript: (data) => api.post('/calls/scripts', data).then(r => r.data),
  // AI-generated custom script for a call task. GET caches + auto-generates;
  // pass { regenerate: true } to force a fresh personalised script.
  // pass { framework: 'challenger' } to request a specific sales methodology.
  getCustomScript: (id, params) =>
    api.get(`/calls/tasks/${id}/custom-script`, { params }).then(r => r.data),
  generateCustomScript: (data) => api.post('/calls/scripts/generate', data).then(r => r.data),
  // Notifications
  getNotifications: () => api.get('/calls/notifications').then(r => r.data),
  markNotificationRead: (id) => api.put(`/calls/notifications/${id}/read`).then(r => r.data),
  // AI queue generation
  generateQueue: () => api.post('/calls/queue/generate').then(r => r.data),
  // Analytics — objection trends and framework effectiveness (sales-book enhancements)
  getObjectionTrends: (params) => api.get('/calls/analytics/objections', { params }).then(r => r.data),
  getFrameworkStats: (params) => api.get('/calls/analytics/frameworks', { params }).then(r => r.data),
};

// --- Sentiment Analysis ---
export const sentimentApi = {
  analyze: (data) => api.post('/sentiment/analyze', data),
  analyzeReply: (replyId) => api.post(`/sentiment/analyze-reply/${replyId}`),
  getScores: (params) => api.get('/sentiment/scores', { params }),
  getSummary: (days = 30) => api.get('/sentiment/summary', { params: { days } }),
};

// --- Email Testing ---
export const emailTestingApi = {
  getScenarios: () => api.get('/email-testing/scenarios'),
  getPersonas: () => api.get('/email-testing/personas'),
  createExchange: (data) => api.post('/email-testing/exchanges', data),
  continueExchange: (id, data) => api.post(`/email-testing/exchanges/${id}/continue`, data),
  getExchanges: (params) => api.get('/email-testing/exchanges', { params }),
  getExchange: (id) => api.get(`/email-testing/exchanges/${id}`),
  deleteExchange: (id) => api.delete(`/email-testing/exchanges/${id}`),
};
