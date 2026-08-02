import { useState } from 'react';
import {
  Activity, BarChart3, Flame, Loader2, MailOpen, MousePointerClick, RefreshCw,
  Reply, Sparkles, Trophy,
} from 'lucide-react';
import EmptyState from '../components/EmptyState';
import HelpIcon from '../components/HelpIcon';
import { useCampaignAnalytics, useRankedLeads } from '../hooks/useDialtone';
import { cn, timeAgo } from '../lib/utils';

/**
 * Campaign Performance — every Dialtone campaign side by side.
 *
 * The per-sequence analytics screen answers "how is this campaign doing, step by
 * step". Nothing answered the question that actually decides anything: *which*
 * campaign deserves tomorrow's sends. With ten sequences competing for a
 * warm-up-capped daily budget, that allocation is the only lever with real
 * leverage, and it was being pulled from memory.
 *
 * Two columns here exist to keep the rest honest. "AI copy" is the share of
 * sends that were personalized rather than static mail-merge, and "depth" is how
 * many prospect data points the copywriter had. A reply rate is uninterpretable
 * without them: when the LLM provider chain goes dark, a personalized campaign
 * silently becomes a mail-merge campaign with the same name, the same send
 * count, and a quietly worse reply rate.
 */

const TIMEFRAMES = [
  { key: '7', label: 'Last 7 days', days: 7 },
  { key: '30', label: 'Last 30 days', days: 30 },
  { key: '90', label: 'Last 90 days', days: 90 },
  { key: 'all', label: 'All time', days: undefined },
];

const SORTS = [
  { key: 'reply_rate', label: 'Reply rate' },
  { key: 'open_rate', label: 'Open rate' },
  { key: 'click_rate', label: 'Click rate' },
  { key: 'conversion_rate', label: 'Conversion' },
  { key: 'sent', label: 'Volume' },
];

const pct = (v) => `${((v || 0) * 100).toFixed(1)}%`;

// Cold-email reality, not aspiration: reply rates of 1-3% are normal on a good
// list, so the "good" thresholds here are set where a number is genuinely worth
// noticing rather than where it would look impressive on a slide.
const BANDS = {
  open_rate: { good: 0.4, poor: 0.15 },
  click_rate: { good: 0.05, poor: 0.01 },
  reply_rate: { good: 0.03, poor: 0.005 },
};

function rateTone(key, value) {
  const band = BANDS[key];
  if (!band || !value) return 'text-gray-600';
  if (value >= band.good) return 'text-green-700 font-semibold';
  if (value < band.poor) return 'text-gray-400';
  return 'text-gray-700';
}

// Bounce is the one rate where high is bad. 5% is the threshold the danger
// monitor pauses accounts at, so the table warns at the same number the
// automation acts on — two different definitions of "too many bounces" in one
// product is how an operator learns to ignore both.
function bounceTone(value) {
  if ((value || 0) >= 0.05) return 'text-red-600 font-semibold';
  if ((value || 0) >= 0.02) return 'text-amber-600';
  return 'text-gray-400';
}

// The other rate where high is bad, and the one worth reading before the bounce
// rate: a bounce is a bad address, an unsubscribe is a real person telling us to
// stop. It is the leading indicator of the spam complaints that get a sending
// domain blocklisted, and unlike complaints we see all of them.
//
// No automation acts on this number, so these are read thresholds rather than
// enforcement ones — deliberately tighter than the bounce bands, because by the
// time an opt-out rate looks like a bounce rate the damage is to the domain.
function unsubTone(value) {
  if ((value || 0) >= 0.03) return 'text-red-600 font-semibold';
  if ((value || 0) >= 0.01) return 'text-amber-600';
  return 'text-gray-400';
}

const TIER_STYLES = {
  hot: 'bg-red-50 text-red-700 ring-red-200',
  warm: 'bg-amber-50 text-amber-700 ring-amber-200',
  cool: 'bg-sky-50 text-sky-700 ring-sky-200',
  cold: 'bg-gray-100 text-gray-500 ring-gray-200',
};

