import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Radio, Mail, MailOpen, MousePointerClick, MessageSquareReply, AlertTriangle,
  Ban, UserPlus, Send, Phone, Pause, Play,
} from 'lucide-react';
import { useLiveActivity } from '../hooks/useDialtone';
import { cn } from '../lib/utils';

// Mirrors the Console's archive-feed vocabulary so an event doesn't change
// colour depending on which panel you happen to be reading it in.
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

/**
 * "2m ago", measured against the *server's* clock.
 *
 * A viewer whose laptop is a few minutes fast otherwise sees sends that
 * happened "in 3 minutes", which reads as a bug in the sending engine rather
 * than a bug in their clock. `serverTime` comes back with every poll.
 */
function relativeTo(serverTime, iso) {
  if (!iso) return '';
  const now = serverTime ? new Date(serverTime) : new Date();
  const then = new Date(iso);
  const seconds = Math.round((now - then) / 1000);
  if (!Number.isFinite(seconds)) return '';
  if (seconds < 10) return 'just now';
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function absolute(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function targetFor(event) {
  if (event.type === 'lead_discovered') {
    return event.metadata?.company_id
      ? `/companies/${event.metadata.company_id}`
      : '/prospecting';
  }
  return event.metadata?.contact_id
    ? `/contacts?highlight=${event.metadata.contact_id}`
    : null;
}

function FeedRow({ event, serverTime }) {
  const meta = EVENT_META[event.type] || { label: event.type, icon: Radio, tone: 'gray' };
  const Icon = meta.icon;
  const target = targetFor(event);
  const address = event.metadata?.to_email || event.metadata?.contact_email;

  const inner = (
    <>
      <span
        className={cn(
          'mt-1.5 h-2 w-2 flex-shrink-0 rounded-full',
          event.severity === 'error' ? 'bg-red-500'
            : event.severity === 'warn' ? 'bg-amber-500' : 'bg-indigo-400',
        )}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className={cn(
            'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset',
            TONE[meta.tone],
          )}>
            <Icon className="h-3 w-3" />
            {meta.label}
          </span>
          <span className={cn('truncate text-sm text-gray-900', target && 'group-hover:underline')}>
            {event.title}
          </span>
        </div>
        {address && (
          <p className="mt-0.5 truncate text-xs text-gray-400">{address}</p>
        )}
      </div>
      <time
        className="flex-shrink-0 whitespace-nowrap text-xs text-gray-400"
        dateTime={event.timestamp}
        title={absolute(event.timestamp)}
      >
        {relativeTo(serverTime, event.timestamp)}
      </time>
    </>
  );

  const classes =
    'group flex w-full items-start gap-3 px-4 py-2.5 text-left hover:bg-gray-50';

  return (
    <li className="border-b border-gray-50 last:border-0">
      {target
        ? <Link to={target} className={classes}>{inner}</Link>
        : <div className={cn(classes, 'cursor-default')}>{inner}</div>}
    </li>
  );
}

/**
 * The Console's running feed: sends, opens, clicks and replies as they land.
 *
 * Polls `/dialtone/activity/live`, which looks back a bounded window and takes
 * a cursor, so the cost of "anything new?" doesn't grow with the send history
 * the way paging the archive endpoint does.
 *
 * The pause control is not decoration. Rows arriving while someone is reading
 * or mid-click shift the list under the cursor; pausing freezes what's on
 * screen and the poll resumes from the same cursor, so nothing is missed —
 * it's a display freeze, not a subscription drop.
 */
export default function LiveActivityFeed({ limit = 25, windowHours = 24 }) {
  const [paused, setPaused] = useState(false);
  const { items, serverTime, isLoading, isFetching } = useLiveActivity({
    limit,
    windowHours,
    enabled: !paused,
  });

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-3">
        <span className="relative flex h-2 w-2" aria-hidden="true">
          {!paused && (
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-75" />
          )}
          <span className={cn(
            'relative inline-flex h-2 w-2 rounded-full',
            paused ? 'bg-gray-300' : 'bg-green-500',
          )} />
        </span>
        <h2 className="text-sm font-semibold text-gray-900">Live activity</h2>
        <span className="text-xs text-gray-400">
          {paused ? 'paused' : `last ${windowHours}h`}
        </span>
        <button
          type="button"
          onClick={() => setPaused((v) => !v)}
          aria-pressed={paused}
          className="ml-auto inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1 text-xs text-gray-600 hover:bg-gray-50"
        >
          {paused
            ? <><Play className="h-3 w-3" /> Resume</>
            : <><Pause className="h-3 w-3" /> Pause</>}
        </button>
      </div>

      {isLoading ? (
        <p className="px-4 py-6 text-sm text-gray-400">Waiting for activity…</p>
      ) : items.length === 0 ? (
        // Say what was looked at, not just "nothing". An empty feed over a
        // 24-hour window means something quite different from an empty system.
        <p className="px-4 py-6 text-sm text-gray-400">
          Nothing in the last {windowHours} hours.
        </p>
      ) : (
        <ul className="max-h-[28rem] overflow-y-auto">
          {items.slice(0, limit).map((event) => (
            <FeedRow key={event.id} event={event} serverTime={serverTime} />
          ))}
        </ul>
      )}

      {isFetching && !isLoading && (
        <p className="border-t border-gray-50 px-4 py-1.5 text-[11px] text-gray-300">
          checking…
        </p>
      )}
    </div>
  );
}
