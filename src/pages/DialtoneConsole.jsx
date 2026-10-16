import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Radio, Mail, MailOpen, MousePointerClick, MessageSquareReply, AlertTriangle,
  Ban, UserPlus, Send, Gauge, ShieldCheck, RefreshCw, Search, Filter, X, ChevronRight,
  ChevronDown, Phone, ArrowUp, ArrowDown, Minus, CalendarRange,
} from 'lucide-react';
import HelpIcon from '../components/HelpIcon';
import EmptyState from '../components/EmptyState';
import LiveActivityFeed from '../components/LiveActivityFeed';
import SafeHtml from '../components/SafeHtml';
import SendingKillSwitch from '../components/SendingKillSwitch';
import { useDialtoneConsole, useDialtoneActivity, usePhoneEnrichment } from '../hooks/useDialtone';
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

// Reporting windows the stats endpoints accept, in menu order. Values must match
// app/services/timeframes.py — the API 400s on anything else.
const TIMEFRAMES = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'this_week', label: 'This week' },
  { value: 'last_week', label: 'Last week' },
  { value: 'this_month', label: 'This month' },
  { value: 'last_month', label: 'Last month' },
  { value: 'all_time', label: 'All time' },
];

// What the console shows before anyone touches the selector. A week is wide
// enough that a quiet morning doesn't read as a dead agent, and narrow enough to
// still be about right now.
const DEFAULT_TIMEFRAME = 'this_week';

const timeframeLabel = (value) =>
  TIMEFRAMES.find((t) => t.value === value)?.label || 'This week';

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

