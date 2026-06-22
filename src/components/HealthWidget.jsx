import { Activity, Clock, MessageSquare, CalendarClock, HeartPulse } from 'lucide-react';
import { cn } from '../lib/utils';
import { HEALTH_COLORS, HEALTH_LABELS, healthStatusFromScore } from '../lib/constants';

// Semicircular 0-100 gauge rendered as an SVG arc.
function Gauge({ score, status }) {
  const palette = HEALTH_COLORS[status] || HEALTH_COLORS.yellow;
  const pct = Math.max(0, Math.min(100, score ?? 0)) / 100;
  // Semicircle: 180° sweep. Arc length of a radius-r semicircle = π·r.
  const r = 52;
  const cx = 70;
  const cy = 70;
  const circ = Math.PI * r;
  const dash = `${circ * pct} ${circ}`;
  return (
    <div className="relative flex-shrink-0" style={{ width: 140, height: 84 }}>
      <svg width="140" height="84" viewBox="0 0 140 84">
        {/* track */}
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth="12"
          strokeLinecap="round"
        />
        {/* value */}
        {score != null && (
          <path
            d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
            fill="none"
            stroke={palette.hex}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={dash}
          />
        )}
      </svg>
      <div className="absolute inset-x-0 bottom-0 flex flex-col items-center">
        <span className="text-3xl font-bold leading-none" style={{ color: palette.hex }}>
          {score != null ? score : '—'}
        </span>
        <span className="text-[11px] font-medium text-gray-400">out of 100</span>
      </div>
    </div>
  );
}

// Inline SVG sparkline of the health history (last ~12 points).
function Sparkline({ history, color }) {
  const points = (history || []).filter((h) => h.score != null).slice(-12);
  if (points.length < 2) return null;
  const w = 120;
  const h = 28;
  const scores = points.map((p) => p.score);
  const min = Math.min(...scores);
  const max = Math.max(...scores);
  const span = max - min || 1;
  const step = w / (points.length - 1);
  const path = points
    .map((p, i) => {
      const x = i * step;
      const y = h - ((p.score - min) / span) * h;
      return `${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
    })
    .join(' ');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
      <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function Metric({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 flex-shrink-0 text-gray-400" />
      <div className="min-w-0">
        <p className="truncate text-xs text-gray-500">{label}</p>
        <p className="text-sm font-semibold text-gray-900">{value}</p>
      </div>
    </div>
  );
}

// Client health widget: gauge + history sparkline + key relationship metrics.
// `health` is the object returned by useCompanyHealth (or null when unavailable).
export default function HealthWidget({ health }) {
  const score = health?.score ?? null;
  const status = health?.status || healthStatusFromScore(score);
  const palette = HEALTH_COLORS[status] || HEALTH_COLORS.yellow;

  const daysSince = health?.days_since_last_contact;
  const responseRate = health?.response_rate;
  const meetingFreq = health?.meeting_frequency;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
          <HeartPulse className="h-4 w-4 text-rose-500" />
          Client Health
        </h3>
        {status && (
          <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset', palette.bg, palette.text, palette.ring)}>
            <span className={cn('h-1.5 w-1.5 rounded-full', palette.dot)} />
            {HEALTH_LABELS[status]}
          </span>
        )}
      </div>

      {health == null ? (
        <div className="flex flex-col items-center justify-center py-6 text-center">
          <Activity className="h-7 w-7 text-gray-300" />
          <p className="mt-2 text-sm text-gray-500">Health data not available yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <Gauge score={score} status={status} />
            <div className="flex-1">
              {health.history?.length > 1 ? (
                <>
                  <p className="mb-1 text-xs text-gray-500">Health trend</p>
                  <Sparkline history={health.history} color={palette.hex} />
                </>
              ) : (
                <p className="text-xs text-gray-400">Not enough history for a trend yet.</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 border-t border-gray-100 pt-3 sm:grid-cols-3">
            <Metric
              icon={Clock}
              label="Days since contact"
              value={daysSince != null ? daysSince : '—'}
            />
            <Metric
              icon={MessageSquare}
              label="Response rate"
              value={responseRate != null ? `${Math.round(responseRate)}%` : '—'}
            />
            <Metric
              icon={CalendarClock}
              label="Meeting frequency"
              value={meetingFreq != null ? meetingFreq : '—'}
            />
          </div>
        </div>
      )}
    </div>
  );
}
