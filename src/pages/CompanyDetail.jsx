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
} from 'lucide-react';
import ScoreBadge from '../components/ScoreBadge';
import StageSelector from '../components/StageSelector';
import ContactList from '../components/ContactList';
import EmptyState from '../components/EmptyState';
import { useCompany, useUpdateCompany, useScoreCompany } from '../hooks/useCompanies';
import { useTransitionStage } from '../hooks/usePipeline';
import { useOutreachEvents, useSequences, useEnrollCompany } from '../hooks/useOutreach';
import { mockContacts } from '../lib/mockData';
import { STAGE_LABELS, STAGE_COLORS, SOURCE_LABELS } from '../lib/constants';
import { formatDate, formatNumber, getScoreColor, getScoreLabel, timeAgo, cn } from '../lib/utils';

const scoringFactors = [
  { label: 'Company Size', value: '+15', description: 'Based on employee count' },
  { label: 'Industry Match', value: '+20', description: 'Target industry alignment' },
  { label: 'Contact Quality', value: '+10', description: 'Decision-maker contacts found' },
  { label: 'Engagement Level', value: '+18', description: 'Email opens and replies' },
  { label: 'Website Activity', value: '+12', description: 'Recent site visits detected' },
  { label: 'Geographic Fit', value: '+8', description: 'Within target geography' },
  { label: 'Technology Stack', value: '+5', description: 'Compatible tech detected' },
  { label: 'Funding Stage', value: '+4', description: 'Recent funding round' },
];

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
        'border-b-2 px-4 py-2.5 text-sm font-medium transition-colors',
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
          <div className="grid grid-cols-2 gap-3">
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

  const companyContacts = mockContacts.filter((c) => String(c.company_id) === String(id));

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
            <ScoreBadge score={company.score} size="lg" />
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
        <div className="flex border-b border-gray-200 px-2">
          <TabButton label="Contacts" active={activeTab === 'contacts'} onClick={() => setActiveTab('contacts')} />
          <TabButton label="Score" active={activeTab === 'score'} onClick={() => setActiveTab('score')} />
          <TabButton label="Outreach" active={activeTab === 'outreach'} onClick={() => setActiveTab('outreach')} />
          <TabButton label="Activity" active={activeTab === 'activity'} onClick={() => setActiveTab('activity')} />
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
                  updateCompany.mutate({ id: company.id, data: { ...company, contact: data } });
                }}
              />
            </div>
          )}

          {/* Score Tab */}
          {activeTab === 'score' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="text-center">
                    <div className="text-5xl font-bold text-gray-900">{company.score}</div>
                    <div className={cn('mt-1 text-sm font-semibold', getScoreColor(company.score).split(' ')[0])}>
                      {getScoreLabel(company.score)}
                    </div>
                  </div>
                  <div className="h-16 w-px bg-gray-200" />
                  <div className="flex-1">
                    <div className="mb-1 text-sm text-gray-500">Score Range</div>
                    <div className="relative h-4 w-64 rounded-full bg-gray-200">
                      <div
                        className="absolute left-0 top-0 h-4 rounded-full bg-gradient-to-r from-red-400 via-yellow-400 to-green-400"
                        style={{ width: '100%' }}
                      />
                      <div
                        className="absolute top-1/2 h-6 w-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-gray-900 shadow-md"
                        style={{ left: `${company.score}%` }}
                      />
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
                  Re-score
                </button>
              </div>

              <div>
                <h3 className="mb-3 text-sm font-semibold text-gray-900">Scoring Factors</h3>
                <div className="space-y-2">
                  {scoringFactors.map((factor) => (
                    <div key={factor.label} className="flex items-center justify-between rounded-lg border border-gray-100 bg-gray-50 px-4 py-2.5">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{factor.label}</p>
                        <p className="text-xs text-gray-500">{factor.description}</p>
                      </div>
                      <span className="text-sm font-semibold text-green-600">{factor.value}</span>
                    </div>
                  ))}
                </div>
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
                    <div className="absolute right-0 top-full z-10 mt-1 w-64 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
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
              {outreachEvents && outreachEvents.length > 0 ? (
                <div className="space-y-3">
                  {/* Combine mock stage changes with outreach events */}
                  {[
                    { id: 'stage-1', type: 'stage_changed', description: `Stage changed to ${STAGE_LABELS[company.stage] || company.stage}`, created_at: company.updated_at },
                    { id: 'score-1', type: 'lead_scored', description: `Company scored ${company.score} — ${getScoreLabel(company.score)}`, created_at: company.updated_at },
                    ...outreachEvents.map((e) => ({
                      id: `event-${e.id}`,
                      type: e.type,
                      description: `${e.type.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}${e.subject ? `: ${e.subject}` : ''}`,
                      created_at: e.created_at,
                    })),
                  ]
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
              ) : (
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-500">
                      <ArrowRight className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-700">Stage changed to {STAGE_LABELS[company.stage]}</p>
                      <p className="mt-0.5 text-xs text-gray-400">{timeAgo(company.updated_at)}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-yellow-50 text-yellow-500">
                      <Target className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-700">Company scored {company.score}</p>
                      <p className="mt-0.5 text-xs text-gray-400">{timeAgo(company.updated_at)}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-green-50 text-green-500">
                      <Plus className="h-3.5 w-3.5" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-700">Company added to Landline</p>
                      <p className="mt-0.5 text-xs text-gray-400">{timeAgo(company.created_at)}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
