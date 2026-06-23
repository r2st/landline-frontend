import { useState, useMemo, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
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
  AlarmClock,
  ExternalLink,
  Search,
  CalendarClock,
  TrendingUp,
} from 'lucide-react';
import EmptyState from '../components/EmptyState';
import {
  useFollowUps,
  useStaleContacts,
  useUpdateFollowUp,
  useDeleteFollowUp,
  useCreateFollowUp,
} from '../hooks/useFollowUps';
import { formatDate, timeAgo, cn, daysUntil } from '../lib/utils';

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

// ─── Snooze dropdown ──────────────────────────────────────────────────────────

function SnoozeDropdown({ followUpId, onClose }) {
  const updateFollowUp = useUpdateFollowUp();
  const [showCustom, setShowCustom] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const snooze = (days) => {
    updateFollowUp.mutate(
      { id: followUpId, data: { due_date: daysFromNowISO(days) } },
      {
        onSuccess: () => {
          toast.success(`Snoozed for ${days} day${days === 1 ? '' : 's'}`);
          onClose();
        },
      }
    );
  };

  const snoozeToDate = (dateStr) => {
    if (!dateStr) return;
    const d = new Date(dateStr);
    d.setHours(12, 0, 0, 0);
    updateFollowUp.mutate(
      { id: followUpId, data: { due_date: d.toISOString() } },
      {
        onSuccess: () => {
          toast.success('Snoozed to ' + formatDate(d.toISOString()));
          onClose();
        },
      }
    );
  };

  const presets = [
    { label: 'Tomorrow', days: 1 },
    { label: 'In 3 days', days: 3 },
    { label: 'Next week', days: 7 },
  ];

  // Minimum selectable date is tomorrow
  const minDate = new Date();
  minDate.setDate(minDate.getDate() + 1);
  const minDateStr = minDate.toISOString().split('T')[0];

  return (
    <div
      ref={ref}
      className="absolute right-0 top-full z-20 mt-1 w-48 rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
    >
      {presets.map((p) => (
        <button
          key={p.days}
          type="button"
          onClick={() => snooze(p.days)}
          disabled={updateFollowUp.isPending}
          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
        >
          <AlarmClock className="h-3.5 w-3.5 text-gray-400" />
          {p.label}
        </button>
      ))}
      <div className="my-1 border-t border-gray-100" />
      {showCustom ? (
        <div className="px-3 py-2">
          <input
            type="date"
            min={minDateStr}
            autoFocus
            onChange={(e) => snoozeToDate(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowCustom(true)}
          className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-gray-700 hover:bg-gray-50"
        >
          <CalendarClock className="h-3.5 w-3.5 text-gray-400" />
          Custom date...
        </button>
      )}
    </div>
  );
}

// ─── Status badge ─────────────────────────────────────────────────────────────

function StatusBadge({ followUp }) {
  const f = followUp;

  if (f.status === 'completed') {
    return (
      <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
        Completed
      </span>
    );
  }
  if (f.status === 'dismissed') {
    return (
      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
        Dismissed
      </span>
    );
  }
  if (f.is_overdue) {
    return (
      <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
        Overdue
      </span>
    );
  }

  const days = daysUntil(f.due_date);
  if (days !== null && days === 0) {
    return (
      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
        Due today
      </span>
    );
  }

  return (
    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
      Upcoming
    </span>
  );
}

// ─── Summary stats ────────────────────────────────────────────────────────────

function SummaryStats({ items }) {
  const stats = useMemo(() => {
    const pending = items.filter((f) => f.status === 'pending');
    const overdue = pending.filter((f) => f.is_overdue);
    const dueToday = pending.filter(
      (f) => !f.is_overdue && daysUntil(f.due_date) === 0
    );
    const upcoming = pending.filter(
      (f) => !f.is_overdue && daysUntil(f.due_date) !== 0
    );
    return {
      total: pending.length,
      overdue: overdue.length,
      dueToday: dueToday.length,
      upcoming: upcoming.length,
    };
  }, [items]);

  const cards = [
    {
      label: 'Pending',
      value: stats.total,
      color: 'text-gray-900',
      bg: 'bg-gray-50',
      border: 'border-gray-200',
      icon: Bell,
      iconColor: 'text-gray-400',
    },
    {
      label: 'Overdue',
      value: stats.overdue,
      color: 'text-red-700',
      bg: 'bg-red-50',
      border: 'border-red-200',
      icon: AlertTriangle,
      iconColor: 'text-red-400',
    },
    {
      label: 'Due today',
      value: stats.dueToday,
      color: 'text-amber-700',
      bg: 'bg-amber-50',
      border: 'border-amber-200',
      icon: Clock,
      iconColor: 'text-amber-400',
    },
    {
      label: 'Upcoming',
      value: stats.upcoming,
      color: 'text-blue-700',
      bg: 'bg-blue-50',
      border: 'border-blue-200',
      icon: TrendingUp,
      iconColor: 'text-blue-400',
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {cards.map((c) => (
        <div
          key={c.label}
          className={cn(
            'flex items-center gap-3 rounded-xl border px-4 py-3',
            c.bg,
            c.border
          )}
        >
          <c.icon className={cn('h-5 w-5 flex-shrink-0', c.iconColor)} />
          <div>
            <p className={cn('text-lg font-bold leading-tight', c.color)}>{c.value}</p>
            <p className="text-xs text-gray-500">{c.label}</p>
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
  const [searchQuery, setSearchQuery] = useState('');
  const { data: followUps, isLoading } = useFollowUps(
    showCompleted ? {} : { status: 'pending' }
  );
  const updateFollowUp = useUpdateFollowUp();
  const deleteFollowUp = useDeleteFollowUp();

  const items = followUps || [];

  // Filter by search query
  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const q = searchQuery.toLowerCase();
    return items.filter(
      (f) =>
        (f.contact_name && f.contact_name.toLowerCase().includes(q)) ||
        (f.company_name && f.company_name.toLowerCase().includes(q)) ||
        (f.reason && f.reason.toLowerCase().includes(q))
    );
  }, [items, searchQuery]);

  // Categorize: overdue, due today, upcoming, done
  const overdue = filtered.filter((f) => f.is_overdue);
  const dueToday = filtered.filter(
    (f) => f.status === 'pending' && !f.is_overdue && daysUntil(f.due_date) === 0
  );
  const pendingUpcoming = filtered.filter(
    (f) => f.status === 'pending' && !f.is_overdue && daysUntil(f.due_date) !== 0
  );
  const done = filtered.filter((f) => f.status !== 'pending');

  const Row = ({ f }) => {
    const [snoozeOpen, setSnoozeOpen] = useState(false);

    const iconStyle = f.is_overdue
      ? 'bg-red-50 text-red-500'
      : daysUntil(f.due_date) === 0 && f.status === 'pending'
        ? 'bg-amber-50 text-amber-500'
        : f.status !== 'pending'
          ? 'bg-gray-100 text-gray-400'
          : 'bg-blue-50 text-blue-500';

    return (
      <li className="flex flex-wrap items-center gap-3 px-4 py-3 transition-colors hover:bg-gray-50">
        <div
          className={cn(
            'flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full',
            iconStyle
          )}
        >
          {f.is_overdue ? (
            <AlertTriangle className="h-4 w-4" />
          ) : daysUntil(f.due_date) === 0 && f.status === 'pending' ? (
            <AlarmClock className="h-4 w-4" />
          ) : (
            <Clock className="h-4 w-4" />
          )}
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
            <StatusBadge followUp={f} />
          </div>
          {f.reason && <p className="mt-0.5 truncate text-sm text-gray-600">{f.reason}</p>}
          <p className="mt-0.5 text-xs text-gray-400">Due {formatDate(f.due_date)}</p>
        </div>

        {f.status === 'pending' ? (
          <div className="relative flex items-center gap-1">
            <button
              type="button"
              title="Mark complete"
              onClick={() =>
                updateFollowUp.mutate({ id: f.id, data: { status: 'completed' } })
              }
              className="rounded-md p-1.5 text-gray-400 hover:bg-green-50 hover:text-green-600"
            >
              <Check className="h-4 w-4" />
            </button>
            <button
              type="button"
              title="Snooze"
              onClick={() => setSnoozeOpen(!snoozeOpen)}
              className={cn(
                'rounded-md p-1.5 text-gray-400 hover:bg-amber-50 hover:text-amber-600',
                snoozeOpen && 'bg-amber-50 text-amber-600'
              )}
            >
              <AlarmClock className="h-4 w-4" />
            </button>
            {f.company_id && (
              <button
                type="button"
                title="Open contact"
                onClick={() => navigate(`/companies/${f.company_id}`)}
                className="rounded-md p-1.5 text-gray-400 hover:bg-blue-50 hover:text-blue-600"
              >
                <ExternalLink className="h-4 w-4" />
              </button>
            )}
            <button
              type="button"
              title="Dismiss"
              onClick={() =>
                updateFollowUp.mutate({ id: f.id, data: { status: 'dismissed' } })
              }
              className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
            {snoozeOpen && (
              <SnoozeDropdown
                followUpId={f.id}
                onClose={() => setSnoozeOpen(false)}
              />
            )}
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
  };

  return (
    <div className="space-y-5">
      {/* Summary stats */}
      {!isLoading && items.length > 0 && <SummaryStats items={items} />}

      {/* Controls row */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, company, or reason..."
            className="h-9 w-full rounded-lg border border-gray-300 bg-white pl-9 pr-3 text-sm text-gray-700 placeholder-gray-400 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
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

      {/* Filtered count when searching */}
      {searchQuery.trim() && !isLoading && (
        <p className="text-xs text-gray-400">
          {filtered.length} result{filtered.length === 1 ? '' : 's'} matching "{searchQuery}"
        </p>
      )}

      {/* Follow-ups list */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        {isLoading ? (
          <SkeletonRows />
        ) : items.length === 0 ? (
          <EmptyState
            icon={Bell}
            title="No follow-ups yet"
            description="You haven't scheduled any follow-ups. Head to the Cold Contacts tab to find contacts that need attention, or create a follow-up from any contact page."
            action={{
              label: 'View Cold Contacts',
              onClick: () => {
                // The parent component manages the tab; this is a hint to navigate to cold contacts
                // We dispatch a custom event that the parent can listen to, but since we're
                // co-located let's use a simpler approach: find the tab button and click it.
                const coldTab = document.querySelector('[data-tab="cold"]');
                if (coldTab) coldTab.click();
              },
            }}
          />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Search}
            title="No matches"
            description={`No follow-ups match "${searchQuery}". Try a different search term or clear the filter.`}
            action={{
              label: 'Clear search',
              onClick: () => setSearchQuery(''),
            }}
          />
        ) : (
          <>
            {overdue.length > 0 && (
              <div>
                <div className="border-b border-gray-100 bg-red-50/40 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-red-600">
                  Overdue ({overdue.length})
                </div>
                <ul className="divide-y divide-gray-50">
                  {overdue.map((f) => (
                    <Row key={f.id} f={f} />
                  ))}
                </ul>
              </div>
            )}
            {dueToday.length > 0 && (
              <div>
                <div className="border-b border-gray-100 bg-amber-50/40 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-amber-600">
                  Due today ({dueToday.length})
                </div>
                <ul className="divide-y divide-gray-50">
                  {dueToday.map((f) => (
                    <Row key={f.id} f={f} />
                  ))}
                </ul>
              </div>
            )}
            {pendingUpcoming.length > 0 && (
              <div>
                <div className="border-b border-gray-100 bg-blue-50/40 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-blue-500">
                  Upcoming ({pendingUpcoming.length})
                </div>
                <ul className="divide-y divide-gray-50">
                  {pendingUpcoming.map((f) => (
                    <Row key={f.id} f={f} />
                  ))}
                </ul>
              </div>
            )}
            {showCompleted && done.length > 0 && (
              <div>
                <div className="border-b border-gray-100 bg-gray-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Done ({done.length})
                </div>
                <ul className="divide-y divide-gray-50">
                  {done.map((f) => (
                    <Row key={f.id} f={f} />
                  ))}
                </ul>
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
            <option key={d} value={d}>
              {d} days
            </option>
          ))}
        </select>
        <span className="text-sm text-gray-400">
          {contacts.length} contact{contacts.length === 1 ? '' : 's'} flagged
        </span>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        {isLoading ? (
          <SkeletonRows />
        ) : contacts.length === 0 ? (
          <EmptyState
            icon={Snowflake}
            title="All contacts are warm"
            description={`Every contact with an email has been reached within the last ${days} days. Adjust the window above to widen the search.`}
          />
        ) : (
          <ul className="divide-y divide-gray-50">
            {contacts.map((c) => (
              <li
                key={c.contact_id}
                className="flex flex-wrap items-center gap-3 px-4 py-3 hover:bg-gray-50"
              >
                <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-sky-50 text-sky-500">
                  <User className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="truncate text-sm font-medium text-gray-900">
                      {[c.first_name, c.last_name].filter(Boolean).join(' ') || c.email}
                    </span>
                    {c.title && (
                      <span className="truncate text-xs text-gray-500">{c.title}</span>
                    )}
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-400">
                    <span className="inline-flex items-center gap-1">
                      <Building2 className="h-3 w-3" />
                      <button
                        type="button"
                        onClick={() =>
                          c.company_id && navigate(`/companies/${c.company_id}`)
                        }
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
            data-tab={t.id}
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