// --- Timeframe selector ------------------------------------------------------
// A pill group rather than a <select>: the whole page's numbers hang off this
// one choice, so the current window should be readable without opening anything.
function TimeframeSelector({ value, onChange }) {
  return (
    <div
      role="group"
      aria-label="Stats timeframe"
      className="inline-flex flex-wrap items-center gap-1 rounded-xl border border-gray-200 bg-white p-1 shadow-sm"
    >
      <CalendarRange className="ml-1.5 mr-0.5 h-4 w-4 flex-shrink-0 text-gray-400" aria-hidden="true" />
      {TIMEFRAMES.map((t) => {
        const active = t.value === value;
        return (
          <button
            key={t.value}
            type="button"
            onClick={() => onChange(t.value)}
            aria-pressed={active}
            className={cn(
              'rounded-lg px-2.5 py-1 text-sm font-medium transition-colors',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500',
              active
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            )}
          >
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

// --- Stat presentation -------------------------------------------------------
// Percent change vs the previous period of the same length. `invert` flips the
// colour for metrics where up is bad (bounces, errors) — a red +40% on bounces
// and a green +40% on replies are both "more", and only one is good news.
//
// `undefined` means this metric has no comparison at all — either the timeframe
// has no previous period (all time), or the number isn't a count of events in the
// window (warm-up headroom). `null` means there *is* a previous period but it was
// empty, so a percentage would divide by zero: that reads as "New" when something
// happened this period, and as nothing at all when both are empty — "+∞%" and
// "0%" would both be lies.
function DeltaChip({ value, current = 0, invert = false }) {
  if (value === undefined) return null;
  if (value === null) {
    if (!current) return null;
    return (
      <span
        title="No activity in the previous period"
        className="inline-flex items-center rounded-full bg-gray-100 px-1.5 py-0.5 text-[11px] font-medium text-gray-500"
      >
        New
      </span>
    );
  }
  const flat = value === 0;
  const up = value > 0;
  const good = flat ? null : (invert ? !up : up);
  const Icon = flat ? Minus : up ? ArrowUp : ArrowDown;
  return (
    <span
      title={`${up ? '+' : ''}${value}% vs the previous period`}
      className={cn(
        'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-semibold',
        good === null && 'bg-gray-100 text-gray-500',
        good === true && 'bg-green-50 text-green-700',
        good === false && 'bg-red-50 text-red-700'
      )}
    >
      <Icon className="h-3 w-3" aria-hidden="true" />
      {Math.abs(value)}%
    </span>
  );
}

// Rates arrive as fractions (0..1) from the API.
const asPct = (fraction) =>
  fraction === null || fraction === undefined ? null : `${Math.round(fraction * 100)}%`;

// "52% of sends", or nothing at all when the rate is missing. Interpolating
// `asPct` straight into a template renders the literal string "null of sends"
// against a backend that doesn't send `rates` yet — which is every request in
// the window where the frontend has deployed and the API hasn't.
const ofSends = (fraction) => {
  const pct = asPct(fraction);
  return pct === null ? null : `${pct} of sends`;
};

// One number in the funnel: prominent value, label, delta vs previous period,
// and the rate it converts at. `to` drills down to the events behind the number.
function StatCell({ label, value, icon: Icon, tone = 'gray', to, delta, sub, invert }) {
  const iconClass = cn('h-4 w-4', {
    indigo: 'text-indigo-400', blue: 'text-blue-400', green: 'text-green-400',
    violet: 'text-violet-400', red: 'text-red-400', amber: 'text-amber-400', gray: 'text-gray-300',
  }[tone]);
  const count = value ?? 0;

  const body = (
    <>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium uppercase tracking-wide text-gray-500">{label}</span>
        <Icon className={iconClass} aria-hidden="true" />
      </div>
      <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <p className={cn('text-3xl font-bold leading-none text-gray-900', to && 'underline-offset-4 group-hover:underline')}>
          {count.toLocaleString()}
        </p>
        <DeltaChip value={delta} current={count} invert={invert} />
      </div>
      <p className="mt-1.5 h-4 text-xs text-gray-500">{sub || ''}</p>
    </>
  );

  const shell = 'rounded-xl border border-gray-200 bg-white p-4 shadow-sm';
  if (!to) return <div className={shell}>{body}</div>;

  return (
    <Link
      to={to}
      aria-label={`${label}: ${count}. Filter the activity log to these events`}
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

// The outreach funnel, read left to right: what went out, and how much of it
// landed. Grouping these four (rather than scattering them among bounces, errors
// and warm-up headroom) is what makes the drop-off between them legible.
function FunnelCard({ stats, deltas, rates, label, drillTo, comparable }) {
  const sent = stats.emails_sent ?? 0;
  // With no previous period (all time) there is nothing to compare against, and
  // an absent delta is what tells the chip to stay away entirely.
  const delta = (key) => (comparable ? deltas[key] ?? null : undefined);
  const steps = [
    {
      key: 'email_sent', label: 'Sent', value: sent, icon: Mail, tone: 'indigo',
      delta: delta('emails_sent'), sub: 'emails on the wire',
    },
    {
      key: 'email_opened', label: 'Opens', value: stats.opens, icon: MailOpen, tone: 'blue',
      delta: delta('opens'), sub: sent ? ofSends(rates.open_rate) : null,
    },
    {
      key: 'email_clicked', label: 'Clicks', value: stats.clicks, icon: MousePointerClick, tone: 'violet',
      delta: delta('clicks'), sub: sent ? ofSends(rates.click_rate) : null,
    },
    {
      key: 'reply', label: 'Replies', value: stats.replies, icon: MessageSquareReply, tone: 'green',
      delta: delta('replies'), sub: sent ? ofSends(rates.reply_rate) : null,
    },
  ];

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
          <Send className="h-4 w-4 text-indigo-500" />
          Outreach funnel
        </h2>
        <span className="text-xs font-medium text-gray-500">{label}</span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {steps.map((s) => (
          <StatCell
            key={s.key}
            label={s.label}
            value={s.value}
            icon={s.icon}
            tone={s.tone}
            delta={s.delta}
            sub={s.sub}
            to={drillTo(s.key)}
          />
        ))}
      </div>
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

// Warm-lead phone-enrichment roll-up: how many engaged contacts now have a
// callable number, the hit rate against attempts, the Apollo-direct-dial vs
// company-line split, and the latest finds. Distinct from the activity feed's
// per-event "Phone found" rows — this is the standing scoreboard.
function PhoneEnrichmentCard({ summary, label }) {
  const enriched = summary?.enriched ?? 0;
  const attempts = summary?.attempts ?? 0;
  const apollo = summary?.apollo ?? 0;
  const company = summary?.company ?? 0;
  const recent = Array.isArray(summary?.recent) ? summary.recent : [];
  const hitPct = summary?.hit_rate != null ? Math.round(summary.hit_rate * 100) : 0;
  // Split bar widths, guarding a divide-by-zero when nothing is enriched yet.
  const apolloPct = enriched > 0 ? Math.round((apollo / enriched) * 100) : 0;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
          <Phone className="h-4 w-4 text-green-500" />
          Phone enrichment
        </h2>
        <span className="text-xs text-gray-400">
          {attempts} looked up{label ? ` · ${label.toLowerCase()}` : ''}
        </span>
      </div>

      {enriched === 0 && attempts === 0 ? (
        <p className="mt-4 text-sm text-gray-400">
          No numbers found in this period. Dialtone enriches warm leads with a phone number as they engage.
        </p>
      ) : (
        <>
          <div className="mt-4 flex items-end gap-6">
            <div>
              <p className="text-3xl font-bold text-gray-900">{enriched}</p>
              <p className="text-xs text-gray-400">contacts with a number</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-gray-900">
                {hitPct}<span className="text-base font-medium text-gray-400">%</span>
              </p>
              <p className="text-xs text-gray-400">hit rate</p>
            </div>
          </div>

          {/* Source split: Apollo direct dials vs company-line fallbacks. */}
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>Direct dial <span className="font-medium text-gray-700">{apollo}</span></span>
              <span>Company line <span className="font-medium text-gray-700">{company}</span></span>
            </div>
            <div className="mt-1.5 flex h-2 overflow-hidden rounded-full bg-gray-100">
              <div className="h-full bg-green-500" style={{ width: `${apolloPct}%` }} title={`${apollo} direct dial`} />
              <div className="h-full bg-teal-400" style={{ width: `${100 - apolloPct}%` }} title={`${company} company line`} />
            </div>
          </div>

          {recent.length > 0 && (
            <div className="mt-4">
              <h3 className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Recent</h3>
              <ul className="mt-1.5 space-y-1.5">
                {recent.slice(0, 5).map((r) => (
                  <li key={r.contact_id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="min-w-0 truncate text-gray-700">
                      {r.contact_id ? (
                        <Link to={`/contacts?highlight=${r.contact_id}`} className="hover:underline">
                          {r.contact_name || 'Unknown'}
                        </Link>
                      ) : (
                        r.contact_name || 'Unknown'
                      )}
                      {r.company_name && <span className="text-gray-400"> · {r.company_name}</span>}
                    </span>
                    <span
                      className={cn(
                        'flex-shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset',
                        r.source === 'apollo' ? TONE.green : TONE.teal
                      )}
                    >
                      {r.source_label || r.source || 'phone'}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function DialtoneConsole() {
  // Everything on this page — stats, enrichment card, activity feed — is scoped
  // to one window, and that window lives in the URL alongside the feed filters
  // so a console view is a shareable link.
  const [searchParams, setSearchParams] = useSearchParams();
  const timeframe = searchParams.get('timeframe') || DEFAULT_TIMEFRAME;

  const { data: consoleData, isLoading: consoleLoading, refetch, isFetching } = useDialtoneConsole(timeframe);
  const { data: phoneSummary } = usePhoneEnrichment(8, timeframe);
  // `stats` is the timeframe-aware field; `today` is the pre-timeframe name the
  // API still mirrors, so an older backend keeps rendering numbers.
  const stats = consoleData?.stats || consoleData?.today || {};
  const deltas = consoleData?.deltas || {};
  const rates = consoleData?.rates || {};
  const warmup = consoleData?.warmup || {};
  const label = consoleData?.timeframe_label || timeframeLabel(timeframe);
  // All-time has no period before it, so there's nothing to show a change against.
  const comparable = Boolean(consoleData?.previous);
  const delta = (key) => (comparable ? deltas[key] ?? null : undefined);

  const type = searchParams.get('type') || '';
  const q = searchParams.get('q') || '';
  const [page, setPage] = useState(1);

  // The feed follows the selected timeframe unless the operator hand-picks
  // dates. Deriving the bounds from the window the API reported (rather than
  // recomputing week/month starts here) is what keeps a tile reading "Sent: 12"
  // and the list it opens telling the same story.
  const rangeStart = consoleData?.range_start || '';
  const rangeEnd = consoleData?.range_end || '';
  const start = searchParams.get('start') || rangeStart;
  const end = searchParams.get('end') || rangeEnd;

  // Tiles only need to add the event type: the window is already applied.
  const drillTo = (eventType) => {
    const params = new URLSearchParams({ type: eventType });
    if (timeframe !== DEFAULT_TIMEFRAME) params.set('timeframe', timeframe);
    if (searchParams.get('start')) params.set('start', searchParams.get('start'));
    if (searchParams.get('end')) params.set('end', searchParams.get('end'));
    if (q.trim()) params.set('q', q.trim());
    return `/dialtone?${params}`;
  };

  const setFilter = (key) => (value) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    setSearchParams(next, { replace: true });
  };

  // Switching timeframe drops any hand-picked dates, so the feed snaps back to
  // the new window instead of showing last month's rows under this week's stats.
  const setTimeframe = (value) => {
    const next = new URLSearchParams(searchParams);
    if (value && value !== DEFAULT_TIMEFRAME) next.set('timeframe', value);
    else next.delete('timeframe');
    next.delete('start');
    next.delete('end');
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

  // The timeframe isn't a "filter" to clear — it's the window the whole page is
  // reporting on, and Clear returns it to the default along with everything else.
  const hasFilters = Boolean(
    type || q.trim() || searchParams.get('start') || searchParams.get('end') ||
    timeframe !== DEFAULT_TIMEFRAME
  );
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
            Autopilot Console
            <HelpIcon articleId="dialtone-console" />
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

      {/* Which window every number below covers. */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <TimeframeSelector value={timeframe} onChange={setTimeframe} />
        <p className="text-xs text-gray-500">
          {rangeStart && rangeEnd
            ? (rangeStart === rangeEnd ? rangeStart : `${rangeStart} → ${rangeEnd}`)
            : 'All recorded activity'}
          {consoleData?.previous ? ' · change vs the previous period' : ''}
        </p>
      </div>

      {/* Stats: the send→reply funnel, plus the warm-up ramp it runs inside. */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <FunnelCard
            stats={stats}
            deltas={deltas}
            rates={rates}
            label={label}
            drillTo={drillTo}
            comparable={comparable}
          />
        </div>
        <WarmupCard warmup={warmup} />
      </div>

      {/* Deliverability problems and pipeline — separate from the funnel because
          they're read differently: here, up is bad (except leads found). */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCell
          label="Bounces" value={stats.bounces} icon={AlertTriangle} tone="red" invert
          delta={delta('bounces')} to={drillTo('bounced')}
          sub={stats.emails_sent && asPct(rates.bounce_rate) ? `${asPct(rates.bounce_rate)} of attempts` : null}
        />
        <StatCell
          label="Errors" value={stats.errors} icon={AlertTriangle} tone="amber" invert
          delta={delta('errors')} to={drillTo('error')} sub="failed to send"
        />
        <StatCell
          label="Leads found" value={stats.leads_discovered} icon={UserPlus} tone="blue"
          delta={delta('leads_discovered')} to={drillTo('lead_discovered')} sub="new prospects"
        />
        {/* Warm-up headroom is a today-only cap, not a count of events in the
            selected window — nothing to drill into, and no delta to compare. */}
        <StatCell
          label="Remaining" value={warmup.daily_remaining} icon={Gauge} tone="gray"
          sub="sends left today"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-1">
          {/* What's happening right now, above the state-of-the-world cards.
              Separate from the archive feed below because they answer different
              questions: this one is "is it working, this minute", that one is
              "what happened in the window I selected". */}
          <LiveActivityFeed />
          <SendersCard senders={consoleData?.senders} />
          <PhoneEnrichmentCard summary={phoneSummary} label={label} />
        </div>

        {/* Activity log */}
        <div className="lg:col-span-2">
          <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
            {/* Filter bar */}
            <div className="flex flex-wrap items-center gap-2 border-b border-gray-100 p-4">
              <div className="flex items-center gap-1.5 text-sm font-semibold text-gray-900">
                <Filter className="h-4 w-4 text-gray-400" />
                Activity
                {/* The feed shares the stats' window, so say which one. */}
                <span className="font-normal text-gray-400">· {label}</span>
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
                    : "Autopilot's actions — sends, opens, replies, bounces and discovered leads — will stream in here."
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
