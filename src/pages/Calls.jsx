import { useEffect, useMemo, useState } from 'react';
import {
  Phone,
  PhoneCall,
  Sparkles,
  Bell,
  X,
  Building2,
  Clock,
  Flame,
  Thermometer,
  Snowflake,
  Mail,
  Target,
  MessageSquare,
  ListChecks,
  ChevronRight,
  CheckCircle2,
  FileText,
  Plus,
} from 'lucide-react';
import EmptyState from '../components/EmptyState';
import Markdown from '../components/Markdown';
import { cn, timeAgo, formatDate } from '../lib/utils';
import {
  useTodaysCalls,
  useCallTasks,
  useCallBriefing,
  useGenerateQueue,
  useLogCallOutcome,
  useSaveCallTask,
  useCallScripts,
  useCallNotifications,
  useMarkNotificationRead,
} from '../hooks/useCalls';

// ─── Priority meta ────────────────────────────────────────────────────────────
const PRIORITY = {
  hot: { label: 'Hot', icon: Flame, badge: 'bg-red-50 text-red-700 ring-red-200', dot: 'bg-red-500' },
  warm: { label: 'Warm', icon: Thermometer, badge: 'bg-orange-50 text-orange-700 ring-orange-200', dot: 'bg-orange-500' },
  cold: { label: 'Cold', icon: Snowflake, badge: 'bg-sky-50 text-sky-700 ring-sky-200', dot: 'bg-sky-500' },
};
function priorityMeta(p) {
  return PRIORITY[(p || '').toLowerCase()] || { label: p || 'Normal', icon: Phone, badge: 'bg-gray-100 text-gray-600 ring-gray-200', dot: 'bg-gray-400' };
}

const OUTCOMES = [
  { value: 'connected', label: 'Connected' },
  { value: 'voicemail', label: 'Voicemail' },
  { value: 'no_answer', label: 'No Answer' },
  { value: 'gatekeeper', label: 'Gatekeeper' },
  { value: 'callback_scheduled', label: 'Callback Scheduled' },
];

function Spinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-600" />
    </div>
  );
}

function field(task, ...keys) {
  for (const k of keys) if (task?.[k] != null && task[k] !== '') return task[k];
  return undefined;
}

