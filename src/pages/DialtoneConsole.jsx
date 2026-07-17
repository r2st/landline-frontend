import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Radio, Mail, MailOpen, MousePointerClick, MessageSquareReply, AlertTriangle,
  Ban, UserPlus, Send, Gauge, ShieldCheck, RefreshCw, Search, Filter, X, ChevronRight,
  ChevronDown, Phone,
} from 'lucide-react';
import EmptyState from '../components/EmptyState';
import SafeHtml from '../components/SafeHtml';
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
  phone_enriched: { label: 'Phone found', icon: Phone, tone: 'green' },
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
  { value: 'phone_enriched', label: 'Phones found' },
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

// Where a feed entry drills down to. Lead discovery points at the company it
// created (or the queue it's still waiting in); everything email-shaped points
// at the contact on the other end. Events with neither — domain health, an
// auto-pause — are system-wide and stay inert rather than linking nowhere.
function targetFor(event) {
  if (event.type === 'lead_discovered') {
    return event.metadata?.company_id
      ? `/companies/${event.metadata.company_id}`
      : '/prospecting';
  }
  return event.metadata?.contact_id ? `/contacts?highlight=${event.metadata.contact_id}` : null;
}

// --- Activity feed row -------------------------------------------------------
// A single event. When the event carries the copy that was sent
// (`metadata.body_html` — populated for Dialtone's own sequence sends), the row
// becomes an expandable disclosure so the operator can read back exactly what
// went out. Sequence sends have no EmailSend row, so this feed is the only place
// that copy lives in the app. Otherwise the row keeps the old behaviour: a link
// to the related contact/company, or a plain, non-interactive line.
function ActivityRow({ it, target }) {
  const [expanded, setExpanded] = useState(false);
  const bodyHtml = it.metadata?.body_html || null;
  const subject = it.metadata?.subject || null;
  const canExpand = Boolean(bodyHtml);

  const rowInner = (
    <>
      <span
        className={cn('mt-1.5 h-2 w-2 flex-shrink-0 rounded-full',
          it.severity === 'error' ? 'bg-red-500' : it.severity === 'warn' ? 'bg-amber-500' : 'bg-indigo-400')}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <EventBadge type={it.type} />
          <span className={cn('truncate text-sm font-medium text-gray-900', (target || canExpand) && 'group-hover:underline')}>
            {it.title}
          </span>
        </div>
        {it.description && (
          <p className="mt-0.5 truncate text-sm text-gray-500">{it.description}</p>
        )}
        {/* Send events carry `to_email`; a discovered lead carries the
            contact enrichment found. Either way it's "the address
            this event is about". */}
        {(it.metadata?.to_email || it.metadata?.contact_email) && (
          <p className="mt-0.5 truncate text-xs text-gray-400">
            {it.metadata.to_email || it.metadata.contact_email}
            {it.metadata?.contact_name ? ` · ${it.metadata.contact_name}` : ''}
          </p>
        )}
      </div>
      <time
        className="flex-shrink-0 whitespace-nowrap text-xs text-gray-400"
        title={absTime(it.timestamp)}
      >
        {relTime(it.timestamp)}
      </time>
      {canExpand ? (
        <ChevronDown
          className={cn('h-4 w-4 flex-shrink-0 self-center text-gray-300 transition-transform', expanded && 'rotate-180')}
          aria-hidden="true"
        />
      ) : target && (
        <ChevronRight className="h-4 w-4 flex-shrink-0 self-center text-gray-300" aria-hidden="true" />
      )}
    </>
  );

  const rowClasses = 'group flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-gray-50 focus:outline-none focus-visible:bg-gray-50';

  // A readable body wins over a navigation target: the sent copy is the detail
  // the operator wants here, and it opens in place.
  if (canExpand) {
    return (
      <li>
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          aria-expanded={expanded}
          aria-label={expanded ? `${it.title} — hide email` : `${it.title} — read email`}
          className={rowClasses}
        >
          {rowInner}
        </button>
        {expanded && (
          <div className="border-t border-gray-100 bg-gray-50/60 px-4 py-3">
            {subject && (
              <p className="mb-2 text-sm font-medium text-gray-700">
                <span className="text-gray-400">Subject: </span>{subject}
              </p>
            )}
            <SafeHtml
              html={bodyHtml}
              className="prose prose-sm max-w-none overflow-x-auto rounded-lg border border-gray-200 bg-white p-3 text-sm text-gray-800"
            />
          </div>
        )}
      </li>
    );
  }

  return (
    <li>
      {target ? (
        <Link
          to={target}
          aria-label={`${it.title} — open details`}
          className="group flex cursor-pointer items-start gap-3 px-4 py-3 hover:bg-gray-50 focus:outline-none focus-visible:bg-gray-50"
        >
          {rowInner}
        </Link>
      ) : (
        <div className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50">{rowInner}</div>
      )}
    </li>
  );
}

