import { useMemo, useState } from 'react';
import {
  Radar, Check, X, Mail, MailX, MapPin, History, ClipboardList, Loader2, AlertTriangle,
} from 'lucide-react';
import ConfirmDialog from '../components/ConfirmDialog';
import EmptyState from '../components/EmptyState';
import ScoreBadge from '../components/ScoreBadge';
import { useAuth } from '../context/AuthContext';
import {
  QUEUE_STATUSES,
  useBulkReview,
  useProspectCandidates,
  useProspectingRuns,
  useReviewCandidate,
} from '../hooks/useProspecting';
import { cn, formatDate, timeAgo } from '../lib/utils';

// The three views a reviewer thinks in, mapped to the dispositions the API
// actually stores. "Approved" is 'enrolled' server-side — approving a candidate
// enrols its company, and that enrolment *is* the record of the approval.
const TABS = [
  { key: 'pending', label: 'Pending review', status: QUEUE_STATUSES.pending },
  { key: 'approved', label: 'Approved', status: QUEUE_STATUSES.approved },
  { key: 'rejected', label: 'Rejected', status: QUEUE_STATUSES.rejected },
];

const SORTS = [
  { value: 'fit_score', label: 'Fit score' },
  { value: 'created_at', label: 'Date found' },
];

const STATUS_TONE = {
  review: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  enrolled: 'bg-green-50 text-green-700 ring-green-600/20',
  rejected: 'bg-gray-100 text-gray-600 ring-gray-500/20',
  qualified: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  skipped: 'bg-gray-100 text-gray-600 ring-gray-500/20',
};

const RUN_TONE = {
  completed: 'bg-green-50 text-green-700 ring-green-600/20',
  running: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  failed: 'bg-red-50 text-red-700 ring-red-600/20',
  paused: 'bg-amber-50 text-amber-700 ring-amber-600/20',
};

const SOURCE_LABELS = {
  google_places: 'Places',
  apollo: 'Apollo',
  seed: 'Seed',
  manual: 'Manual',
};

function Pill({ children, tone }) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium capitalize ring-1 ring-inset', tone)}>
      {children}
    </span>
  );
}

// City / state / country, skipping whatever the source didn't give us.
function locationOf(raw) {
  return [raw?.city, raw?.state, raw?.country].filter(Boolean).join(', ');
}

function CandidateRow({ candidate, selected, onSelect, showActions, onDecide, pendingId }) {
  const raw = candidate.raw_data || {};
  const location = locationOf(raw);
  const busy = pendingId === candidate.id;

  return (
    <tr className="border-b border-gray-100 last:border-0 hover:bg-gray-50/70">
      <td className="px-4 py-3">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onSelect(candidate.id)}
          className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
          aria-label={`Select ${candidate.company_name}`}
        />
      </td>
      <td className="px-4 py-3">
        <div className="font-medium text-gray-900">{candidate.company_name}</div>
        <div className="mt-0.5 flex items-center gap-1.5 text-xs text-gray-400">
          <span>{SOURCE_LABELS[candidate.source] || candidate.source}</span>
          {candidate.domain && (
            <>
              <span aria-hidden="true">·</span>
              <span className="truncate">{candidate.domain}</span>
            </>
          )}
        </div>
      </td>
      <td className="px-4 py-3">
        {/* For a Places candidate this is the search query that surfaced it — the
            business's own category is too coarse to be the industry signal. */}
        <span className="text-sm text-gray-700">{raw.industry || <span className="text-gray-300">—</span>}</span>
      </td>
      <td className="px-4 py-3">
        {location ? (
          <span className="inline-flex items-center gap-1 text-sm text-gray-600">
            <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-gray-300" />
            {location}
          </span>
        ) : (
          <span className="text-gray-300">—</span>
        )}
      </td>
      <td className="px-4 py-3">
        <ScoreBadge score={candidate.fit_score} size="sm" />
      </td>
      <td className="px-4 py-3">
        {/* The address itself, not just "Yes": approving enrols a real cold
            email, so the reviewer should see who it would go to. */}
        {candidate.has_email ? (
          <div className="min-w-0 space-y-0.5">
            <div className="flex items-center gap-1.5">
              <Mail className="h-3.5 w-3.5 flex-shrink-0 text-green-600" />
              <a
                href={`mailto:${candidate.contact_email}`}
                title={candidate.contact_email}
                className="truncate text-sm text-blue-600 hover:text-blue-700 hover:underline"
              >
                {candidate.contact_email}
              </a>
            </div>
            {(candidate.contact_name || candidate.contact_phone) && (
              <p className="truncate text-xs text-gray-500">
                {[
                  candidate.contact_name && candidate.contact_title
                    ? `${candidate.contact_name} · ${candidate.contact_title}`
                    : candidate.contact_name,
                  candidate.contact_phone,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            )}
          </div>
        ) : (
          <span className="inline-flex items-center gap-1 text-sm text-gray-400" title="No contact to email — enrolling won't send">
            <MailX className="h-4 w-4" />
            No email
          </span>
        )}
      </td>
      <td className="px-4 py-3">
        <Pill tone={STATUS_TONE[candidate.status] || STATUS_TONE.skipped}>{candidate.status}</Pill>
      </td>
      <td className="px-4 py-3 text-right">
        {showActions ? (
          <div className="inline-flex items-center gap-1.5">
            <button
              type="button"
              disabled={busy}
              onClick={() => onDecide(candidate.id, 'approve')}
              className="inline-flex items-center gap-1 rounded-lg bg-indigo-600 px-2.5 py-1.5 text-xs font-medium text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              Approve
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => onDecide(candidate.id, 'reject')}
              className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 transition-colors hover:bg-gray-100 disabled:opacity-50"
            >
              <X className="h-3.5 w-3.5" />
              Reject
            </button>
          </div>
        ) : (
          <div className="text-xs text-gray-400">
            {candidate.reviewed_by ? `by ${candidate.reviewed_by}` : 'auto'}
            {candidate.reviewed_at && <div>{timeAgo(candidate.reviewed_at)}</div>}
          </div>
        )}
      </td>
    </tr>
  );
}

