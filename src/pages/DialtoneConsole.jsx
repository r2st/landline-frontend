import { useMemo, useState } from 'react';
import {
  Radio, Mail, MailOpen, MousePointerClick, MessageSquareReply, AlertTriangle,
  Ban, UserPlus, Send, Gauge, ShieldCheck, RefreshCw, Search, Filter, X,
} from 'lucide-react';
import EmptyState from '../components/EmptyState';
import SendingKillSwitch from '../components/SendingKillSwitch';
import { useDialtoneConsole, useDialtoneActivity } from '../hooks/useDialtone';
import { cn } from '../lib/utils';

// --- Event type presentation -------------------------------------------------
const EVENT_META = {
  email_sent: { label: 'Sent', icon: Mail, tone: 'indigo' },
  email_opened: { label: 'Opened', icon: MailOpen, tone: 'blue' },
  email_clicked: { label: 'Clicked', icon: MousePointerClick, tone: 'violet' },
  reply: { label: 'Reply', icon: MessageSquareReply, tone: 'green' },
  delivered: { label: 'Delivered', icon: Send, tone: 'teal' },
  bounced: { label: 'Bounced', icon: AlertTriangle, tone: 'red' },
  unsubscribed: { label: 'Unsubscribed', icon: Ban, tone: 'amber' },
  error: { label: 'Error', icon: AlertTriangle, tone: 'red' },
  lead_discovered: { label: 'Lead found', icon: UserPlus, tone: 'blue' },
};

const TONE = {
  indigo: 'bg-indigo-50 text-indigo-700 ring-indigo-600/20',
  blue: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  violet: 'bg-violet-50 text-violet-700 ring-violet-600/20',
  green: 'bg-green-50 text-green-700 ring-green-600/20',
  teal: 'bg-teal-50 text-teal-700 ring-teal-600/20',
  red: 'bg-red-50 text-red-700 ring-red-600/20',
  amber: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  gray: 'bg-gray-100 text-gray-600 ring-gray-500/20',
};

const FILTER_TYPES = [
  { value: '', label: 'All events' },
  { value: 'email_sent', label: 'Sent' },
  { value: 'email_opened', label: 'Opened' },
  { value: 'email_clicked', label: 'Clicked' },
  { value: 'reply', label: 'Replies' },
  { value: 'bounced', label: 'Bounces' },
  { value: 'error', label: 'Errors' },
  { value: 'unsubscribed', label: 'Unsubscribes' },
  { value: 'lead_discovered', label: 'Leads found' },
];

const PAGE_SIZE = 50;

function relTime(iso) {
  const d = new Date(iso);
  if (isNaN(d)) return '';
  const secs = Math.round((Date.now() - d.getTime()) / 1000);
  if (secs < 60) return 'just now';
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function absTime(iso) {
  const d = new Date(iso);
  if (isNaN(d)) return '';
  return d.toLocaleString('en-US', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  });
}

function EventBadge({ type }) {
  const meta = EVENT_META[type] || { label: type, icon: Radio, tone: 'gray' };
  const Icon = meta.icon;
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset', TONE[meta.tone])}>
      <Icon className="h-3 w-3" />
      {meta.label}
    </span>
  );
}

// --- Console header stat tiles ----------------------------------------------
function StatTile({ label, value, icon: Icon, tone = 'gray' }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-gray-400">{label}</span>
        <Icon className={cn('h-4 w-4', {
          indigo: 'text-indigo-400', blue: 'text-blue-400', green: 'text-green-400',
          violet: 'text-violet-400', red: 'text-red-400', amber: 'text-amber-400', gray: 'text-gray-300',
        }[tone])} />
      </div>
      <p className="mt-2 text-2xl font-bold text-gray-900">{value ?? 0}</p>
    </div>
  );
}