// --- Console header stat tiles ----------------------------------------------
// `to` drills the tile's number down to the events behind it.
function StatTile({ label, value, icon: Icon, tone = 'gray', to }) {
  const iconClass = cn('h-4 w-4', {
    indigo: 'text-indigo-400', blue: 'text-blue-400', green: 'text-green-400',
    violet: 'text-violet-400', red: 'text-red-400', amber: 'text-amber-400', gray: 'text-gray-300',
  }[tone]);

  const body = (
    <>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium uppercase tracking-wide text-gray-400">{label}</span>
        <Icon className={iconClass} />
      </div>
      <p className={cn('mt-2 text-2xl font-bold text-gray-900', to && 'underline-offset-4 group-hover:underline')}>
        {value ?? 0}
      </p>
    </>
  );

  const shell = 'rounded-xl border border-gray-200 bg-white p-4 shadow-sm';
  if (!to) return <div className={shell}>{body}</div>;

  return (
    <Link
      to={to}
      aria-label={`${label}: ${value ?? 0}. Filter the activity log to these events`}
      className={cn(
        shell,
        'group block cursor-pointer transition-all hover:-translate-y-0.5 hover:border-gray-300 hover:shadow-md',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 focus-visible:ring-offset-2'
      )}
    >
      {body}
    </Link>
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

  // The tallies above are scoped to the console's reporting day, so their
  // drill-downs must be too. Without the date bounds a tile reading "Sent: 12"
  // opened a feed of every send ever — the number you clicked and the list you
  // landed on didn't reconcile. `end` is expanded to the end of the day by
  // `filters` below, so passing the same date for both bounds means that day.
  const reportingDay = consoleData?.date;
  const drillTo = (type) => {
    const params = new URLSearchParams({ type });
    if (reportingDay) {
      params.set('start', reportingDay);
      params.set('end', reportingDay);
    }
    return `/dialtone?${params}`;
  };

  // Activity feed filters live in the URL: that's what lets the stat tiles above
  // (and links from other pages) be plain links into a filtered log, and keeps
  // the filter bar and the URL from drifting apart.
  const [searchParams, setSearchParams] = useSearchParams();
  const type = searchParams.get('type') || '';
  const start = searchParams.get('start') || '';
  const end = searchParams.get('end') || '';
  const q = searchParams.get('q') || '';
  const [page, setPage] = useState(1);

  const setFilter = (key) => (value) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next, { replace: true });
  };

  const filters = useMemo(() => {
    const f = { page, page_size: PAGE_SIZE };
    if (type) f.types = type;
    if (start) f.start = start;
    // The API treats `end` as an inclusive instant, so a bare date means
    // midnight — i.e. picking today would exclude all of today. Ask for the end
    // of the chosen day, which is what a "To date" picker implies.
    if (end) f.end = `${end}T23:59:59`;
    if (q.trim()) f.q = q.trim();
    return f;
  }, [type, start, end, q, page]);

  const { data: feed, isLoading: feedLoading } = useDialtoneActivity(filters);
  const items = feed?.items || [];
  const total = feed?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const hasFilters = Boolean(type || start || end || q.trim());
  const resetFilters = () => setSearchParams({}, { replace: true });

  // Any filter change — including one arriving from a stat tile — puts the feed
  // back on page 1, or page 3 of the old filter would silently carry over.
  // Adjusted during render (rather than in an effect) so the feed never paints
  // at the stale page first.
  const filterKey = `${type}|${start}|${end}|${q}`;
  const [appliedFilterKey, setAppliedFilterKey] = useState(filterKey);
  if (appliedFilterKey !== filterKey) {
    setAppliedFilterKey(filterKey);
    setPage(1);
  }

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
            <StatTile label="Sent" value={today.emails_sent} icon={Mail} tone="indigo" to={drillTo('email_sent')} />
            <StatTile label="Opens" value={today.opens} icon={MailOpen} tone="blue" to={drillTo('email_opened')} />
            <StatTile label="Clicks" value={today.clicks} icon={MousePointerClick} tone="violet" to={drillTo('email_clicked')} />
            <StatTile label="Replies" value={today.replies} icon={MessageSquareReply} tone="green" to={drillTo('reply')} />
            <StatTile label="Bounces" value={today.bounces} icon={AlertTriangle} tone="red" to={drillTo('bounced')} />
            <StatTile label="Errors" value={today.errors} icon={AlertTriangle} tone="red" to={drillTo('error')} />
            <StatTile label="Leads found" value={today.leads_discovered} icon={UserPlus} tone="blue" to={drillTo('lead_discovered')} />
            {/* Remaining is warm-up headroom, not a count of events — nothing to drill into. */}
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
                  onChange={(e) => setFilter('q')(e.target.value)}
                  placeholder="Search contact or email…"
                  className="w-44 rounded-lg border border-gray-200 py-1.5 pl-8 pr-2 text-sm focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                />
              </div>
              <select
                value={type}
                onChange={(e) => setFilter('type')(e.target.value)}
                className="rounded-lg border border-gray-200 py-1.5 pl-2.5 pr-8 text-sm focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
              >
                {FILTER_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              <input
                type="date"
                value={start}
                onChange={(e) => setFilter('start')(e.target.value)}
                aria-label="From date"
                className="rounded-lg border border-gray-200 px-2 py-1.5 text-sm text-gray-600 focus:border-indigo-400 focus:outline-none focus:ring-1 focus:ring-indigo-400"
              />
              <input
                type="date"
                value={end}
                onChange={(e) => setFilter('end')(e.target.value)}
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
                  <ActivityRow key={it.id} it={it} target={targetFor(it)} />
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
