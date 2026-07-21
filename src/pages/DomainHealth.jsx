import { useState } from 'react';
import {
  AlertTriangle, CheckCircle2, ChevronRight, Globe, Info, Loader2, RefreshCw, ShieldX, XCircle,
} from 'lucide-react';
import HelpIcon from '../components/HelpIcon';
import EmptyState from '../components/EmptyState';
import { useDomainDetail, useDomains, useRecheckDomain } from '../hooks/useDomainHealth';
import { cn, timeAgo } from '../lib/utils';

/**
 * Domain Health — SPF / DKIM / DMARC / blacklist state per sending domain.
 *
 * The older `/deliverability/domain-auth` check answers "how is this one domain
 * I just typed?". This is the monitor: every domain we actually send from,
 * scored, banded, and re-checkable.
 */

// The server's own vocabulary (DomainCheckChip.status): pass | warn | fail |
// ok | listed | unknown. Rendering an unrecognized status as "pass" would turn
// a broken check into a green tick, so unknown stays visibly unknown.
const CHECK_TONE = {
  pass: { tone: 'bg-green-50 text-green-700 ring-green-600/20', Icon: CheckCircle2 },
  ok: { tone: 'bg-green-50 text-green-700 ring-green-600/20', Icon: CheckCircle2 },
  warn: { tone: 'bg-amber-50 text-amber-700 ring-amber-600/20', Icon: AlertTriangle },
  fail: { tone: 'bg-red-50 text-red-700 ring-red-600/20', Icon: XCircle },
  listed: { tone: 'bg-red-50 text-red-700 ring-red-600/20', Icon: ShieldX },
  unknown: { tone: 'bg-gray-100 text-gray-500 ring-gray-500/20', Icon: Info },
};

const BAND = {
  healthy: 'bg-green-50 text-green-700 ring-green-600/20',
  watch: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  at_risk: 'bg-red-50 text-red-700 ring-red-600/20',
};

const BAND_LABEL = { healthy: 'Healthy', watch: 'Watch', at_risk: 'At risk' };

function CheckChip({ label, status }) {
  const { tone, Icon } = CHECK_TONE[status] || CHECK_TONE.unknown;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset',
        tone
      )}
      title={`${label}: ${status}`}
    >
      <Icon className="h-3 w-3" />
      {label}
    </span>
  );
}

