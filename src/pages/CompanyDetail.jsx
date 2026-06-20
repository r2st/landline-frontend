import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Globe,
  Users,
  Building2,
  MapPin,
  Target,
  RefreshCw,
  Send,
  Eye,
  Mail,
  Clock,
  ArrowRight,
  Plus,
  ExternalLink,
  FileText,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Brain,
  Wand2,
  Copy as CopyIcon,
  Loader2,
  Newspaper,
  Tag,
  CheckCircle2,
} from 'lucide-react';
import ScoreBadge from '../components/ScoreBadge';
import StageSelector from '../components/StageSelector';
import ContactList from '../components/ContactList';
import EmptyState from '../components/EmptyState';
import { useCompany, useUpdateCompany, useScoreCompany, useCompanyScores } from '../hooks/useCompanies';
import { useCompanyContacts, useCreateContact } from '../hooks/useContacts';
import { useTransitionStage } from '../hooks/usePipeline';
import { useOutreachEvents, useSequences, useEnrollCompany } from '../hooks/useOutreach';
import { useEnrichCompany } from '../hooks/useDiscovery';
import { useAnalyzeCompany, useGenerateEmail } from '../hooks/useAI';
import { useNews, useCheckCompanyNews, useMarkActioned } from '../hooks/useNews';
import { STAGE_LABELS, STAGE_COLORS, SOURCE_LABELS } from '../lib/constants';
import { formatDate, formatNumber, getScoreColor, getScoreLabel, timeAgo, cn } from '../lib/utils';

// Map a LeadScore record's sub-scores into displayable factor rows.
function scoreToFactors(score) {
  if (!score) return [];
  const rows = [
    { label: 'Industry Match', value: score.industry_score, description: 'Target industry alignment' },
    { label: 'Company Size', value: score.size_score, description: 'Based on employee count' },
    { label: 'Location Fit', value: score.location_score, description: 'Within target geography' },
    { label: 'Engagement', value: score.engagement_score, description: 'Outreach activity signals' },
  ];
  return rows.filter((r) => r.value != null);
}

const eventIcons = {
  email_sent: Send,
  email_opened: Eye,
  email_replied: Mail,
  stage_changed: ArrowRight,
  lead_scored: Target,
  contact_added: Plus,
};

const eventColors = {
  email_sent: 'text-purple-500 bg-purple-50',
  email_opened: 'text-indigo-500 bg-indigo-50',
  email_replied: 'text-green-500 bg-green-50',
  stage_changed: 'text-blue-500 bg-blue-50',
  lead_scored: 'text-yellow-500 bg-yellow-50',
  contact_added: 'text-teal-500 bg-teal-50',
};

function TabButton({ label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex-shrink-0 whitespace-nowrap border-b-2 px-4 py-2.5 text-sm font-medium transition-colors',
        active
          ? 'border-blue-500 text-blue-600'
          : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
      )}
    >
      {label}
    </button>
  );
}

function AddContactForm({ onAdd }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    title: '',
    phone: '',
    linkedin_url: '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.first_name.trim() || !form.last_name.trim()) return;
    onAdd(form);
    setForm({ first_name: '', last_name: '', email: '', title: '', phone: '', linkedin_url: '' });
    setOpen(false);
  };

  return (
    <div className="border-t border-gray-200">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        <span className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Add Contact
        </span>
        {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
      </button>
      {open && (
        <form onSubmit={handleSubmit} className="space-y-3 px-4 pb-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <input type="text" required placeholder="First name *" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
            <input type="text" required placeholder="Last name *" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
            <input type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
            <input type="text" placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
            <input type="tel" placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
            <input type="url" placeholder="LinkedIn URL" value={form.linkedin_url} onChange={(e) => setForm({ ...form, linkedin_url: e.target.value })} className="rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setOpen(false)} className="rounded-md border border-gray-300 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
            <button type="submit" className="rounded-md bg-blue-500 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-600">Add</button>
          </div>
        </form>
      )}
    </div>
  );
}