export default function DialtoneCampaigns() {
  const [timeframe, setTimeframe] = useState('30');
  const [sortBy, setSortBy] = useState('reply_rate');

  const active = TIMEFRAMES.find((t) => t.key === timeframe) || TIMEFRAMES[1];
  const { data, isLoading, isFetching, refetch } = useCampaignAnalytics({
    days: active.days,
    sortBy,
  });
  const campaigns = data?.campaigns || [];
  const totals = data?.totals;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-gray-900">
            <BarChart3 className="h-6 w-6 text-indigo-500" />
            Campaign Performance
            <HelpIcon articleId="dialtone-campaigns" />
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Every campaign side by side — opens, clicks, replies, bounces and the
            enrolled&nbsp;→&nbsp;deal conversion, next to how much of each one was actually
            AI-personalized.
          </p>
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-600 shadow-sm hover:bg-gray-50"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', isFetching && 'animate-spin')} />
          Refresh
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {TIMEFRAMES.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTimeframe(t.key)}
            className={cn(
              'rounded-full px-3 py-1.5 text-sm font-medium ring-1 ring-inset transition',
              timeframe === t.key
                ? 'bg-indigo-600 text-white ring-indigo-600'
                : 'bg-white text-gray-600 ring-gray-200 hover:bg-gray-50'
            )}
          >
            {t.label}
          </button>
        ))}
        <span className="ml-auto flex items-center gap-2 text-xs text-gray-500">
          Sort by
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-2 py-1 text-sm text-gray-700 shadow-sm"
          >
            {SORTS.map((s) => (
              <option key={s.key} value={s.key}>{s.label}</option>
            ))}
          </select>
        </span>
      </div>

      {totals && <TotalsStrip totals={totals} />}

      {isLoading ? (
        <div className="flex items-center justify-center py-24 text-gray-400">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : campaigns.length === 0 ? (
        <EmptyState
          icon={BarChart3}
          title="No campaign sends in this window"
          description="Nothing has gone out in the selected timeframe. Widen it, or check the Console for whether sending is paused."
        />
      ) : (
        <CampaignTable campaigns={campaigns} />
      )}

      <HotLeads />
    </div>
  );
}

function TotalsStrip({ totals }) {
  const tiles = [
    { label: 'Sent', value: totals.sent.toLocaleString(), icon: Activity, hint: `${totals.total_enrollments} enrolled` },
    { label: 'Open rate', value: pct(totals.open_rate), icon: MailOpen, hint: `${totals.opened} opens` },
    { label: 'Click rate', value: pct(totals.click_rate), icon: MousePointerClick, hint: `${totals.clicked} clicks` },
    { label: 'Reply rate', value: pct(totals.reply_rate), icon: Reply, hint: `${totals.replied} replies` },
    { label: 'Conversion', value: pct(totals.conversion_rate), icon: Trophy, hint: `${totals.deals_attributed} deals` },
    {
      label: 'AI copy',
      value: pct(totals.ai_composed_rate),
      icon: Sparkles,
      // The depth is the tell. A high AI share with a depth near zero means the
      // model is writing from the five merge fields and nothing else.
      hint: `${totals.avg_personalization_depth} data points avg`,
    },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {tiles.map((t) => (
        <div key={t.label} className="rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
          <div className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-gray-400">
            <t.icon className="h-3.5 w-3.5" />
            {t.label}
          </div>
          <div className="mt-1 text-xl font-bold text-gray-900">{t.value}</div>
          <div className="text-[11px] text-gray-400">{t.hint}</div>
        </div>
      ))}
    </div>
  );
}