function WarmupCard({ warmup }) {
  const sent = warmup?.today_sent ?? 0;
  const limit = warmup?.daily_limit ?? 0;
  const pct = limit > 0 ? Math.min(100, Math.round((sent / limit) * 100)) : 0;
  const near = pct >= 90;
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
          <Gauge className="h-4 w-4 text-indigo-500" />
          Warm-up progress
        </h2>
        {warmup?.warmup_active ? (
          <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20">
            Week {warmup?.warmup_week ?? '—'}
          </span>
        ) : (
          <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
            Fully warmed
          </span>
        )}
      </div>
      <div className="mt-4 flex items-end justify-between">
        <p className="text-3xl font-bold text-gray-900">
          {sent}
          <span className="ml-1 text-base font-medium text-gray-400">/ {limit || '—'} today</span>
        </p>
        <p className="text-sm text-gray-500">{warmup?.daily_remaining ?? 0} left</p>
      </div>
      <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
        <div
          className={cn('h-full rounded-full transition-all', near ? 'bg-amber-500' : 'bg-indigo-500')}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="mt-2 text-xs text-gray-400">{warmup?.monthly_sent ?? 0} sent in the last 30 days</p>
    </div>
  );
}

function SendersCard({ senders }) {
  const list = senders || [];
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
        <ShieldCheck className="h-4 w-4 text-indigo-500" />
        Senders
      </h2>
      {list.length === 0 ? (
        <p className="mt-4 text-sm text-gray-400">No sending accounts connected yet.</p>
      ) : (
        <div className="mt-3 space-y-2">
          {list.map((s) => {
            const limit = s.effective_daily_limit || 0;
            const used = s.used_today || 0;
            const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
            return (
              <div key={s.account_id} className="rounded-lg border border-gray-100 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm font-medium text-gray-700">{s.email || 'unknown'}</span>
                  <span
                    className={cn('ml-2 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
                      s.health_status === 'healthy' && TONE.green,
                      s.health_status === 'watch' && TONE.amber,
                      (s.health_status === 'throttled' || s.health_status === 'critical') && TONE.red,
                      !['healthy', 'watch', 'throttled', 'critical'].includes(s.health_status) && TONE.gray,
                    )}
                  >
                    {s.health_status}
                  </span>
                </div>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-gray-100">
                  <div className="h-full rounded-full bg-indigo-400" style={{ width: `${pct}%` }} />
                </div>
                <p className="mt-1 text-xs text-gray-400">
                  {used}/{limit || '—'} today
                  {s.warmup_daily_limit != null && ' · warming up'}
                  {s.reputation_score != null && ` · rep ${s.reputation_score}/100`}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function DialtoneConsole() {
  const { data: consoleData, isLoading: consoleLoading, refetch, isFetching } = useDialtoneConsole();
  const today = consoleData?.today || {};
  const warmup = consoleData?.warmup || {};

  // Activity feed filters.
  const [type, setType] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [q, setQ] = useState('');
  const [page, setPage] = useState(1);

  const filters = useMemo(() => {
    const f = { page, page_size: PAGE_SIZE };
    if (type) f.types = type;
    if (start) f.start = start;
    if (end) f.end = end;
    if (q.trim()) f.q = q.trim();
    return f;
  }, [type, start, end, q, page]);

  const { data: feed, isLoading: feedLoading } = useDialtoneActivity(filters);
  const items = feed?.items || [];
  const total = feed?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const hasFilters = type || start || end || q.trim();
  const resetFilters = () => {
    setType(''); setStart(''); setEnd(''); setQ(''); setPage(1);
  };
  // Any filter change resets to page 1.
  const onFilterChange = (setter) => (val) => { setter(val); setPage(1); };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-900">
            <span className="relative flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-indigo-500" />
            </span>
            Dialtone Console
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Live activity log — everything the autonomous cold-email agent is doing
            {consoleData?.date ? ` · ${consoleData.date}` : ''}
          </p>
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-600 shadow-sm hover:bg-gray-50"
        >
          <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} />
          Refresh
        </button>
      </div>

      {/* Global sending status + kill switch */}
      <SendingKillSwitch compact />

      {/* Console header: warm-up + senders + today's tallies */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <WarmupCard warmup={warmup} />
        <div className="lg:col-span-2">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile label="Sent" value={today.emails_sent} icon={Mail} tone="indigo" />
            <StatTile label="Opens" value={today.opens} icon={MailOpen} tone="blue" />
            <StatTile label="Clicks" value={today.clicks} icon={MousePointerClick} tone="violet" />
            <StatTile label="Replies" value={today.replies} icon={MessageSquareReply} tone="green" />
            <StatTile label="Bounces" value={today.bounces} icon={AlertTriangle} tone="red" />
            <StatTile label="Errors" value={today.errors} icon={AlertTriangle} tone="red" />
            <StatTile label="Leads found" value={today.leads_discovered} icon={UserPlus} tone="blue" />
            <StatTile label="Remaining" value={warmup.daily_remaining} icon={Gauge} tone="gray" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <SendersCard senders={consoleData?.senders} />
        </div>

        {/* Activity log */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
            {/* Filter bar */}
            <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 p-4">
              <div className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
                <Filter className="h-4 w-4 text-gray-400" />
                Activity
              </div>
              <div className="relative ml-auto">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={q}
                  onChange={(e) => onFilterChange(setQ)(e.target.value)}
                  placeholder="Search contact or email…"
                  className="w-44 rounded-lg border border-gray-200 py-1.5 pl-8 pr-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                />
              </div>
              <select
                value={type}
                onChange={(e) => onFilterChange(setType)(e.target.value)}
                className="rounded-lg border border-gray-200 py-1.5 pl-2.5 pr-8 text-sm focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
              >
                {FILTER_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              <input
                type="date"
                value={start}
                onChange={(e) => onFilterChange(setStart)(e.target.value)}
                aria-label="From date"
                className="rounded-lg border border-gray-200 px-2 py-1.5 text-sm text-gray-600 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
              />
              <input
                type="date"
                value={end}
                onChange={(e) => onFilterChange(setEnd)(e.target.value)}
                aria-label="To date"
                className="rounded-lg border border-gray-200 px-2 py-1.5 text-sm text-gray-600 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
              />
              {hasFilters && (
                <button
                  type="button"
                  onClick={resetFilters}
                  className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm text-gray-500 hover:bg-gray-100"
                >
                  <X className="h-3.5 w-3.5" />
                  Clear
                </button>
              )}
            </div>

            {/* Feed */}
            {feedLoading && items.length === 0 ? (
              <div className="space-y-2 p-4">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-12 animate-pulse rounded-lg bg-gray-100" />
                ))}
              </div>
            ) : items.length === 0 ? (
              <EmptyState
                icon={Radio}
                title={hasFilters ? 'No matching activity' : 'No activity yet'}
                description={
                  hasFilters
                    ? 'Try widening the date range or clearing filters.'
                    : "Dialtone's actions — sends, opens, replies, bounces and discovered leads — will stream in here."
                }
              />
            ) : (
              <ul className="divide-y divide-gray-50">
                {items.map((it) => (
                  <li key={it.id} className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50">
                    <span
                      className={cn('mt-1.5 h-2 w-2 flex-shrink-0 rounded-full',
                        it.severity === 'error' ? 'bg-red-500' : it.severity === 'warn' ? 'bg-amber-500' : 'bg-indigo-400')}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <EventBadge type={it.type} />
                        <span className="truncate text-sm font-medium text-gray-900">{it.title}</span>
                      </div>
                      {it.description && (
                        <p className="mt-0.5 truncate text-sm text-gray-500">{it.description}</p>
                      )}
                      {it.metadata?.to_email && (
                        <p className="mt-0.5 truncate text-xs text-gray-400">{it.metadata.to_email}</p>
                      )}
                    </div>
                    <time
                      className="flex-shrink-0 whitespace-nowrap text-xs text-gray-400"
                      title={absTime(it.timestamp)}
                    >
                      {relTime(it.timestamp)}
                    </time>
                  </li>
                ))}
              </ul>
            )}

            {/* Pagination */}
            {total > PAGE_SIZE && (
              <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3 text-sm">
                <span className="text-gray-500">
                  {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} of {total}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page <= 1}
                    className="rounded-lg border border-gray-200 px-3 py-1 font-medium text-gray-600 disabled:opacity-40 enabled:hover:bg-gray-50"
                  >
                    Prev
                  </button>
                  <span className="text-gray-500">Page {page} / {totalPages}</span>
                  <button
                    type="button"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page >= totalPages}
                    className="rounded-lg border border-gray-200 px-3 py-1 font-medium text-gray-600 disabled:opacity-40 enabled:hover:bg-gray-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {consoleLoading && (
        <p className="text-center text-xs text-gray-400">Loading console…</p>
      )}
    </div>
  );
}