export default function CompanyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('contacts');
  const [enrollDropdownOpen, setEnrollDropdownOpen] = useState(false);

  const { data: company, isLoading, isError } = useCompany(id);
  const updateCompany = useUpdateCompany();
  const scoreCompany = useScoreCompany();
  const transitionStage = useTransitionStage();
  const { data: outreachEvents } = useOutreachEvents(id);
  const { data: sequences } = useSequences();
  const enrollCompany = useEnrollCompany();
  const { data: companyContacts = [] } = useCompanyContacts(id);
  const { data: companyScores = [] } = useCompanyScores(id);
  const createContact = useCreateContact();
  const enrichCompany = useEnrichCompany();
  const checkCompanyNews = useCheckCompanyNews();
  const { data: companyNewsData } = useNews({ company_id: id });
  const markActioned = useMarkActioned();
  const analyzeCompany = useAnalyzeCompany();
  const generateEmail = useGenerateEmail();
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [aiEmail, setAiEmail] = useState(null);

  const latestScore = companyScores[0] || null;
  const realFactors = scoreToFactors(latestScore);

  const handleStageChange = (newStage) => {
    transitionStage.mutate({ id: company.id, stage: newStage });
  };

  const handleEnroll = (sequenceId) => {
    enrollCompany.mutate({ company_id: id, sequence_id: sequenceId });
    setEnrollDropdownOpen(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  if (isError || !company) {
    return (
      <EmptyState
        title="Company not found"
        description="The company you are looking for does not exist or could not be loaded."
        icon={Building2}
        action={{ label: 'Back to Companies', onClick: () => navigate('/companies') }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start gap-4">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="mt-1 rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-bold text-gray-900">{company.name}</h1>
            {company.domain && (
              <a
                href={`https://${company.domain}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
              >
                {company.domain}
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <StageSelector value={company.stage} onChange={handleStageChange} />
            {company.score != null ? (
              <ScoreBadge score={company.score} size="lg" />
            ) : (
              <span className="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-sm font-medium text-gray-500">
                Not scored
              </span>
            )}
            <button
              type="button"
              onClick={() => enrichCompany.mutate({ id: company.id, data: { find_contacts: true } })}
              disabled={enrichCompany.isPending}
              className="inline-flex items-center gap-2 rounded-lg border border-purple-200 bg-purple-50 px-3 py-1.5 text-sm font-medium text-purple-700 hover:bg-purple-100 disabled:opacity-50"
            >
              <Sparkles className={cn('h-4 w-4', enrichCompany.isPending && 'animate-pulse')} />
              {enrichCompany.isPending ? 'Enriching...' : 'Enrich with Apollo'}
            </button>
            <button
              type="button"
              onClick={() => checkCompanyNews.mutate(company.id)}
              disabled={checkCompanyNews.isPending}
              className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50"
            >
              <Newspaper className={cn('h-4 w-4', checkCompanyNews.isPending && 'animate-pulse')} />
              {checkCompanyNews.isPending ? 'Checking...' : 'Check News'}
            </button>
          </div>
        </div>
      </div>

      {/* Info Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <MapPin className="h-4 w-4" />
            Location
          </div>
          <p className="mt-1 font-medium text-gray-900">
            {[company.city, company.state, company.country].filter(Boolean).join(', ') || 'Not specified'}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Users className="h-4 w-4" />
            Employees
          </div>
          <p className="mt-1 font-medium text-gray-900">
            {company.employees ? formatNumber(company.employees) : 'Not specified'}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Building2 className="h-4 w-4" />
            Industry
          </div>
          <p className="mt-1 font-medium text-gray-900">
            {company.industry || 'Not specified'}
          </p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <FileText className="h-4 w-4" />
            NAICS Code
          </div>
          <p className="mt-1 font-medium text-gray-900">
            {company.naics_code || 'Not specified'}
          </p>
        </div>
      </div>

      {/* Extra Info: Source, Tags, Notes */}
      <div className="rounded-lg border border-gray-200 bg-white p-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div>
            <p className="text-sm text-gray-500">Source</p>
            <p className="mt-1 font-medium text-gray-900">{SOURCE_LABELS[company.source] || company.source || '—'}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Tags</p>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {company.tags && company.tags.length > 0 ? (
                company.tags.map((tag) => (
                  <span key={tag} className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700">
                    {tag}
                  </span>
                ))
              ) : (
                <span className="text-sm text-gray-400">No tags</span>
              )}
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-500">Notes</p>
            <p className="mt-1 text-sm text-gray-900">{company.notes || 'No notes yet.'}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex overflow-x-auto border-b border-gray-200 px-2">
          <TabButton label="Contacts" active={activeTab === 'contacts'} onClick={() => setActiveTab('contacts')} />
          <TabButton label="Score" active={activeTab === 'score'} onClick={() => setActiveTab('score')} />
          <TabButton label="Outreach" active={activeTab === 'outreach'} onClick={() => setActiveTab('outreach')} />
          <TabButton label="Activity" active={activeTab === 'activity'} onClick={() => setActiveTab('activity')} />
          <TabButton label="News" active={activeTab === 'news'} onClick={() => setActiveTab('news')} />
          <TabButton label="AI" active={activeTab === 'ai'} onClick={() => setActiveTab('ai')} />
        </div>

        <div className="p-4">
          {/* Contacts Tab */}
          {activeTab === 'contacts' && (
            <div>
              <ContactList
                contacts={companyContacts}
                companyId={id}
              />
              <AddContactForm
                onAdd={(data) => {
                  createContact.mutate({ company_id: company.id, ...data });
                }}
              />
            </div>
          )}

          {/* Score Tab */}
          {activeTab === 'score' && (
            <div className="space-y-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <div className="text-5xl font-bold text-gray-900">{company.score ?? '—'}</div>
                    {company.score != null && (
                      <div className={cn('mt-1 text-sm font-semibold', getScoreColor(company.score).split(' ')[0])}>
                        {getScoreLabel(company.score)}
                      </div>
                    )}
                  </div>
                  <div className="h-16 w-px bg-gray-200" />
                  <div className="flex-1">
                    <div className="mb-1 text-sm text-gray-500">Score Range</div>
                    <div className="relative h-4 w-full max-w-xs rounded-full bg-gray-200 sm:w-64">
                      <div
                        className="absolute left-0 top-0 h-4 rounded-full bg-gradient-to-r from-red-400 via-yellow-400 to-green-400"
                        style={{ width: '100%' }}
                      />
                      {company.score != null && (
                        <div
                          className="absolute top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-gray-900 shadow-md"
                          style={{ left: `${company.score}%` }}
                        />
                      )}
                    </div>
                    <div className="mt-1 flex justify-between text-xs text-gray-400">
                      <span>0</span>
                      <span>50</span>
                      <span>100</span>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => scoreCompany.mutate(company.id)}
                  disabled={scoreCompany.isPending}
                  className="inline-flex items-center gap-2 rounded-lg bg-yellow-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-yellow-600 disabled:opacity-50"
                >
                  <RefreshCw className={cn('h-4 w-4', scoreCompany.isPending && 'animate-spin')} />
                  {company.score != null ? 'Re-score' : 'Score now'}
                </button>
              </div>

              <div>
                <h3 className="mb-3 text-sm font-semibold text-gray-900">Scoring Factors</h3>
                {realFactors.length > 0 ? (
                  <div className="space-y-2">
                    {realFactors.map((factor) => (
                      <div key={factor.label} className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-4 py-2.5">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{factor.label}</p>
                          <p className="text-xs text-gray-500">{factor.description}</p>
                        </div>
                        <span className="text-sm font-semibold text-green-600">+{factor.value}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
                    This company hasn't been scored yet. Run scoring to see the breakdown.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Outreach Tab */}
          {activeTab === 'outreach' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900">Outreach Timeline</h3>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setEnrollDropdownOpen(!enrollDropdownOpen)}
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-500 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-600"
                  >
                    <Send className="h-4 w-4" />
                    Enroll in Sequence
                    <ChevronDown className="h-3.5 w-3.5" />
                  </button>
                  {enrollDropdownOpen && (
                    <div className="absolute right-0 top-full z-10 mt-1 w-64 max-w-[calc(100vw-2rem)] rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
                      {(sequences || []).map((seq) => (
                        <button
                          key={seq.id}
                          type="button"
                          onClick={() => handleEnroll(seq.id)}
                          className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
                        >
                          <Mail className="h-4 w-4 text-gray-400" />
                          <div>
                            <p className="font-medium">{seq.name}</p>
                            <p className="text-xs text-gray-500">{seq.steps?.length || 0} steps</p>
                          </div>
                        </button>
                      ))}
                      {(!sequences || sequences.length === 0) && (
                        <p className="px-4 py-2 text-sm text-gray-500">No sequences available</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {outreachEvents && outreachEvents.length > 0 ? (
                <div className="relative ml-4 border-l-2 border-gray-200 pl-6">
                  {outreachEvents.map((event) => {
                    const IconComp = eventIcons[event.type] || Clock;
                    const colorClass = eventColors[event.type] || 'text-gray-500 bg-gray-50';
                    return (
                      <div key={event.id} className="relative mb-4 pb-4">
                        <div className={`absolute -left-[33px] flex h-6 w-6 items-center justify-center rounded-full ${colorClass}`}>
                          <IconComp className="h-3 w-3" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {event.type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}
                          </p>
                          {event.subject && (
                            <p className="mt-0.5 text-sm text-gray-600">{event.subject}</p>
                          )}
                          <p className="mt-0.5 text-xs text-gray-400">{formatDate(event.created_at)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <EmptyState
                  icon={Send}
                  title="No outreach events"
                  description="Enroll this company in a sequence to start outreach."
                />
              )}
            </div>
          )}

          {/* Activity Tab */}
          {activeTab === 'activity' && (
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-gray-900">Activity Timeline</h3>
              <div className="space-y-3">
                {[
                  {
                    id: 'added',
                    type: 'company_added',
                    description: 'Company added to Landline',
                    created_at: company.created_at,
                  },
                  ...(latestScore ? [{
                    id: 'scored',
                    type: 'lead_scored',
                    description: `Lead scored ${latestScore.fit_score} — ${getScoreLabel(latestScore.fit_score)}`,
                    created_at: latestScore.scored_at,
                  }] : []),
                  ...(outreachEvents || []).map((e) => ({
                    id: `event-${e.id}`,
                    type: e.event_type || e.type,
                    description: `${String(e.event_type || e.type).replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}`,
                    created_at: e.occurred_at || e.created_at,
                  })),
                ]
                  .filter((i) => i.created_at)
                  .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
                  .map((item) => {
                    const IconComp = eventIcons[item.type] || Clock;
                    const colorClass = eventColors[item.type] || 'text-gray-500 bg-gray-50';
                    return (
                      <div key={item.id} className="flex items-start gap-3">
                        <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${colorClass}`}>
                          <IconComp className="h-3.5 w-3.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-gray-700">{item.description}</p>
                          <p className="mt-0.5 text-xs text-gray-400">{timeAgo(item.created_at)}</p>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* News Tab */}
          {activeTab === 'news' && (() => {
            const newsArticles = companyNewsData?.items || companyNewsData || [];
            const categoryColors = {
              funding: 'bg-green-100 text-green-700',
              expansion: 'bg-blue-100 text-blue-700',
              leadership_change: 'bg-purple-100 text-purple-700',
              acquisition: 'bg-orange-100 text-orange-700',
              product_launch: 'bg-teal-100 text-teal-700',
              partnership: 'bg-indigo-100 text-indigo-700',
              award: 'bg-yellow-100 text-yellow-700',
              hiring: 'bg-cyan-100 text-cyan-700',
              general: 'bg-gray-100 text-gray-700',
            };
            return (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900">Company News</h3>
                  <button
                    type="button"
                    onClick={() => checkCompanyNews.mutate(company.id)}
                    disabled={checkCompanyNews.isPending}
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-500 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-600 disabled:opacity-50"
                  >
                    <RefreshCw className={cn('h-4 w-4', checkCompanyNews.isPending && 'animate-spin')} />
                    {checkCompanyNews.isPending ? 'Checking...' : 'Check for News'}
                  </button>
                </div>
                {newsArticles.length > 0 ? (
                  <div className="space-y-3">
                    {newsArticles.map((article) => {
                      const cat = article.category || 'general';
                      return (
                        <div
                          key={article.id}
                          className={cn(
                            'rounded-lg border border-gray-200 bg-white p-4',
                            article.actioned && 'opacity-50'
                          )}
                        >
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium', categoryColors[cat] || categoryColors.general)}>
                              <Tag className="h-3 w-3" />
                              {cat.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </span>
                            {article.relevance_score != null && (
                              <span className="text-xs text-gray-400">Relevance: {article.relevance_score}/10</span>
                            )}
                            {article.actioned && (
                              <span className="inline-flex items-center gap-1 text-xs text-green-600">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Done
                              </span>
                            )}
                          </div>
                          <h4 className="text-sm font-semibold text-gray-900">
                            {article.url ? (
                              <a href={article.url} target="_blank" rel="noopener noreferrer" className="hover:text-blue-600 inline-flex items-center gap-1">
                                {article.title}
                                <ExternalLink className="h-3 w-3 text-gray-400" />
                              </a>
                            ) : article.title}
                          </h4>
                          {article.summary && (
                            <p className="mt-1 text-sm text-gray-600">{article.summary}</p>
                          )}
                          <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-gray-400">
                            {article.source && <span>{article.source}</span>}
                            {article.published_at && <span>{formatDate(article.published_at)}</span>}
                          </div>
                          {article.actionable && !article.actioned && article.suggested_action && (
                            <div className="mt-2 flex items-center justify-between rounded-md bg-amber-50 border border-amber-200 px-3 py-2">
                              <div className="flex items-center gap-2">
                                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                                <span className="text-xs text-amber-700">{article.suggested_action}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => markActioned.mutate(article.id)}
                                className="inline-flex items-center gap-1 rounded-md bg-green-500 px-2 py-1 text-xs font-medium text-white hover:bg-green-600"
                              >
                                <CheckCircle2 className="h-3 w-3" />
                                Done
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <EmptyState
                    icon={Newspaper}
                    title="No news yet"
                    description="Click 'Check for News' to scan for recent articles about this company."
                  />
                )}
              </div>
            );
          })()}

          {/* AI Tab */}
          {activeTab === 'ai' && (
            <div className="space-y-6">
              {/* Action buttons */}
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => {
                    analyzeCompany.mutate(company.id, {
                      onSuccess: (data) => setAiAnalysis(data),
                    });
                  }}
                  disabled={analyzeCompany.isPending}
                  className="inline-flex items-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-purple-700 disabled:opacity-50"
                >
                  {analyzeCompany.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Brain className="h-4 w-4" />
                  )}
                  {analyzeCompany.isPending ? 'Analyzing...' : 'Analyze with AI'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    generateEmail.mutate(
                      {
                        company_id: company.id,
                        company_name: company.name,
                        industry: company.industry,
                        domain: company.domain,
                      },
                      { onSuccess: (data) => setAiEmail(data) }
                    );
                  }}
                  disabled={generateEmail.isPending}
                  className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
                >
                  {generateEmail.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Wand2 className="h-4 w-4" />
                  )}
                  {generateEmail.isPending ? 'Generating...' : 'Generate Email'}
                </button>
              </div>

              {/* AI Analysis Results */}
              {aiAnalysis && (
                <div className="space-y-4">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                    <Brain className="h-4 w-4 text-purple-500" />
                    AI Analysis
                  </h3>

                  {/* Fit Score */}
                  {aiAnalysis.fit_score != null && (
                    <div className="flex items-center gap-4 rounded-lg border border-purple-200 bg-purple-50 p-4">
                      <div className="text-3xl font-bold text-purple-700">{aiAnalysis.fit_score}</div>
                      <div>
                        <p className="text-sm font-medium text-purple-900">Fit Score</p>
                        {aiAnalysis.fit_reasoning && (
                          <p className="mt-0.5 text-sm text-purple-700">{aiAnalysis.fit_reasoning}</p>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {/* Recommended Approach */}
                    {aiAnalysis.recommended_approach && (
                      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                        <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-500">Recommended Approach</p>
                        <p className="text-sm text-gray-800">{aiAnalysis.recommended_approach}</p>
                      </div>
                    )}

                    {/* Messaging Angle */}
                    {aiAnalysis.messaging_angle && (
                      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                        <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-500">Messaging Angle</p>
                        <p className="text-sm text-gray-800">{aiAnalysis.messaging_angle}</p>
                      </div>
                    )}

                    {/* Pain Points */}
                    {aiAnalysis.likely_pain_points && aiAnalysis.likely_pain_points.length > 0 && (
                      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">Likely Pain Points</p>
                        <ul className="space-y-1">
                          {aiAnalysis.likely_pain_points.map((point, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-gray-800">
                              <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-purple-400" />
                              {point}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Target Roles */}
                    {aiAnalysis.target_roles && aiAnalysis.target_roles.length > 0 && (
                      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">Target Roles</p>
                        <div className="flex flex-wrap gap-1.5">
                          {aiAnalysis.target_roles.map((role, i) => (
                            <span key={i} className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700">
                              {role}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Subject Line */}
                  {aiAnalysis.suggested_subject_line && (
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                      <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-500">Suggested Subject Line</p>
                      <p className="text-sm font-medium text-gray-900">{aiAnalysis.suggested_subject_line}</p>
                    </div>
                  )}

                  {/* Red Flags */}
                  {aiAnalysis.red_flags && aiAnalysis.red_flags.length > 0 && (
                    <div className="rounded-lg border border-red-200 bg-red-50 p-4">
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-red-600">Red Flags</p>
                      <ul className="space-y-1">
                        {aiAnalysis.red_flags.map((flag, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-red-700">
                            <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-red-400" />
                            {flag}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Generated Email */}
              {aiEmail && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
                      <Wand2 className="h-4 w-4 text-blue-500" />
                      Generated Email
                    </h3>
                    <button
                      type="button"
                      onClick={() => {
                        const text = `Subject: ${aiEmail.subject || ''}\n\n${aiEmail.body || aiEmail.content || ''}`;
                        navigator.clipboard.writeText(text);
                      }}
                      className="inline-flex items-center gap-1.5 rounded-md border border-gray-300 px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                    >
                      <CopyIcon className="h-3.5 w-3.5" />
                      Copy
                    </button>
                  </div>
                  {aiEmail.subject && (
                    <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-2">
                      <span className="text-xs font-medium text-gray-500">Subject: </span>
                      <span className="text-sm text-gray-900">{aiEmail.subject}</span>
                    </div>
                  )}
                  <div className="whitespace-pre-wrap rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-800">
                    {aiEmail.body || aiEmail.content || ''}
                  </div>
                </div>
              )}

              {/* Empty state */}
              {!aiAnalysis && !aiEmail && !analyzeCompany.isPending && !generateEmail.isPending && (
                <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-10 text-center">
                  <Brain className="mx-auto h-8 w-8 text-gray-300" />
                  <p className="mt-2 text-sm text-gray-500">
                    Use AI to analyze this company's fit and generate personalized outreach.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
