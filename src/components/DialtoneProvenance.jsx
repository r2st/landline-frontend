import { Link } from 'react-router-dom';
import { AlertTriangle, Radar, Sparkles } from 'lucide-react';
import ScoreBadge from './ScoreBadge';
import { useCompanyProvenance } from '../hooks/useProspecting';
import { cn, timeAgo } from '../lib/utils';

/**
 * Why this company is in the pipeline at all.
 *
 * Company detail showed a bare `source` string — so for an agent-discovered
 * lead there was no fit score, no rationale, and no link to the run that found
 * it. "Why are we emailing these people?" was unanswerable from the record of
 * the people being emailed.
 *
 * Renders nothing for a company the agent never touched: a manual add doesn't
 * need a card explaining that a human added it.
 */

const SOURCE_LABELS = {
  google_places: 'Google Places',
  apollo: 'Apollo',
  seed: 'Seed list',
  manual: 'Manual',
};

const STATUS_COPY = {
  review: { label: 'Waiting on a human', tone: 'bg-amber-50 text-amber-700 ring-amber-600/20' },
  enrolled: { label: 'Approved & enrolled', tone: 'bg-green-50 text-green-700 ring-green-600/20' },
  rejected: { label: 'Rejected', tone: 'bg-gray-100 text-gray-600 ring-gray-500/20' },
  qualified: { label: 'Qualified', tone: 'bg-blue-50 text-blue-700 ring-blue-600/20' },
  skipped: { label: 'Skipped', tone: 'bg-gray-100 text-gray-600 ring-gray-500/20' },
};

export default function DialtoneProvenance({ companyId }) {
  const { data, isLoading, isError } = useCompanyProvenance(companyId);

  // Quiet on both: this is supporting context on someone else's page, so a
  // failed lookup shouldn't shout, and "a human added this" needs no card.
  if (isLoading || isError || !data?.discovered_by_agent) return null;

  const status = STATUS_COPY[data.status] || STATUS_COPY.skipped;
  const excluded = data.qualification?.excluded;

  return (
    <div className="rounded-lg border border-indigo-100 bg-indigo-50/40 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Radar className="h-4 w-4 flex-shrink-0 text-indigo-500" />
        <h3 className="text-sm font-semibold text-indigo-900">Found by Dialtone</h3>
        <span
          className={cn(
            'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset',
            status.tone
          )}
        >
          {status.label}
        </span>
        {data.discovered_at && (
          <span className="text-xs text-indigo-700">{timeAgo(data.discovered_at)}</span>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-start gap-x-6 gap-y-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-indigo-400">Fit score</p>
          <div className="mt-1">
            {data.fit_score != null ? (
              <ScoreBadge score={data.fit_score} size="sm" />
            ) : (
              <span className="text-sm text-gray-400">—</span>
            )}
          </div>
        </div>
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-indigo-400">Sourced from</p>
          <p className="mt-1 text-sm text-gray-800">
            {SOURCE_LABELS[data.source] || data.source || '—'}
          </p>
        </div>
        {data.run && (
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-indigo-400">Run</p>
            <p className="mt-1 text-sm text-gray-800">
              <span className="capitalize">{data.run.trigger}</span>
              {data.run.started_at ? ` · ${timeAgo(data.run.started_at)}` : ''}
            </p>
          </div>
        )}
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wide text-indigo-400">Decided by</p>
          <p className="mt-1 text-sm text-gray-800">
            {data.reviewed_by
              ? `${data.reviewed_by}${data.reviewed_at ? ` · ${timeAgo(data.reviewed_at)}` : ''}`
              : data.status === 'review'
                ? 'Nobody yet'
                : 'The agent, on its own'}
          </p>
        </div>
      </div>

      {/* A merge means this company's record came from more than one sighting;
          a low-confidence one is worth knowing about before trusting the data. */}
      {data.dedup_confidence && data.dedup_confidence !== 'high' && (
        <p className="mt-3 flex items-start gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
          Matched to an existing company with <strong>{data.dedup_confidence}</strong> confidence —
          the details here may be merged from more than one source.
        </p>
      )}

      {excluded && (
        <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
          <strong>Excluded by your ICP</strong>
          {data.qualification?.reason ? ` — ${data.qualification.reason}` : ''}
        </p>
      )}

      {data.reasoning && (
        <div className="mt-3">
          <p className="flex items-center gap-1 text-[11px] font-medium uppercase tracking-wide text-indigo-400">
            <Sparkles className="h-3 w-3" />
            Why the agent picked it
          </p>
          <p className="mt-1 text-sm leading-relaxed text-gray-700">{data.reasoning}</p>
        </div>
      )}

      <p className="mt-3 text-xs text-indigo-700">
        Scored against your{' '}
        <Link to="/dialtone/icp" className="font-medium underline hover:text-indigo-900">
          Ideal Customer Profile
        </Link>
        {data.run && (
          <>
            {' · '}
            <Link to="/prospecting" className="font-medium underline hover:text-indigo-900">
              See the run
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