function CampaignTable({ campaigns }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white shadow-sm">
      <table className="min-w-full divide-y divide-gray-200 text-sm">
        <thead className="bg-gray-50 text-left text-[11px] uppercase tracking-wide text-gray-500">
          <tr>
            <th className="px-4 py-2.5 font-medium">Campaign</th>
            <th className="px-3 py-2.5 text-right font-medium">Sent</th>
            <th className="px-3 py-2.5 text-right font-medium">Open</th>
            <th className="px-3 py-2.5 text-right font-medium">Click</th>
            <th className="px-3 py-2.5 text-right font-medium">Reply</th>
            <th className="px-3 py-2.5 text-right font-medium">Bounce</th>
            <th className="px-3 py-2.5 text-right font-medium">Unsub</th>
            <th className="px-3 py-2.5 text-right font-medium">Deals</th>
            <th className="px-3 py-2.5 text-right font-medium">AI copy</th>
            <th className="px-3 py-2.5 text-right font-medium">Last send</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {campaigns.map((c) => (
            <tr key={c.sequence_id} className="hover:bg-gray-50/60">
              <td className="px-4 py-2.5">
                <div className="font-medium text-gray-900">{c.name}</div>
                <div className="text-[11px] text-gray-400">
                  {[c.industry, c.tone, c.is_active ? 'active' : 'paused']
                    .filter(Boolean)
                    .join(' · ')}
                  {` · ${c.active_enrollments} in flight`}
                </div>
              </td>
              <td className="px-3 py-2.5 text-right tabular-nums text-gray-700">{c.sent}</td>
              <td className={cn('px-3 py-2.5 text-right tabular-nums', rateTone('open_rate', c.open_rate))}>
                {pct(c.open_rate)}
              </td>
              <td className={cn('px-3 py-2.5 text-right tabular-nums', rateTone('click_rate', c.click_rate))}>
                {pct(c.click_rate)}
              </td>
              <td className={cn('px-3 py-2.5 text-right tabular-nums', rateTone('reply_rate', c.reply_rate))}>
                {pct(c.reply_rate)}
              </td>
              <td className={cn('px-3 py-2.5 text-right tabular-nums', bounceTone(c.bounce_rate))}>
                {pct(c.bounce_rate)}
              </td>
              <td className={cn('px-3 py-2.5 text-right tabular-nums', unsubTone(c.unsubscribe_rate))}>
                {pct(c.unsubscribe_rate)}
              </td>
              <td className="px-3 py-2.5 text-right tabular-nums text-gray-700">
                {c.deals_attributed}
                <span className="ml-1 text-[11px] text-gray-400">{pct(c.conversion_rate)}</span>
              </td>
              <td className="px-3 py-2.5 text-right tabular-nums">
                <span className={c.ai_composed_rate > 0 ? 'text-indigo-600' : 'text-gray-400'}>
                  {pct(c.ai_composed_rate)}
                </span>
                <span className="ml-1 text-[11px] text-gray-400">
                  {c.avg_personalization_depth}pt
                </span>
              </td>
              <td className="px-3 py-2.5 text-right text-[11px] text-gray-400">
                {c.last_send_at ? timeAgo(c.last_send_at) : '—'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function HotLeads() {
  const { data, isLoading } = useRankedLeads({ limit: 10, minScore: 1 });
  const leads = data?.leads || [];

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <Flame className="h-4 w-4 text-red-500" />
        <h2 className="text-sm font-semibold text-gray-900">Warmest prospects right now</h2>
        <span className="text-xs text-gray-400">
          ranked by recent replies, clicks and opens
        </span>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8 text-gray-400">
          <Loader2 className="h-4 w-4 animate-spin" />
        </div>
      ) : leads.length === 0 ? (
        <p className="py-6 text-center text-sm text-gray-400">
          Nobody has engaged yet. Once contacts start opening and clicking, the
          people worth calling first show up here.
        </p>
      ) : (
        <ul className="mt-3 divide-y divide-gray-100">
          {leads.map((lead) => (
            <li key={lead.contact_id} className="flex items-center gap-3 py-2">
              <span
                className={cn(
                  'inline-flex w-14 shrink-0 items-center justify-center rounded-full px-2 py-0.5 text-[11px] font-medium capitalize ring-1 ring-inset',
                  TIER_STYLES[lead.tier] || TIER_STYLES.cold
                )}
              >
                {lead.tier}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-gray-900">
                  {lead.contact_name}
                  {lead.company_name && (
                    <span className="ml-1 font-normal text-gray-400">· {lead.company_name}</span>
                  )}
                </div>
                <div className="truncate text-[11px] text-gray-500">
                  {lead.reasons.join(' · ')}
                  {lead.last_engaged_at && ` · ${timeAgo(lead.last_engaged_at)}`}
                </div>
              </div>
              <span className="shrink-0 tabular-nums text-sm font-semibold text-gray-700">
                {lead.score}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