function ReviewQueue() {
  const { user } = useAuth();
  const reviewer = user?.email || user?.name || undefined;
  const [tab, setTab] = useState('pending');
  const [sort, setSort] = useState('fit_score');
  const [order, setOrder] = useState('desc');
  const [selected, setSelected] = useState(() => new Set());
  // Approving is the outward-facing, irreversible half of this page: it enrols
  // the company and arms a real cold email to a real business. Held behind a
  // confirm so a stray click — especially on a bulk selection — can't send.
  // Rejecting sends nothing, so it stays a single click.
  const [confirming, setConfirming] = useState(null);

  const status = TABS.find((t) => t.key === tab).status;
  const { data: candidates = [], isLoading, isFetching } = useProspectCandidates({ status, sort, order });
  const review = useReviewCandidate();
  const bulk = useBulkReview();

  const isPending = tab === 'pending';
  // Only ever act on rows still on screen: a selection made before a refetch
  // could otherwise re-decide a candidate someone else already handled.
  const visibleIds = useMemo(() => new Set(candidates.map((c) => c.id)), [candidates]);
  const selectedIds = useMemo(
    () => [...selected].filter((id) => visibleIds.has(id)),
    [selected, visibleIds]
  );
  const allSelected = candidates.length > 0 && selectedIds.length === candidates.length;

  const toggle = (id) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleAll = () =>
    setSelected(allSelected ? new Set() : new Set(candidates.map((c) => c.id)));

  const switchTab = (key) => {
    setTab(key);
    setSelected(new Set()); // selections don't carry across dispositions
  };

  const runSingle = (id, decision) =>
    review.mutate({ id, decision, reviewer }, { onSuccess: () => toggle(id) });

  const runBulk = (decision) =>
    bulk.mutate(
      { ids: selectedIds, decision, reviewer },
      { onSuccess: () => setSelected(new Set()) }
    );

  const decide = (id, decision) =>
    decision === 'approve' ? setConfirming({ ids: [id], decision }) : runSingle(id, decision);

  const decideBulk = (decision) =>
    decision === 'approve' ? setConfirming({ ids: selectedIds, decision }) : runBulk(decision);

  const confirm = () => {
    const { ids, decision } = confirming;
    if (ids.length === 1) runSingle(ids[0], decision);
    else runBulk(decision);
    setConfirming(null);
  };

  const busy = bulk.isPending;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="inline-flex rounded-lg border border-gray-200 bg-white p-0.5 shadow-sm">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => switchTab(t.key)}
              className={cn(
                'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                tab === t.key ? 'bg-indigo-50 text-indigo-700' : 'text-gray-500 hover:text-gray-900'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="ml-auto flex items-center gap-2">
          <label htmlFor="prospect-sort" className="text-xs font-medium text-gray-400">
            Sort by
          </label>
          <select
            id="prospect-sort"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-sm text-gray-700 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            {SORTS.map((s) => (
              <option key={s.value} value={s.value}>{s.label}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => setOrder((o) => (o === 'desc' ? 'asc' : 'desc'))}
            className="rounded-lg border border-gray-200 bg-white px-2.5 py-1.5 text-sm text-gray-600 shadow-sm transition-colors hover:bg-gray-50"
            title={order === 'desc' ? 'Highest first' : 'Lowest first'}
          >
            {order === 'desc' ? 'Desc' : 'Asc'}
          </button>
        </div>
      </div>

      {/* Bulk action bar */}
      {isPending && selectedIds.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl border border-indigo-100 bg-indigo-50/60 px-4 py-3">
          <span className="text-sm font-medium text-indigo-900">
            {selectedIds.length} selected
          </span>
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => decideBulk('approve')}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
              Approve selected
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => decideBulk('reject')}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 shadow-sm transition-colors hover:bg-gray-50 disabled:opacity-50"
            >
              <X className="h-4 w-4" />
              Reject selected
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-gray-400">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : candidates.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title={isPending ? 'Nothing waiting on you' : `No ${tab} candidates`}
            description={
              isPending
                ? 'When the prospector finds a company it is not confident enough to enrol on its own, it lands here for your call.'
                : 'Candidates you decide on show up here.'
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[62rem] text-left">
              <thead className="border-b border-gray-200 bg-gray-50/80">
                <tr className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                  <th scope="col" className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleAll}
                      className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      aria-label="Select all candidates"
                    />
                  </th>
                  <th scope="col" className="px-4 py-3">Company</th>
                  <th scope="col" className="px-4 py-3">Industry / query</th>
                  <th scope="col" className="px-4 py-3">Location</th>
                  <th scope="col" className="px-4 py-3">Fit</th>
                  <th scope="col" className="px-4 py-3">Email</th>
                  <th scope="col" className="px-4 py-3">Status</th>
                  <th scope="col" className="px-4 py-3 text-right">
                    {isPending ? 'Decision' : 'Reviewed'}
                  </th>
                </tr>
              </thead>
              <tbody>
                {candidates.map((c) => (
                  <CandidateRow
                    key={c.id}
                    candidate={c}
                    selected={selected.has(c.id)}
                    onSelect={toggle}
                    showActions={isPending}
                    onDecide={decide}
                    pendingId={review.isPending ? review.variables?.id : null}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
        {isFetching && !isLoading && (
          <div className="border-t border-gray-100 px-4 py-2 text-xs text-gray-400">Refreshing…</div>
        )}
      </div>

      <ConfirmDialog
        open={!!confirming}
        variant="warning"
        title={
          confirming?.ids.length === 1
            ? 'Approve and start outreach?'
            : `Approve ${confirming?.ids.length} candidates and start outreach?`
        }
        message={
          `Approving enrols ${confirming?.ids.length === 1 ? 'this company' : 'these companies'} ` +
          'in an outreach sequence and arms a real cold email to a real business. The first ' +
          'message can go out within minutes — the send window and the sending kill switch are ' +
          'the only things holding it back.'
        }
        confirmLabel={confirming?.ids.length === 1 ? 'Approve & enrol' : `Approve ${confirming?.ids.length}`}
        onConfirm={confirm}
        onCancel={() => setConfirming(null)}
      />
    </div>
  );
}

function RunsHistory() {
  const { data: runs = [], isLoading } = useProspectingRuns(25);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-400">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (runs.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <EmptyState
          icon={History}
          title="No prospecting runs yet"
          description="Runs appear here once the prospector has swept for companies, with what each one found and enrolled."
        />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {runs.map((run) => {
        const sources = Array.isArray(run.sources_queried) ? run.sources_queried : [];
        return (
          <div key={run.id} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="flex flex-wrap items-center gap-2">
              <Pill tone={RUN_TONE[run.status] || RUN_TONE.paused}>{run.status}</Pill>
              <span className="text-sm font-medium text-gray-900 capitalize">{run.trigger}</span>
              <span className="text-sm text-gray-400">
                {formatDate(run.started_at)} · {timeAgo(run.started_at)}
              </span>
              {sources.length > 0 && (
                <span className="text-xs text-gray-400">
                  via {sources.map((s) => SOURCE_LABELS[s] || s).join(', ')}
                </span>
              )}
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: 'Found', value: run.companies_found },
                { label: 'Qualified', value: run.companies_qualified },
                { label: 'Enrolled', value: run.companies_enrolled },
                { label: 'To review', value: run.companies_review_queue },
              ].map((stat) => (
                <div key={stat.label} className="rounded-lg border border-gray-100 bg-gray-50/70 px-3 py-2">
                  <dt className="text-[11px] font-medium uppercase tracking-wide text-gray-400">{stat.label}</dt>
                  <dd className="mt-0.5 text-xl font-bold text-gray-900">{stat.value ?? 0}</dd>
                </div>
              ))}
            </dl>

            {run.error && (
              <p className="mt-3 flex items-start gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-700">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                <span className="break-words">{run.error}</span>
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function Prospecting() {
  const [view, setView] = useState('queue');

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-gray-900">
            <Radar className="h-6 w-6 text-indigo-500" />
            Prospecting
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Companies the agent sourced and scored against your ICP. It enrols the ones it is sure
            about and leaves the rest to you.
          </p>
        </div>
        <div className="inline-flex rounded-lg border border-gray-200 bg-white p-0.5 shadow-sm">
          {[
            { key: 'queue', label: 'Review queue', icon: ClipboardList },
            { key: 'runs', label: 'Runs', icon: History },
          ].map((v) => (
            <button
              key={v.key}
              type="button"
              onClick={() => setView(v.key)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                view === v.key ? 'bg-indigo-50 text-indigo-700' : 'text-gray-500 hover:text-gray-900'
              )}
            >
              <v.icon className="h-4 w-4" />
              {v.label}
            </button>
          ))}
        </div>
      </div>

      {view === 'queue' ? <ReviewQueue /> : <RunsHistory />}
    </div>
  );
}
