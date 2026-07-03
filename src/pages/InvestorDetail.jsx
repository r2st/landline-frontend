import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Landmark,
  Mail,
  Phone,
  Linkedin,
  Globe,
  MapPin,
  Target,
  DollarSign,
  Building2,
  User,
  Plus,
  X,
  Sparkles,
  Wand2,
  FileText,
  Calendar,
  MessageSquare,
  Trash2,
  Copy as CopyIcon,
  Check,
  Pencil,
  ExternalLink,
  Clock,
} from 'lucide-react';
import toast from 'react-hot-toast';
import EmptyState from '../components/EmptyState';
import Markdown from '../components/Markdown';
import { cn, formatDate, timeAgo } from '../lib/utils';
import { INVESTOR_STATUSES, statusMeta, stageMeta, statusIndex } from '../lib/investors';
import { InvestorModal } from './Investors';
import {
  useInvestor,
  useInvestorInteractions,
  useInvestorDocuments,
  useUpdateInvestorStatus,
  useLogInteraction,
  useDeleteInteraction,
  useSaveDocument,
  useDeleteDocument,
  useGenerateInvestorEmail,
} from '../hooks/useInvestors';

function Spinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-600" />
    </div>
  );
}

// ─── Interaction type metadata ──────────────────────────────────────────────
const INTERACTION_TYPES = [
  { value: 'email', label: 'Email', icon: Mail, color: 'bg-sky-100 text-sky-600' },
  { value: 'call', label: 'Call', icon: Phone, color: 'bg-green-100 text-green-600' },
  { value: 'meeting', label: 'Meeting', icon: Calendar, color: 'bg-violet-100 text-violet-600' },
  { value: 'linkedin', label: 'LinkedIn', icon: Linkedin, color: 'bg-blue-100 text-blue-600' },
  { value: 'note', label: 'Note', icon: MessageSquare, color: 'bg-gray-100 text-gray-600' },
];
function interactionMeta(type) {
  return INTERACTION_TYPES.find((t) => t.value === (type || '').toLowerCase()) || INTERACTION_TYPES[4];
}