// ─── Call card ────────────────────────────────────────────────────────────────
function CallCard({ task, onStart }) {
  const meta = priorityMeta(field(task, 'priority'));
  const name = field(task, 'contact_name', 'name', 'contact') || 'Unknown contact';
  const company = field(task, 'company', 'company_name');
  const industry = field(task, 'industry');
  const time = field(task, 'scheduled_time', 'scheduled_at', 'due_at');
  const done = ['completed', 'done', 'logged'].includes((field(task, 'status') || '').toLowerCase());
  const outcome = field(task, 'outcome');

  return (
    <button
      type="button"
      onClick={() => onStart(task)}
      className={cn(
        'group flex w-full items-center gap-4 rounded-xl border bg-white p-4 text-left shadow-sm transition-all hover:border-indigo-300 hover:shadow-md',
        done ? 'border-gray-200 opacity-70' : 'border-gray-200'
      )}
    >
      <div className={cn('h-10 w-1 flex-shrink-0 rounded-full', meta.dot)} />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-semibold text-gray-900">{name}</p>
          <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ring-1', meta.badge)}>
            <meta.icon className="h-3 w-3" />
            {meta.label}
          </span>
          {done && (
            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-green-600">
              <CheckCircle2 className="h-3.5 w-3.5" />
              {outcome ? outcome.replace(/_/g, ' ') : 'Done'}
            </span>
          )}
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-500">
          {company && <span className="inline-flex items-center gap-1"><Building2 className="h-3.5 w-3.5 text-gray-400" />{company}</span>}
          {industry && <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600">{industry}</span>}
          {time && <span className="inline-flex items-center gap-1"><Clock className="h-3.5 w-3.5 text-gray-400" />{formatDate(time)}</span>}
        </div>
      </div>
      <span className="hidden items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-2 text-xs font-medium text-white shadow-sm transition group-hover:bg-indigo-700 sm:inline-flex">
        <PhoneCall className="h-3.5 w-3.5" />
        Start Call
      </span>
      <ChevronRight className="h-5 w-5 flex-shrink-0 text-gray-300 sm:hidden" />
    </button>
  );
}

// ─── Script block ─────────────────────────────────────────────────────────────
function listOf(val) {
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') return val.split('\n').map((s) => s.trim()).filter(Boolean);
  return [];
}

function ScriptView({ script }) {
  if (!script) return null;
  const opening = script.opening || script.intro;
  const questions = listOf(script.questions);
  const objections = script.objections || [];
  const cta = script.cta || script.close || script.call_to_action;

  return (
    <div className="space-y-4">
      {opening && (
        <div>
          <p className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400"><MessageSquare className="h-3.5 w-3.5" /> Opening</p>
          <div className="rounded-lg bg-gray-50 p-3 text-sm text-gray-700"><Markdown content={opening} /></div>
        </div>
      )}
      {questions.length > 0 && (
        <div>
          <p className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400"><ListChecks className="h-3.5 w-3.5" /> Discovery Questions</p>
          <ul className="space-y-1.5">
            {questions.map((q, i) => (
              <li key={i} className="flex items-start gap-2 rounded-lg bg-gray-50 p-2.5 text-sm text-gray-700">
                <span className="mt-0.5 flex h-4 w-4 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-bold text-indigo-600">{i + 1}</span>
                {typeof q === 'string' ? q : q.text || q.question}
              </li>
            ))}
          </ul>
        </div>
      )}
      {Array.isArray(objections) && objections.length > 0 && (
        <div>
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Objection Handling</p>
          <div className="space-y-2">
            {objections.map((o, i) => (
              <div key={i} className="rounded-lg border border-gray-200 p-2.5 text-sm">
                <p className="font-medium text-gray-900">{typeof o === 'string' ? o : o.objection || o.label}</p>
                {typeof o === 'object' && (o.response || o.answer) && (
                  <p className="mt-0.5 text-gray-600">{o.response || o.answer}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      {cta && (
        <div>
          <p className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400"><Target className="h-3.5 w-3.5" /> Call to Action</p>
          <div className="rounded-lg bg-indigo-50 p-3 text-sm text-indigo-900"><Markdown content={cta} /></div>
        </div>
      )}
    </div>
  );
}

// ─── Briefing slide-over ──────────────────────────────────────────────────────
function BriefingPanel({ task, onClose }) {
  const { data: briefing, isLoading } = useCallBriefing(task.id);
  const log = useLogCallOutcome();
  const [visible, setVisible] = useState(false);
  const [outcome, setOutcome] = useState(field(task, 'outcome') || '');
  const [duration, setDuration] = useState(field(task, 'duration') || '');
  const [notes, setNotes] = useState(field(task, 'notes') || '');

  useEffect(() => { requestAnimationFrame(() => setVisible(true)); }, []);
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && handleClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const handleClose = () => { setVisible(false); setTimeout(onClose, 250); };

  const name = field(task, 'contact_name', 'name', 'contact') || 'Unknown contact';
  const company = field(task, 'company', 'company_name');
  const phone = field(task, 'phone', 'phone_number');
  const meta = priorityMeta(field(task, 'priority'));

  const background = briefing?.company_background || briefing?.background;
  const emailHistory = briefing?.email_history || briefing?.emails || [];
  const painPoints = listOf(briefing?.pain_points || briefing?.painPoints);
  const talkingPoints = listOf(briefing?.talking_points || briefing?.talkingPoints);
  const script = briefing?.script;

  const submitOutcome = () => {
    if (!outcome) return;
    log.mutate(
      { id: task.id, data: { status: 'completed', outcome, duration: duration ? Number(duration) : undefined, notes } },
      { onSuccess: handleClose }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className={cn('fixed inset-0 transition-opacity duration-250', visible ? 'bg-black/30' : 'bg-black/0')} onClick={handleClose} />
      <div className={cn('relative flex w-full max-w-xl transform flex-col bg-white shadow-xl transition-transform duration-250 ease-in-out', visible ? 'translate-x-0' : 'translate-x-full')}>
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-gray-100 px-6 py-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="truncate text-lg font-bold text-gray-900">{name}</h2>
              <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ring-1', meta.badge)}>
                <meta.icon className="h-3 w-3" />{meta.label}
              </span>
            </div>
            <p className="mt-0.5 text-sm text-gray-500">{[field(task, 'title'), company].filter(Boolean).join(' · ')}</p>
          </div>
          <button type="button" onClick={handleClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Call action bar */}
        {phone && (
          <div className="flex items-center justify-between gap-3 border-b border-gray-100 bg-indigo-50/50 px-6 py-3">
            <span className="text-sm font-medium text-gray-700">{phone}</span>
            <a href={`tel:${phone}`} className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700">
              <PhoneCall className="h-4 w-4" /> Call Now
            </a>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
          {isLoading ? (
            <Spinner />
          ) : (
            <>
              {background && (
                <section>
                  <h3 className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400"><Building2 className="h-3.5 w-3.5" /> Company Background</h3>
                  <div className="rounded-lg bg-gray-50 p-3 text-sm text-gray-700"><Markdown content={background} /></div>
                </section>
              )}

              {Array.isArray(emailHistory) && emailHistory.length > 0 && (
                <section>
                  <h3 className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400"><Mail className="h-3.5 w-3.5" /> Email Engagement</h3>
                  <ul className="space-y-1.5">
                    {emailHistory.map((e, i) => (
                      <li key={i} className="flex items-start gap-2 rounded-lg border border-gray-100 p-2.5 text-sm">
                        <Mail className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
                        <div className="min-w-0">
                          <p className="truncate font-medium text-gray-800">{e.subject || e.title || 'Email'}</p>
                          <p className="text-xs text-gray-500">
                            {[e.status, e.opened ? 'opened' : null, e.sent_at ? timeAgo(e.sent_at) : (e.date ? formatDate(e.date) : null)].filter(Boolean).join(' · ')}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {painPoints.length > 0 && (
                <section>
                  <h3 className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400"><Target className="h-3.5 w-3.5" /> Industry Pain Points</h3>
                  <ul className="space-y-1">
                    {painPoints.map((p, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                        <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-red-400" />
                        {typeof p === 'string' ? p : p.text || p.label}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {talkingPoints.length > 0 && (
                <section>
                  <h3 className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400"><MessageSquare className="h-3.5 w-3.5" /> Suggested Talking Points</h3>
                  <ul className="space-y-1">
                    {talkingPoints.map((p, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                        <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-indigo-400" />
                        {typeof p === 'string' ? p : p.text || p.label}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {script && (
                <section>
                  <h3 className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400"><FileText className="h-3.5 w-3.5" /> Call Script</h3>
                  <ScriptView script={script} />
                </section>
              )}

              {!background && !emailHistory.length && !painPoints.length && !talkingPoints.length && !script && (
                <EmptyState icon={FileText} title="No briefing yet" description="There's no background brief for this call." />
              )}
            </>
          )}
        </div>

        {/* Outcome logging */}
        <div className="border-t border-gray-100 bg-gray-50 px-6 py-4">
          <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-500">Log Outcome</h3>
          <div className="flex flex-wrap gap-1.5">
            {OUTCOMES.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => setOutcome(o.value)}
                className={cn(
                  'rounded-full px-2.5 py-1 text-xs font-medium transition-colors',
                  outcome === o.value ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-100'
                )}
              >
                {o.label}
              </button>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-2">
            <input
              type="number"
              min="0"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              placeholder="Duration (min)"
              className="h-9 w-36 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Call notes…"
            className="mt-2 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <button
            type="button"
            onClick={submitOutcome}
            disabled={!outcome || log.isPending}
            className="mt-2 inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
          >
            <CheckCircle2 className="h-4 w-4" />
            {log.isPending ? 'Saving…' : 'Log & Complete'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Notifications panel ──────────────────────────────────────────────────────
function NotificationsPanel({ onClose }) {
  const { data: notifications = [], isLoading } = useCallNotifications();
  const markRead = useMarkNotificationRead();
  const [visible, setVisible] = useState(false);
  useEffect(() => { requestAnimationFrame(() => setVisible(true)); }, []);
  const handleClose = () => { setVisible(false); setTimeout(onClose, 250); };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className={cn('fixed inset-0 transition-opacity duration-250', visible ? 'bg-black/30' : 'bg-black/0')} onClick={handleClose} />
      <div className={cn('relative flex w-full max-w-sm transform flex-col bg-white shadow-xl transition-transform duration-250 ease-in-out', visible ? 'translate-x-0' : 'translate-x-full')}>
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900"><Bell className="h-4 w-4 text-indigo-600" /> Notifications</h2>
          <button type="button" onClick={handleClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"><X className="h-5 w-5" /></button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <Spinner />
          ) : notifications.length === 0 ? (
            <EmptyState icon={Bell} title="All caught up" description="No unread notifications." />
          ) : (
            <ul className="space-y-2">
              {notifications.map((n) => (
                <li key={n.id} className="flex items-start gap-3 rounded-lg border border-gray-100 p-3">
                  <span className="mt-1.5 h-2 w-2 flex-shrink-0 rounded-full bg-indigo-500" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-gray-800">{n.message || n.title || n.body}</p>
                    {(n.created_at || n.date) && <p className="mt-0.5 text-xs text-gray-400">{timeAgo(n.created_at || n.date)}</p>}
                  </div>
                  <button type="button" onClick={() => markRead.mutate(n.id)} className="flex-shrink-0 rounded-md p-1 text-gray-300 hover:bg-gray-100 hover:text-green-600" title="Mark read">
                    <CheckCircle2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Scripts tab ──────────────────────────────────────────────────────────────
function ScriptsTab() {
  const { data: scripts = [], isLoading } = useCallScripts();
  const [selected, setSelected] = useState(0);
  if (isLoading) return <Spinner />;
  if (scripts.length === 0) {
    return <EmptyState icon={FileText} title="No scripts yet" description="Call scripts by industry will appear here." />;
  }
  const active = scripts[Math.min(selected, scripts.length - 1)];
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[200px_1fr]">
      <div className="flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">
        {scripts.map((s, i) => {
          const label = s.industry || s.name || `Script ${i + 1}`;
          return (
            <button
              key={label}
              type="button"
              onClick={() => setSelected(i)}
              className={cn(
                'flex-shrink-0 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors lg:w-full',
                i === selected ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 ring-1 ring-gray-200 hover:bg-gray-50'
              )}
            >
              {label}
            </button>
          );
        })}
      </div>
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold text-gray-900">{active.industry || active.name} Script</h3>
        <ScriptView script={active} />
      </div>
    </div>
  );
}

// ─── New call task modal ──────────────────────────────────────────────────────
function NewCallModal({ onClose }) {
  const save = useSaveCallTask();
  const [form, setForm] = useState({ contact_name: '', company: '', industry: '', phone: '', priority: 'warm', scheduled_time: '' });
  const set = (f) => (e) => setForm((p) => ({ ...p, [f]: e.target.value }));
  const input = 'h-9 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500';
  const submit = (e) => {
    e.preventDefault();
    if (!form.contact_name.trim()) return;
    save.mutate({ data: form }, { onSuccess: onClose });
  };
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <form onClick={(e) => e.stopPropagation()} onSubmit={submit} className="w-full max-w-md rounded-xl border border-gray-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5">
          <h2 className="text-sm font-semibold text-gray-900">New Call Task</h2>
          <button type="button" onClick={onClose} className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"><X className="h-4 w-4" /></button>
        </div>
        <div className="grid grid-cols-2 gap-3 p-5">
          <div className="col-span-2">
            <label className="mb-1 block text-xs font-medium text-gray-500">Contact Name *</label>
            <input className={input} value={form.contact_name} onChange={set('contact_name')} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Company</label>
            <input className={input} value={form.company} onChange={set('company')} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Industry</label>
            <input className={input} value={form.industry} onChange={set('industry')} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Phone</label>
            <input className={input} value={form.phone} onChange={set('phone')} />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Priority</label>
            <select className={input} value={form.priority} onChange={set('priority')}>
              <option value="hot">Hot</option>
              <option value="warm">Warm</option>
              <option value="cold">Cold</option>
            </select>
          </div>
          <div className="col-span-2">
            <label className="mb-1 block text-xs font-medium text-gray-500">Scheduled Time</label>
            <input type="datetime-local" className={input} value={form.scheduled_time} onChange={set('scheduled_time')} />
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-gray-100 px-5 py-3">
          <button type="button" onClick={onClose} className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
          <button type="submit" disabled={save.isPending} className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50">
            {save.isPending ? 'Saving…' : 'Create'}
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
const TABS = [
  { id: 'today', label: "Today's Queue" },
  { id: 'all', label: 'All Calls' },
  { id: 'scripts', label: 'Scripts' },
];

export default function Calls() {
  const [activeTab, setActiveTab] = useState('today');
  const [briefingTask, setBriefingTask] = useState(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showNew, setShowNew] = useState(false);

  const { data: todaysCalls = [], isLoading: loadingToday } = useTodaysCalls();
  const { data: allCalls = [], isLoading: loadingAll } = useCallTasks();
  const { data: notifications = [] } = useCallNotifications();
  const generate = useGenerateQueue();

  const unreadCount = notifications.length;

  const stats = useMemo(() => {
    const counts = { hot: 0, warm: 0, cold: 0 };
    todaysCalls.forEach((t) => {
      const p = (t.priority || '').toLowerCase();
      if (counts[p] != null) counts[p] += 1;
    });
    return counts;
  }, [todaysCalls]);

  const renderList = (list, loading, emptyTitle, emptyDesc) => {
    if (loading) return <Spinner />;
    if (list.length === 0) {
      return (
        <EmptyState
          icon={Phone}
          title={emptyTitle}
          description={emptyDesc}
          action={{ label: 'Generate Queue', onClick: () => generate.mutate() }}
        />
      );
    }
    return (
      <div className="space-y-2.5">
        {list.map((t) => (
          <CallCard key={t.id} task={t} onStart={setBriefingTask} />
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-1 flex items-center gap-3">
            <Phone className="h-7 w-7 text-indigo-600" />
            <h1 className="text-2xl font-bold text-gray-900">Cold Calling</h1>
          </div>
          <p className="ml-10 text-sm text-gray-500">Your prioritized call queue, briefings, and outcome logging.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowNotifications(true)}
            className="relative rounded-lg border border-gray-300 bg-white p-2.5 text-gray-500 shadow-sm hover:bg-gray-50"
            title="Notifications"
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                {unreadCount}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => setShowNew(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          >
            <Plus className="h-4 w-4" /> New Call
          </button>
          <button
            type="button"
            onClick={() => generate.mutate()}
            disabled={generate.isPending}
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
          >
            <Sparkles className="h-4 w-4" />
            {generate.isPending ? 'Generating…' : 'Generate Queue'}
          </button>
        </div>
      </div>

      {/* Priority summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { key: 'hot', label: 'Hot Leads', icon: Flame, color: 'text-red-600 bg-red-50' },
          { key: 'warm', label: 'Warm Leads', icon: Thermometer, color: 'text-orange-600 bg-orange-50' },
          { key: 'cold', label: 'Cold Leads', icon: Snowflake, color: 'text-sky-600 bg-sky-50' },
        ].map((s) => (
          <div key={s.key} className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className={cn('flex h-10 w-10 items-center justify-center rounded-lg', s.color)}>
              <s.icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats[s.key]}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-1 rounded-lg border border-gray-200 bg-white p-1 shadow-sm">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
              activeTab === tab.id ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {activeTab === 'today' && renderList(todaysCalls, loadingToday, 'No calls queued for today', 'Generate a prioritized call queue to get started.')}
      {activeTab === 'all' && renderList(allCalls, loadingAll, 'No call tasks', 'Create a call task or generate a queue.')}
      {activeTab === 'scripts' && <ScriptsTab />}

      {/* Overlays */}
      {briefingTask && <BriefingPanel task={briefingTask} onClose={() => setBriefingTask(null)} />}
      {showNotifications && <NotificationsPanel onClose={() => setShowNotifications(false)} />}
      {showNew && <NewCallModal onClose={() => setShowNew(false)} />}
    </div>
  );
}
