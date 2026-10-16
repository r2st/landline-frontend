import { useQuery } from '@tanstack/react-query';
import { Clock, Globe, CalendarClock } from 'lucide-react';
import { sendTimingApi } from '../api/client';
import { DAY_NAMES_FULL, hourLabel, pct, windowLabel } from '../lib/sendTiming';
import { cn } from '../lib/utils';

// Where the send window came from, in Autopilot's colour language: a learned
// per-contact signal (indigo) is stronger than a cohort fallback (blue), which
// is stronger than the global default (gray).
const SOURCE_STYLES = {
  personal: { label: 'Personal signal', chip: 'bg-indigo-50 text-indigo-700 ring-indigo-600/20' },
  cohort: { label: 'Cohort signal', chip: 'bg-blue-50 text-blue-700 ring-blue-600/20' },
  default: { label: 'Default window', chip: 'bg-gray-100 text-gray-600 ring-gray-500/20' },
};

// The single best day/hour learned for this contact, if the profile has one.
// Distinct from the window, which is a broader band the sender actually targets.
function bestSlot(data) {
  const dow = data?.profile?.best_dow;
  const hour = data?.profile?.best_hour;
  if (dow == null || hour == null) return null;
  const day = DAY_NAMES_FULL[dow];
  if (!day) return null;
  return `${day}, ${hourLabel(hour)}`;
}

// Render the contact-local next optimal send. The timestamp is UTC; show it in
// the recipient's timezone so "9 AM" means 9 AM to them, not to us.
function nextSendLabel(iso, tz) {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  try {
    return d.toLocaleString('en-US', {
      timeZone: tz || undefined,
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    // Bad/unknown tz string — fall back to the viewer's local rendering.
    return d.toLocaleString('en-US', {
      weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
    });
  }
}

/**
 * Per-contact Smart Send-Time panel for the contact detail view. Reads the
 * contact's resolved timezone, learned engagement profile, and computed optimal
 * window from `/dialtone/send-timing/contacts/{id}`.
 *
 * This is a best-effort enrichment: if the endpoint 404s or the feature is off,
 * the panel stays quiet rather than shouting an error over the contact card.
 */
export default function ContactSendTiming({ contactId }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['contact-send-timing', contactId],
    queryFn: () => sendTimingApi.contact(contactId),
    enabled: !!contactId,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  // Don't render a broken/empty panel — send timing is a bonus, not core data.
  if (!contactId || isError) return null;

  if (isLoading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50/60 p-3">
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <Clock className="h-3.5 w-3.5 animate-pulse" />
          Loading best send time…
        </div>
      </div>
    );
  }
  if (!data) return null;

  const source = data.window?.source || 'default';
  const sourceStyle = SOURCE_STYLES[source] || SOURCE_STYLES.default;
  const best = bestSlot(data);
  const nextSend = nextSendLabel(data.next_send_at, data.timezone);
  const confidence = data.window?.confidence;

  return (
    <div className="rounded-lg border border-indigo-100 bg-indigo-50/40 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-600 px-2 py-0.5 text-[11px] font-semibold text-white">
          <Clock className="h-3 w-3" />
          Best send time
        </span>
        <span className="text-sm font-medium text-gray-900">
          {best || windowLabel(data.window)}
        </span>
        <span
          className={cn(
            'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset',
            sourceStyle.chip
          )}
          title="Where this send window was learned from"
        >
          {sourceStyle.label}
        </span>
      </div>

      <dl className="mt-2.5 grid grid-cols-1 gap-1.5 text-xs sm:grid-cols-2">
        <div className="flex items-center gap-1.5 text-gray-600">
          <Globe className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
          <dt className="sr-only">Timezone</dt>
          <dd>
            {data.timezone || 'Unknown timezone'}
            {data.tz_source && (
              <span className="ml-1 text-gray-400">· {data.tz_source}</span>
            )}
          </dd>
        </div>
        <div className="flex items-center gap-1.5 text-gray-600">
          <CalendarClock className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
          <dt className="sr-only">Recommended window</dt>
          <dd>{windowLabel(data.window)}</dd>
        </div>
      </dl>

      {nextSend && (
        <p className="mt-2 rounded-md bg-white/70 px-2.5 py-1.5 text-xs text-gray-700">
          <span className="font-medium text-gray-500">Next optimal send:</span>{' '}
          {nextSend}
          {data.timezone && <span className="text-gray-400"> ({data.timezone})</span>}
        </p>
      )}

      {confidence != null && (
        <p className="mt-1.5 text-[11px] text-gray-400">
          Confidence {pct(confidence)}
          {data.profile?.opens_total != null && (
            <> · learned from {data.profile.opens_total} open
              {data.profile.opens_total === 1 ? '' : 's'}</>
          )}
        </p>
      )}
    </div>
  );
}