// ─── Status progression control ─────────────────────────────────────────────
function StatusProgress({ investor }) {
  const update = useUpdateInvestorStatus();
  const current = (investor.status || 'researching').toLowerCase();
  const currentIdx = statusIndex(current);

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Pipeline Status</h3>
      <div className="flex flex-wrap gap-1.5">
        {INVESTOR_STATUSES.map((s) => {
          const isCurrent = s.value === current;
          const reached = s.value !== 'passed' && statusIndex(s.value) <= currentIdx && current !== 'passed';
          return (
            <button
              key={s.value}
              type="button"
              disabled={isCurrent || update.isPending}
              onClick={() => update.mutate({ id: investor.id, status: s.value })}
              className={cn(
                'rounded-full px-2.5 py-1 text-xs font-medium ring-1 transition-colors disabled:cursor-default',
                isCurrent
                  ? cn(s.badge, 'ring-2 ring-offset-1')
                  : reached
                  ? 'bg-white text-gray-700 ring-gray-300'
                  : 'bg-white text-gray-400 ring-gray-200 hover:bg-gray-50 hover:text-gray-600'
              )}
            >
              {s.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Log interaction modal ──────────────────────────────────────────────────
function LogInteractionModal({ investorId, onClose }) {
  const log = useLogInteraction();
  const [type, setType] = useState('email');
  const [form, setForm] = useState({ subject: '', body: '', occurred_at: '' });
  const set = (f) => (e) => setForm((p) => ({ ...p, [f]: e.target.value }));

  const submit = (e) => {
    e.preventDefault();
    if (!form.subject.trim() && !form.body.trim()) return;
    log.mutate(
      { id: investorId, data: { type, ...form, occurred_at: form.occurred_at || undefined } },
      { onSuccess: onClose }
    );
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <form onClick={(e) => e.stopPropagation()} onSubmit={submit} className="w-full max-w-md rounded-xl border border-gray-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5">
          <h2 className="text-sm font-semibold text-gray-900">Log Interaction</h2>
          <button type="button" onClick={onClose} className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"><X className="h-4 w-4" /></button>
        </div>
        <div className="space-y-3 p-5">
          <div className="flex flex-wrap gap-1.5">
            {INTERACTION_TYPES.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setType(t.value)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
                  type === t.value ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-100'
                )}
              >
                <t.icon className="h-3.5 w-3.5" /> {t.label}
              </button>
            ))}
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Subject</label>
            <input className="h-9 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" value={form.subject} onChange={set('subject')} placeholder="Intro call, follow-up email…" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Notes</label>
            <textarea rows={4} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" value={form.body} onChange={set('body')} placeholder="What was discussed?" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">When</label>
            <input type="datetime-local" className="h-9 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" value={form.occurred_at} onChange={set('occurred_at')} />
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-gray-100 px-5 py-3">
          <button type="button" onClick={onClose} className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
          <button type="submit" disabled={log.isPending} className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50">
            {log.isPending ? 'Saving…' : 'Log Interaction'}
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Interaction timeline ───────────────────────────────────────────────────
function Timeline({ investorId }) {
  const { data: interactions = [], isLoading } = useInvestorInteractions(investorId);
  const del = useDeleteInteraction();

  if (isLoading) return <Spinner />;
  if (interactions.length === 0) {
    return <EmptyState icon={MessageSquare} title="No interactions yet" description="Log your first email, call, or meeting to build the timeline." />;
  }

  return (
    <ol className="relative space-y-4 border-l border-gray-200 pl-6">
      {interactions.map((it) => {
        const meta = interactionMeta(it.type);
        const when = it.occurred_at || it.created_at || it.date;
        return (
          <li key={it.id} className="group relative">
            <span className={cn('absolute -left-[35px] flex h-7 w-7 items-center justify-center rounded-full ring-4 ring-white', meta.color)}>
              <meta.icon className="h-3.5 w-3.5" />
            </span>
            <div className="rounded-lg border border-gray-100 bg-white p-3 shadow-sm">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900">{it.subject || meta.label}</p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-[11px] text-gray-400">
                    <span className="rounded bg-gray-100 px-1.5 py-0.5 font-medium text-gray-500">{meta.label}</span>
                    {when && <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{formatDate(when)}{timeAgo(when) ? ` · ${timeAgo(when)}` : ''}</span>}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => del.mutate({ id: investorId, interactionId: it.id })}
                  className="flex-shrink-0 rounded-md p-1 text-gray-300 opacity-0 transition hover:bg-gray-100 hover:text-rose-500 group-hover:opacity-100"
                  title="Delete"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
              {it.body && <p className="mt-1.5 whitespace-pre-wrap text-sm text-gray-600">{it.body}</p>}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

// ─── Documents ──────────────────────────────────────────────────────────────
const DOC_TYPES = ['Pitch Deck', 'Financials', 'Cap Table', 'Data Room', 'Term Sheet', 'Other'];

function Documents({ investorId }) {
  const { data: documents = [], isLoading } = useInvestorDocuments(investorId);
  const save = useSaveDocument();
  const del = useDeleteDocument();
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: '', type: 'Pitch Deck', url: '' });
  const set = (f) => (e) => setForm((p) => ({ ...p, [f]: e.target.value }));

  const submit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    save.mutate({ id: investorId, data: form }, {
      onSuccess: () => { setForm({ name: '', type: 'Pitch Deck', url: '' }); setAdding(false); },
    });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">Documents</h3>
        <button type="button" onClick={() => setAdding((v) => !v)} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50">
          <Plus className="h-3.5 w-3.5" /> Add
        </button>
      </div>

      {adding && (
        <form onSubmit={submit} className="grid grid-cols-2 gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3">
          <input className="col-span-2 h-8 rounded-md border border-gray-300 bg-white px-2.5 text-sm focus:border-indigo-500 focus:outline-none" placeholder="Document name" value={form.name} onChange={set('name')} />
          <select className="h-8 rounded-md border border-gray-300 bg-white px-2 text-sm focus:border-indigo-500 focus:outline-none" value={form.type} onChange={set('type')}>
            {DOC_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <input className="h-8 rounded-md border border-gray-300 bg-white px-2.5 text-sm focus:border-indigo-500 focus:outline-none" placeholder="URL (optional)" value={form.url} onChange={set('url')} />
          <div className="col-span-2 flex justify-end gap-2">
            <button type="button" onClick={() => setAdding(false)} className="rounded-md px-2.5 py-1 text-xs font-medium text-gray-500 hover:bg-gray-100">Cancel</button>
            <button type="submit" disabled={save.isPending} className="rounded-md bg-indigo-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50">Save</button>
          </div>
        </form>
      )}

      {isLoading ? (
        <Spinner />
      ) : documents.length === 0 ? (
        <p className="rounded-lg border border-dashed border-gray-200 py-6 text-center text-sm text-gray-400">No documents shared yet.</p>
      ) : (
        <ul className="space-y-1.5">
          {documents.map((d) => (
            <li key={d.id} className="group flex items-center gap-3 rounded-lg border border-gray-100 bg-white p-2.5 shadow-sm">
              <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600"><FileText className="h-4 w-4" /></span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-800">{d.name}</p>
                <p className="text-[11px] text-gray-400">{d.type || 'Document'}{d.created_at ? ` · ${formatDate(d.created_at)}` : ''}</p>
              </div>
              {d.url && (
                <a href={d.url} target="_blank" rel="noopener noreferrer" className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-indigo-600" title="Open"><ExternalLink className="h-4 w-4" /></a>
              )}
              <button type="button" onClick={() => del.mutate({ id: investorId, documentId: d.id })} className="rounded-md p-1.5 text-gray-300 opacity-0 transition hover:bg-gray-100 hover:text-rose-500 group-hover:opacity-100" title="Remove">
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─── AI outreach email ──────────────────────────────────────────────────────
function AIEmailPanel({ investor, onClose }) {
  const generate = useGenerateInvestorEmail();
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);

  const run = () => {
    generate.mutate({ id: investor.id, data: {} }, { onSuccess: (data) => setResult(data) });
  };

  const emailText = result
    ? [result.subject ? `Subject: ${result.subject}` : null, result.body || result.email || result.content]
        .filter(Boolean).join('\n\n')
    : '';

  const copy = () => {
    navigator.clipboard.writeText(emailText).then(() => {
      setCopied(true);
      toast.success('Copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900"><Sparkles className="h-4 w-4 text-violet-600" /> AI Outreach Email</h2>
          <button type="button" onClick={onClose} className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"><X className="h-4 w-4" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          {generate.isPending ? (
            <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
              <Spinner />
              <p className="text-sm text-gray-500">Drafting a personalised email for {investor.firm}…</p>
            </div>
          ) : result ? (
            <div className="space-y-3">
              {result.subject && (
                <div>
                  <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Subject</p>
                  <p className="rounded-lg bg-gray-50 p-2.5 text-sm font-medium text-gray-800">{result.subject}</p>
                </div>
              )}
              <div>
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Body</p>
                <div className="rounded-lg bg-gray-50 p-3 text-sm text-gray-700">
                  <Markdown content={result.body || result.email || result.content || ''} />
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 py-10 text-center">
              <Wand2 className="h-8 w-8 text-violet-300" />
              <p className="max-w-xs text-sm text-gray-500">Generate a tailored outreach email using {investor.firm}'s investment focus and your interaction history.</p>
              <button type="button" onClick={run} className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-violet-700">
                <Sparkles className="h-4 w-4" /> Generate Email
              </button>
            </div>
          )}
        </div>
        {result && (
          <div className="flex items-center justify-end gap-2 border-t border-gray-100 px-5 py-3">
            <button type="button" onClick={run} disabled={generate.isPending} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50">
              <Wand2 className="h-3.5 w-3.5" /> Regenerate
            </button>
            <button type="button" onClick={copy} className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700">
              {copied ? <Check className="h-3.5 w-3.5" /> : <CopyIcon className="h-3.5 w-3.5" />} {copied ? 'Copied' : 'Copy'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Profile field ──────────────────────────────────────────────────────────
function Field({ icon: Icon, label, children, href }) {
  if (!children) return null;
  const body = href ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className="truncate text-indigo-600 hover:underline">{children}</a>
  ) : (
    <span className="truncate text-gray-700">{children}</span>
  );
  return (
    <div className="flex items-start gap-2.5 text-sm">
      <Icon className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-400" />
      <div className="min-w-0">
        <p className="text-[11px] font-medium uppercase tracking-wide text-gray-400">{label}</p>
        {body}
      </div>
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────────
export default function InvestorDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: investor, isLoading } = useInvestor(id);
  const [showLog, setShowLog] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [showEdit, setShowEdit] = useState(false);

  if (isLoading) return <Spinner />;
  if (!investor) {
    return (
      <div className="space-y-4">
        <Link to="/investors" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700"><ArrowLeft className="h-4 w-4" /> Back to Investors</Link>
        <EmptyState icon={Landmark} title="Investor not found" description="This investor may have been removed." action={{ label: 'Back to Investors', onClick: () => navigate('/investors') }} />
      </div>
    );
  }

  const sMeta = statusMeta(investor.status);
  const stMeta = stageMeta(investor.stage);
  const focus = Array.isArray(investor.focus) ? investor.focus.join(', ') : investor.investment_focus || investor.focus;

  return (
    <div className="space-y-6">
      {/* Breadcrumb / back */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Link to="/investors" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700">
          <ArrowLeft className="h-4 w-4" /> Back to Investors
        </Link>
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => setShowEdit(true)} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50">
            <Pencil className="h-4 w-4" /> Edit
          </button>
          <button type="button" onClick={() => setShowAI(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-violet-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-violet-700">
            <Sparkles className="h-4 w-4" /> AI Email
          </button>
        </div>
      </div>

      {/* Header card */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-start gap-4">
          <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-lg font-bold text-indigo-600">
            {(investor.firm || '?').slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-gray-900">{investor.firm || 'Unknown firm'}</h1>
              <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ring-1', sMeta.badge)}>{sMeta.label}</span>
              {investor.stage && <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1', stMeta.badge)}>{stMeta.label}</span>}
            </div>
            {investor.name && <p className="mt-1 flex items-center gap-1.5 text-sm text-gray-500"><User className="h-3.5 w-3.5" />{investor.name}{investor.title ? `, ${investor.title}` : ''}</p>}
          </div>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 border-t border-gray-100 pt-5 sm:grid-cols-2 lg:grid-cols-3">
          <Field icon={Mail} label="Email" href={investor.email ? `mailto:${investor.email}` : undefined}>{investor.email}</Field>
          <Field icon={Phone} label="Phone" href={investor.phone ? `tel:${investor.phone}` : undefined}>{investor.phone}</Field>
          <Field icon={Linkedin} label="LinkedIn" href={investor.linkedin}>{investor.linkedin ? 'View profile' : null}</Field>
          <Field icon={Globe} label="Website" href={investor.website}>{investor.website}</Field>
          <Field icon={MapPin} label="Location">{investor.location}</Field>
          <Field icon={Target} label="Investment Focus">{focus}</Field>
          <Field icon={DollarSign} label="Check Size">{investor.check_size}</Field>
          <Field icon={Building2} label="Stage">{investor.stage ? stMeta.label : null}</Field>
        </div>

        {investor.notes && (
          <div className="mt-4 rounded-lg bg-gray-50 p-3 text-sm text-gray-600">
            <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">Notes</p>
            {investor.notes}
          </div>
        )}
      </div>

      {/* Status progression */}
      <StatusProgress investor={investor} />

      {/* Two-column: timeline + documents */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">Interaction Timeline</h3>
            <button type="button" onClick={() => setShowLog(true)} className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm hover:bg-indigo-700">
              <Plus className="h-3.5 w-3.5" /> Log Interaction
            </button>
          </div>
          <Timeline investorId={investor.id} />
        </div>

        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <Documents investorId={investor.id} />
        </div>
      </div>

      {/* Overlays */}
      {showLog && <LogInteractionModal investorId={investor.id} onClose={() => setShowLog(false)} />}
      {showAI && <AIEmailPanel investor={investor} onClose={() => setShowAI(false)} />}
      {showEdit && <InvestorModal investor={investor} onClose={() => setShowEdit(false)} />}
    </div>
  );
}