export default function DomainHealth() {
  const { data, isLoading, isError, error, refetch, isFetching } = useDomains();
  const [openDomain, setOpenDomain] = useState(null);
  const domains = Array.isArray(data) ? data : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-gray-900">
            <Globe className="h-6 w-6 text-indigo-500" />
            Domain Health
            <HelpIcon articleId="domain-authentication" />
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Whether the domains Dialtone sends from can actually be trusted by a receiving
            mailbox — SPF, DKIM, DMARC and blacklist state, per domain.
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

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-gray-400">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : isError ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-amber-900">
            <AlertTriangle className="h-4 w-4" />
            Couldn't load domain health
          </h2>
          <p className="mt-1.5 text-sm text-amber-800">
            {error?.response?.data?.detail || error?.message || 'The endpoint did not respond.'}
          </p>
          <p className="mt-1 text-xs text-amber-700">
            This says nothing about whether your domains are healthy — only that we couldn't check.
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-sm font-medium text-amber-800 hover:bg-amber-50"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            Try again
          </button>
        </div>
      ) : domains.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <EmptyState
            icon={Globe}
            title="No domains monitored yet"
            description="Domains appear here once Dialtone has a sending account configured on them."
          />
        </div>
      ) : (
        <div className="space-y-3">
          {domains.map((d) => (
            <DomainRow
              key={d.domain}
              domain={d}
              open={openDomain === d.domain}
              onToggle={() => setOpenDomain(openDomain === d.domain ? null : d.domain)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function DomainRow({ domain: d, open, onToggle }) {
  const recheck = useRecheckDomain();
  const delta = d.previous_score != null ? d.health_score - d.previous_score : null;

  return (
    <div className={cn('rounded-xl border bg-white shadow-sm', open ? 'border-indigo-200' : 'border-gray-200')}>
      <div className="flex flex-wrap items-center gap-3 p-4">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-label={`${open ? 'Hide' : 'Show'} details for ${d.domain}`}
          className="rounded text-gray-400 hover:text-gray-700"
        >
          <ChevronRight className={cn('h-4 w-4 transition-transform', open && 'rotate-90')} />
        </button>

        <div className="min-w-0">
          <p className="truncate font-medium text-gray-900">{d.domain}</p>
          <p className="text-xs text-gray-400">
            {d.last_checked ? `Checked ${timeAgo(d.last_checked)}` : 'Never checked'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <CheckChip label="SPF" status={d.spf} />
          <CheckChip label="DKIM" status={d.dkim} />
          <CheckChip label="DMARC" status={d.dmarc} />
          <CheckChip label="Blacklist" status={d.blacklist} />
        </div>

        <div className="ml-auto flex items-center gap-3">
          <div className="text-right">
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-bold text-gray-900">{d.health_score}</span>
              <span className="text-xs text-gray-400">/100</span>
              {/* A score alone can't tell you if it's moving the wrong way. */}
              {delta != null && delta !== 0 && (
                <span className={cn('text-xs font-medium', delta > 0 ? 'text-green-600' : 'text-red-600')}>
                  {delta > 0 ? '+' : ''}{delta}
                </span>
              )}
            </div>
            <span
              className={cn(
                'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ring-inset',
                BAND[d.band] || BAND.watch
              )}
            >
              {BAND_LABEL[d.band] || d.band}
            </span>
          </div>
          <button
            type="button"
            disabled={recheck.isPending}
            onClick={() => recheck.mutate(d.domain)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-50"
          >
            {recheck.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            Recheck
          </button>
        </div>
      </div>

      {open && <DomainDetail domain={d.domain} />}
    </div>
  );
}

function DomainDetail({ domain }) {
  const { data, isLoading, isError, error } = useDomainDetail(domain);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center border-t border-gray-100 py-8 text-gray-400">
        <Loader2 className="h-4 w-4 animate-spin" />
      </div>
    );
  }
  if (isError) {
    return (
      <p className="border-t border-gray-100 px-4 py-4 text-sm text-amber-700">
        Couldn't load detail for {domain} — {error?.response?.data?.detail || error?.message || 'no response'}.
      </p>
    );
  }

  const issues = data?.issues || [];
  const notes = data?.notes || [];

  return (
    <div className="space-y-4 border-t border-gray-100 bg-gray-50/70 px-4 py-4">
      {/* What to actually do about it. The server writes these as remediation
          strings, which is more use than a red chip on its own. */}
      {issues.length > 0 && (
        <div>
          <h3 className="text-[11px] font-semibold uppercase tracking-wide text-red-700">
            Needs fixing
          </h3>
          <ul className="mt-1.5 space-y-1">
            {issues.map((issue, i) => (
              <li key={i} className="flex items-start gap-1.5 text-sm text-red-800">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
                <span>{issue}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {issues.length === 0 && (
        <p className="flex items-center gap-1.5 text-sm text-green-700">
          <CheckCircle2 className="h-4 w-4" />
          No outstanding auth or blacklist problems on this domain.
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <RecordCard title="SPF" record={data?.spf} />
        <RecordCard title="DKIM" record={data?.dkim} />
        <RecordCard title="DMARC" record={data?.dmarc} />
        <BlacklistCard blacklists={data?.blacklists} />
      </div>

      {notes.length > 0 && (
        <div>
          <h3 className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">
            Not checked automatically
          </h3>
          <ul className="mt-1.5 space-y-1">
            {notes.map((n, i) => (
              <li key={i} className="flex items-start gap-1.5 text-xs text-gray-500">
                <Info className="mt-0.5 h-3 w-3 flex-shrink-0" />
                <span>{n}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

// The raw check output is a free-form dict server-side, so render what's there
// rather than assuming a fixed set of keys.
function RecordCard({ title, record }) {
  const status = record?.status || (record?.valid === true ? 'pass' : record?.valid === false ? 'fail' : 'unknown');
  const value = record?.record || record?.value || record?.raw;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-xs font-semibold text-gray-700">{title}</h4>
        <CheckChip label={String(status)} status={status} />
      </div>
      {value ? (
        <p className="mt-1.5 break-all font-mono text-[11px] leading-relaxed text-gray-500">{value}</p>
      ) : (
        <p className="mt-1.5 text-[11px] text-gray-400">No record found.</p>
      )}
      {record?.detail && <p className="mt-1 text-[11px] text-gray-500">{record.detail}</p>}
      {record?.recommended_record && (
        <RecommendedRecord host={record.host} value={record.recommended_record} />
      )}
    </div>
  );
}

// Shown when a check (currently DMARC) can hand the operator the exact TXT
// record to publish. DNS is edited by hand, so a one-click copy of the precise
// host + value removes the step most likely to be fat-fingered.
function RecommendedRecord({ host, value }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard?.writeText(value).then(
      () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      },
      () => {},
    );
  };
  return (
    <div className="mt-2 rounded-md border border-indigo-100 bg-indigo-50/60 p-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-indigo-700">
          Add this DNS record
        </span>
        <button
          type="button"
          onClick={copy}
          className="rounded bg-indigo-600 px-1.5 py-0.5 text-[10px] font-medium text-white hover:bg-indigo-700"
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      {host && (
        <p className="mt-1 text-[10px] text-indigo-700/80">
          Host: <span className="font-mono">{host}</span> · Type: <span className="font-mono">TXT</span>
        </p>
      )}
      <p className="mt-0.5 break-all font-mono text-[11px] leading-relaxed text-indigo-900">{value}</p>
    </div>
  );
}

function BlacklistCard({ blacklists }) {
  const listed = blacklists?.listed_on || blacklists?.listed || [];
  const checked = blacklists?.checked ?? blacklists?.zones_checked;
  const isListed = Array.isArray(listed) && listed.length > 0;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-xs font-semibold text-gray-700">Blacklists</h4>
        <CheckChip label={isListed ? 'listed' : 'ok'} status={isListed ? 'listed' : 'ok'} />
      </div>
      {isListed ? (
        <ul className="mt-1.5 space-y-0.5">
          {listed.map((z, i) => (
            <li key={i} className="font-mono text-[11px] text-red-700">{typeof z === 'string' ? z : z?.zone}</li>
          ))}
        </ul>
      ) : (
        <p className="mt-1.5 text-[11px] text-gray-400">
          Not listed{checked ? ` (${checked} zone${checked === 1 ? '' : 's'} checked)` : ''}.
        </p>
      )}
    </div>
  );
}
