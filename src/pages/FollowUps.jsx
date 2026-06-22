import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  Clock,
  AlertTriangle,
  Check,
  X,
  CalendarPlus,
  Building2,
  User,
  Snowflake,
  Mail,
} from 'lucide-react';
import EmptyState from '../components/EmptyState';
import {
  useFollowUps,
  useStaleContacts,
  useUpdateFollowUp,
  useDeleteFollowUp,
  useCreateFollowUp,
} from '../hooks/useFollowUps';
import { formatDate, timeAgo, cn } from '../lib/utils';

function daysFromNowISO(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

function SkeletonRows({ rows = 4 }) {
  return (
    <div className="space-y-2 p-4">
      {[...Array(rows)].map((_, i) => (
        <div key={i} className="flex animate-pulse items-center gap-3">
          <div className="h-9 w-9 rounded-full bg-gray-200" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-1/3 rounded bg-gray-200" />
            <div className="h-2.5 w-1/4 rounded bg-gray-200" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Reminders tab ────────────────────────────────────────────────────────────

function RemindersTab() {
  const navigate = useNavigate();
  const [showCompleted, setShowCompleted] = useState(false);
  const { data: followUps, isLoading } = useFollowUps(
    showCompleted ? {} : { status: 'pending' }
  );
  const updateFollowUp = useUpdateFollowUp();
  const deleteFollowUp = useDeleteFollowUp();

  const items = followUps || [];
  const overdue = items.filter((f) => f.is_overdue);
  const pendingUpcoming = items.filter((f) => f.status === 'pending' && !f.is_overdue);
  const done = items.filter((f) => f.status !== 'pending');

  const Row = ({ f }) => (
    <li className="flex flex-wrap items-center gap-3 px-4 py-3 transition-colors hover:bg-gray-50">
      <div
        className={cn(
          'flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full',
          f.is_overdue ? 'bg-red-50 text-red-500'
            : f.status !== 'pending' ? 'bg-gray-100 text-gray-400'
            : 'bg-blue-50 text-blue-500'
        )}
      >
        {f.is_overdue ? <AlertTriangle className="h-4 w-4" /> : <Clock className="h-4 w-4" />}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => f.company_id && navigate(`/companies/${f.company_id}`)}
            className="truncate text-sm font-medium text-gray-900 hover:text-blue-600"
          >
            {f.contact_name || f.company_name || 'Follow-up'}
          </button>
          {f.company_name && f.contact_name && (
            <span className="truncate text-xs text-gray-400">{f.company_name}</span>
          )}
          {f.is_overdue && (
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
              Overdue
            </span>
          )}
          {f.status === 'completed' && (
            <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
              Completed
            </span>
          )}
          {f.status === 'dismissed' && (
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
              Dismissed
            </span>
          )}
        </div>
        {f.reason && <p className="mt-0.5 truncate text-sm text-gray-600">{f.reason}</p>}
        <p className="mt-0.5 text-xs text-gray-400">Due {formatDate(f.due_date)}</p>
      </div>

      {f.status === 'pending' ? (
        <div className="flex items-center gap-1">
          <button
            type="button"
            title="Mark complete"
            onClick={() => updateFollowUp.mutate({ id: f.id, data: { status: 'completed' } })}
            className="rounded-md p-1.5 text-gray-400 hover:bg-green-50 hover:text-green-600"
          >
            <Check className="h-4 w-4" />
          </button>
          <button
            type="button"
            title="Dismiss"
            onClick={() => updateFollowUp.mutate({ id: f.id, data: { status: 'dismissed' } })}
            className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          title="Delete"
          onClick={() => deleteFollowUp.mutate(f.id)}
          className="rounded-md p-1.5 text-gray-300 hover:bg-red-50 hover:text-red-500"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </li>
  );

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-gray-600">
          <input
            type="checkbox"
            checked={showCompleted}
            onChange={(e) => setShowCompleted(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-blue-600"
          />
          Show completed
        </label>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        {isLoading ? (
          <SkeletonRows />
        ) : items.length === 0 ? (
          <EmptyState
            icon={Bell}
            title="No follow-ups"
            description="Schedule follow-ups from a contact, or from the Cold Contacts tab."
          />
        ) : (
          <>
            {overdue.length > 0 && (
              <div>
                <div className="border-b border-gray-100 bg-red-50/40 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-red-600">
                  Overdue ({overdue.length})
                </div>
                <ul className="divide-y divide-gray-50">{overdue.map((f) => <Row key={f.id} f={f} />)}</ul>
              </div>
            )}
            {pendingUpcoming.length > 0 && (
              <div>
                <div className="border-b border-gray-100 bg-gray-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Upcoming ({pendingUpcoming.length})
                </div>
                <ul className="divide-y divide-gray-50">{pendingUpcoming.map((f) => <Row key={f.id} f={f} />)}</ul>
              </div>
            )}
            {showCompleted && done.length > 0 && (
              <div>
                <div className="border-b border-gray-100 bg-gray-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Done ({done.length})
                </div>
                <ul className="divide-y divide-gray-50">{done.map((f) => <Row key={f.id} f={f} />)}</ul>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Cold contacts tab ─────────────────────────────────────────────────────────

function ColdContactsTab() {
  const navigate = useNavigate();
  const [days, setDays] = useState(30);
  const { data: stale, isLoading } = useStaleContacts(days);
  const createFollowUp = useCreateFollowUp();

  const contacts = stale || [];

  const schedule = (c) => {
    createFollowUp.mutate({
      contact_id: c.contact_id,
      company_id: c.company_id,
      due_date: daysFromNowISO(3),
      reason: `Re-engage ${[c.first_name, c.last_name].filter(Boolean).join(' ') || 'contact'} — no email in ${days}+ days`,
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm text-gray-600">Not emailed in</label>
        <select
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="h-9 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          {[7, 14, 30, 60, 90].map((d) => (
            <option key={d} value={d}>{d} days</option>
          ))}
        </select>
        <span className="text-sm text-gray-400">{contacts.length} contact{contacts.length === 1 ? '' : 's'} flagged</span>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        {isLoading ? (
          <SkeletonRows />
        ) : contacts.length === 0 ? (
          <EmptyState
            icon={Snowflake}
            title="No cold contacts"
            description="Every contact with an email has been reached within this window."
          />
        ) : (
          <ul className="divide-y divide-gray-50">
            {contacts.map((c) => (
              <li key={c.contact_id} className="flex flex-wrap items-center gap-3 px-4 py-3 hover:bg-gray-50">
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-sky-50 text-sky-500">
                  <User className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-sm font-medium text-gray-900">
                      {[c.first_name, c.last_name].filter(Boolean).join(' ') || c.email}
                    </span>
                    {c.title && <span className="truncate text-xs text-gray-500">{c.title}</span>}
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-400">
                    <span className="inline-flex items-center gap-1">
                      <Building2 className="h-3 w-3" />
                      <button
                        type="button"
                        onClick={() => c.company_id && navigate(`/companies/${c.company_id}`)}
                        className="hover:text-blue-600"
                      >
                        {c.company_name || 'Unknown company'}
                      </button>
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Mail className="h-3 w-3" />
                      {c.last_emailed_at
                        ? `last emailed ${timeAgo(c.last_emailed_at)}`
                        : 'never emailed'}
                    </span>
                  </div>
                </div>
                {c.has_open_follow_up ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-600">
                    <Clock className="h-3 w-3" />
                    Follow-up set
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => schedule(c)}
                    disabled={createFollowUp.isPending}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    <CalendarPlus className="h-3.5 w-3.5" />
                    Schedule follow-up
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function FollowUps() {
  const [tab, setTab] = useState('reminders');

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold text-gray-900">
          <Bell className="h-5 w-5 text-blue-500" />
          Follow-ups
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Track reminders and re-engage contacts that have gone cold.
        </p>
      </div>

      <div className="flex gap-1 border-b border-gray-200">
        {[
          { id: 'reminders', label: 'Reminders' },
          { id: 'cold', label: 'Cold Contacts' },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              '-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors',
              tab === t.id
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'reminders' ? <RemindersTab /> : <ColdContactsTab />}
    </div>
  );
}
