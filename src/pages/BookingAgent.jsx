import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle, CalendarCheck, CalendarClock, CheckCircle2, ChevronRight, Clock,
  Loader2, Mail, MessageSquare, Pencil, RefreshCw, Settings2, Users, X,
} from 'lucide-react';
import EmptyState from '../components/EmptyState';
import { gmailApi } from '../api/client';
import { useAuth } from '../context/AuthContext';
import {
  useCancelMeeting, useMeetingDetail, useMeetingStats, useMeetings,
  useMeetingAgentConfig, useUpdateMeetingAgentConfig,
} from '../hooks/useMeetingAgent';
import { cn, timeAgo } from '../lib/utils';

/**
 * Meeting Booking Agent — the autonomous scheduler that runs once Dialtone gets
 * a positive reply. This dashboard is where an operator turns it on, points it
 * at a calendar, tunes the scheduling window, and watches the meetings it books:
 * the funnel stats, the upcoming list, and each meeting's scheduling thread.
 */

// A curated timezone list — enough to cover the team without a giant picker.
const TIMEZONES = [
  'Asia/Kolkata', 'America/New_York', 'America/Chicago', 'America/Denver',
  'America/Los_Angeles', 'Europe/London', 'Europe/Berlin', 'Europe/Paris',
  'Asia/Singapore', 'Asia/Dubai', 'Australia/Sydney', 'UTC',
];

// Status → badge styling + label. Mirrors the sender/policy pages' token usage.
const STATUS_META = {
  proposed: { label: 'Proposed', tone: 'bg-amber-50 text-amber-700 ring-amber-200', dot: 'bg-amber-400' },
  confirmed: { label: 'Confirmed', tone: 'bg-green-50 text-green-700 ring-green-200', dot: 'bg-green-500' },
  completed: { label: 'Completed', tone: 'bg-indigo-50 text-indigo-700 ring-indigo-200', dot: 'bg-indigo-500' },
  cancelled: { label: 'Cancelled', tone: 'bg-gray-100 text-gray-500 ring-gray-200', dot: 'bg-gray-400' },
  no_show: { label: 'No-show', tone: 'bg-red-50 text-red-700 ring-red-200', dot: 'bg-red-500' },
};

function statusMeta(status) {
  return STATUS_META[status] || { label: status || 'Unknown', tone: 'bg-gray-100 text-gray-500 ring-gray-200', dot: 'bg-gray-400' };
}

function fmtDateTime(iso, tz) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString(undefined, {
      weekday: 'short', month: 'short', day: 'numeric',
      hour: 'numeric', minute: '2-digit',
      timeZone: tz || undefined,
    });
  } catch {
    return new Date(iso).toLocaleString();
  }
}

export default function BookingAgent() {
  const { isAdmin } = useAuth();
  const { data: config, isLoading: configLoading, isError: configError, refetch: refetchConfig } =
    useMeetingAgentConfig();
  const { data: stats } = useMeetingStats();
  const [filter, setFilter] = useState('upcoming');
  const { data: meetingsData, isLoading: meetingsLoading, isError: meetingsError, refetch: refetchMeetings, isFetching } =
    useMeetings({ filter });

  const meetings = meetingsData?.items || [];

  return (
    <div className="space-y-6">
      <Header
        active={config?.is_active}
        onRefresh={() => { refetchConfig(); refetchMeetings(); }}
        refreshing={isFetching}
      />

      {configLoading ? (
        <div className="flex items-center justify-center py-12 text-gray-400">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : configError ? (
        <LoadError onRetry={refetchConfig} />
      ) : (
        <>
          <StatsRow stats={stats} />
          <AgentConfigCard config={config} canEdit={isAdmin} />
          <MeetingsSection
            meetings={meetings}
            filter={filter}
            onFilter={setFilter}
            loading={meetingsLoading}
            error={meetingsError}
            onRetry={refetchMeetings}
          />
        </>
      )}
    </div>
  );
}

function Header({ active, onRefresh, refreshing }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-gray-900">
          <CalendarCheck className="h-6 w-6 text-indigo-500" />
          Meeting Booking Agent
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-gray-500">
          When Dialtone gets a positive reply, this agent proposes calendar slots, handles the
          scheduling back-and-forth, books the invite, and sends a reminder — autonomously.
        </p>
      </div>
      <div className="flex items-center gap-2">
        <span
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ring-1 ring-inset',
            active ? 'bg-green-50 text-green-700 ring-green-200' : 'bg-gray-100 text-gray-500 ring-gray-200'
          )}
        >
          <span className={cn('h-2 w-2 rounded-full', active ? 'bg-green-500' : 'bg-gray-400')} />
          {active ? 'Active' : 'Off'}
        </span>
        <button
          type="button"
          onClick={onRefresh}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-600 shadow-sm hover:bg-gray-50"
        >
          <RefreshCw className={cn('h-3.5 w-3.5', refreshing && 'animate-spin')} />
          Refresh
        </button>
      </div>
    </div>
  );
}

function LoadError({ onRetry }) {
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-amber-900">
        <AlertTriangle className="h-4 w-4" />
        Couldn&apos;t load the booking agent
      </h2>
      <button
        type="button"
        onClick={onRetry}
        className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-sm font-medium text-amber-800 hover:bg-amber-50"
      >
        <RefreshCw className="h-3.5 w-3.5" />
        Try again
      </button>
    </div>
  );
}

// ─── stats ───────────────────────────────────────────────────────────────────

function StatsRow({ stats }) {
  const pct = (v) => (v == null ? '—' : `${Math.round(v * 100)}%`);
  const cards = [
    { label: 'Total booked', value: stats ? stats.confirmed + stats.completed : '—', icon: CalendarCheck, hint: `${stats?.proposed ?? 0} proposed` },
    { label: 'Upcoming', value: stats?.upcoming ?? '—', icon: CalendarClock },
    { label: 'Show rate', value: pct(stats?.show_rate), icon: CheckCircle2, hint: `${stats?.no_show ?? 0} no-shows` },
    { label: 'Avg time to book', value: stats?.avg_hours_to_book != null ? `${stats.avg_hours_to_book}h` : '—', icon: Clock },
  ];
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {cards.map((c) => (
        <div key={c.label} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center gap-2 text-gray-400">
            <c.icon className="h-4 w-4" />
            <span className="text-[11px] font-medium uppercase tracking-wide">{c.label}</span>
          </div>
          <div className="mt-1.5 text-2xl font-bold tabular-nums text-gray-900">{c.value}</div>
          {c.hint && <div className="mt-0.5 text-[11px] text-gray-400">{c.hint}</div>}
        </div>
      ))}
    </div>
  );
}

// ─── config ──────────────────────────────────────────────────────────────────

function AgentConfigCard({ config, canEdit }) {
  const [editing, setEditing] = useState(false);
  const save = useUpdateMeetingAgentConfig();

  // Connected Gmail accounts for the calendar selector.
  const { data: accounts } = useQuery({
    queryKey: ['gmail-accounts'],
    queryFn: () => gmailApi.accounts(),
    retry: false,
  });
  const accountList = Array.isArray(accounts) ? accounts : [];
  const selectedAccount = accountList.find((a) => a.id === config?.calendar_account_id);
  const calendarLabel = selectedAccount ? (selectedAccount.email || selectedAccount.display_name) : null;

  const toggleActive = () => {
    save.mutate({ is_active: !config.is_active });
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 p-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
          <Settings2 className="h-4 w-4 text-gray-400" />
          Configuration
        </h2>
        {canEdit && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleActive}
              disabled={save.isPending}
              aria-pressed={!!config.is_active}
              className={cn(
                'relative inline-flex h-6 w-11 flex-shrink-0 items-center rounded-full transition-colors',
                config.is_active ? 'bg-green-500' : 'bg-gray-300'
              )}
              aria-label={config.is_active ? 'Turn agent off' : 'Turn agent on'}
            >
              <span
                className={cn(
                  'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform',
                  config.is_active ? 'translate-x-6' : 'translate-x-1'
                )}
              />
            </button>
            {!editing && (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50"
              >
                <Pencil className="h-3 w-3" />
                Edit
              </button>
            )}
          </div>
        )}
      </div>

      {editing ? (
        <ConfigForm
          config={config}
          accounts={accountList}
          save={save}
          onDone={() => setEditing(false)}
        />
      ) : (
        <ConfigSummary config={config} calendarLabel={calendarLabel} />
      )}

      {config.is_active && !config.calendar_account_id && (
        <div className="flex items-center gap-2 border-t border-amber-100 bg-amber-50 px-4 py-2.5 text-xs text-amber-800">
          <AlertTriangle className="h-3.5 w-3.5" />
          The agent is on but no calendar is connected — it can&apos;t propose times until you pick one.
        </div>
      )}
    </div>
  );
}

function ConfigSummary({ config, calendarLabel }) {
  const rows = [
    { label: 'Calendar', value: calendarLabel || <span className="text-amber-600">Not set</span> },
    { label: 'Meeting length', value: `${config.default_meeting_duration_minutes} min` },
    { label: 'Buffer between', value: `${config.buffer_between_meetings_minutes} min` },
    { label: 'Working hours', value: `${config.working_hours_start}–${config.working_hours_end}` },
    { label: 'Timezone', value: config.timezone },
    { label: 'Book up to', value: `${config.booking_window_days} days ahead` },
    { label: 'Max / day', value: `${config.max_daily_meetings} meetings` },
  ];
  return (
    <dl className="grid grid-cols-2 gap-x-6 gap-y-3 p-4 sm:grid-cols-3 lg:grid-cols-4">
      {rows.map((r) => (
        <div key={r.label}>
          <dt className="text-[11px] font-medium uppercase tracking-wide text-gray-400">{r.label}</dt>
          <dd className="mt-0.5 text-sm font-medium text-gray-900">{r.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function ConfigForm({ config, accounts, save, onDone }) {
  const [form, setForm] = useState({
    calendar_account_id: config.calendar_account_id || '',
    default_meeting_duration_minutes: config.default_meeting_duration_minutes,
    buffer_between_meetings_minutes: config.buffer_between_meetings_minutes,
    working_hours_start: config.working_hours_start,
    working_hours_end: config.working_hours_end,
    timezone: config.timezone,
    booking_window_days: config.booking_window_days,
    max_daily_meetings: config.max_daily_meetings,
    confirmation_template: config.confirmation_template || '',
    reminder_template: config.reminder_template || '',
  });

  const set = (key) => (e) => {
    const raw = e.target.value;
    const numeric = ['default_meeting_duration_minutes', 'buffer_between_meetings_minutes',
      'booking_window_days', 'max_daily_meetings'].includes(key);
    setForm((f) => ({ ...f, [key]: numeric ? Number(raw) : raw }));
  };

  const submit = (e) => {
    e.preventDefault();
    const body = {
      ...form,
      // An empty selection means "no calendar" → send null, not "".
      calendar_account_id: form.calendar_account_id || null,
      confirmation_template: form.confirmation_template.trim() || null,
      reminder_template: form.reminder_template.trim() || null,
    };
    save.mutate(body, { onSuccess: () => onDone() });
  };

  return (
    <form onSubmit={submit} className="space-y-4 p-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Calendar account">
          <select
            value={form.calendar_account_id}
            onChange={set('calendar_account_id')}
            aria-label="Calendar account"
            className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">— none —</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.email || a.display_name}</option>
            ))}
          </select>
        </Field>
        <Field label="Timezone">
          <select
            value={form.timezone}
            onChange={set('timezone')}
            aria-label="Timezone"
            className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            {TIMEZONES.includes(form.timezone) ? null : <option value={form.timezone}>{form.timezone}</option>}
            {TIMEZONES.map((tz) => <option key={tz} value={tz}>{tz}</option>)}
          </select>
        </Field>
        <Field label="Meeting length (min)">
          <NumberInput value={form.default_meeting_duration_minutes} onChange={set('default_meeting_duration_minutes')} min={5} max={480} label="Meeting length" />
        </Field>
        <Field label="Buffer between (min)">
          <NumberInput value={form.buffer_between_meetings_minutes} onChange={set('buffer_between_meetings_minutes')} min={0} max={240} label="Buffer between meetings" />
        </Field>
        <Field label="Working hours start">
          <input type="time" value={form.working_hours_start} onChange={set('working_hours_start')} aria-label="Working hours start"
            className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
        </Field>
        <Field label="Working hours end">
          <input type="time" value={form.working_hours_end} onChange={set('working_hours_end')} aria-label="Working hours end"
            className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
        </Field>
        <Field label="Book up to (days ahead)">
          <NumberInput value={form.booking_window_days} onChange={set('booking_window_days')} min={1} max={60} label="Booking window days" />
        </Field>
        <Field label="Max meetings / day">
          <NumberInput value={form.max_daily_meetings} onChange={set('max_daily_meetings')} min={1} max={50} label="Max meetings per day" />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Confirmation template (optional)" hint="Placeholders: {name} {when} {title} {rep_name}">
          <textarea rows={3} value={form.confirmation_template} onChange={set('confirmation_template')} aria-label="Confirmation template"
            placeholder="Leave blank to use the default copy"
            className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
        </Field>
        <Field label="Reminder template (optional)" hint="Placeholders: {name} {when} {title} {rep_name}">
          <textarea rows={3} value={form.reminder_template} onChange={set('reminder_template')} aria-label="Reminder template"
            placeholder="Leave blank to use the default copy"
            className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500" />
        </Field>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={save.isPending}
          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
        >
          {save.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          Save settings
        </button>
        <button type="button" onClick={onDone} className="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-500 hover:text-gray-700">
          Cancel
        </button>
      </div>
    </form>
  );
}

function Field({ label, hint, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-gray-500">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-gray-400">{hint}</span>}
    </label>
  );
}

function NumberInput({ value, onChange, min, max, label }) {
  return (
    <input
      type="number" value={value} onChange={onChange} min={min} max={max} aria-label={label}
      className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
    />
  );
}

// ─── meetings ─────────────────────────────────────────────────────────────────

const FILTERS = [
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'all', label: 'All' },
  { key: 'past', label: 'Past' },
];

function MeetingsSection({ meetings, filter, onFilter, loading, error, onRetry }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 p-4">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
          <CalendarClock className="h-4 w-4 text-gray-400" />
          Meetings
        </h2>
        <div className="inline-flex rounded-lg border border-gray-200 p-0.5">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => onFilter(f.key)}
              className={cn(
                'rounded-md px-3 py-1 text-xs font-medium transition-colors',
                filter === f.key ? 'bg-indigo-600 text-white' : 'text-gray-500 hover:text-gray-800'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-gray-400">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : error ? (
        <div className="p-4">
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            <p className="flex items-center gap-2 font-medium"><AlertTriangle className="h-4 w-4" /> Couldn&apos;t load meetings</p>
            <button type="button" onClick={onRetry} className="mt-2 inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-3 py-1 text-xs font-medium text-amber-800 hover:bg-amber-50">
              <RefreshCw className="h-3 w-3" /> Try again
            </button>
          </div>
        </div>
      ) : meetings.length === 0 ? (
        <EmptyState
          icon={CalendarCheck}
          title={filter === 'upcoming' ? 'No upcoming meetings' : 'No meetings yet'}
          description="When a prospect replies with interest, the agent proposes times here and books the ones they pick."
        />
      ) : (
        <ul className="divide-y divide-gray-100">
          {meetings.map((m) => <MeetingRow key={m.id} meeting={m} />)}
        </ul>
      )}
    </div>
  );
}

function MeetingRow({ meeting: m }) {
  const [open, setOpen] = useState(false);
  const meta = statusMeta(m.status);
  const who = m.contact_name || m.contact_email || 'Unknown contact';

  return (
    <li className={cn(open && 'bg-gray-50/60')}>
      <div className="flex flex-wrap items-center gap-3 p-4">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-label={`${open ? 'Hide' : 'Show'} details for ${who}`}
          className="rounded text-gray-400 hover:text-gray-700"
        >
          <ChevronRight className={cn('h-4 w-4 transition-transform', open && 'rotate-90')} />
        </button>
        <span className={cn('h-2.5 w-2.5 flex-shrink-0 rounded-full', meta.dot)} aria-hidden="true" />
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 truncate font-medium text-gray-900">
            <Users className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
            {who}
          </p>
          <p className="truncate text-xs text-gray-400">{m.title}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 sm:ml-auto">
          <div className="text-right text-sm text-gray-700">
            {m.start_time ? (
              <span className="flex items-center gap-1.5"><CalendarClock className="h-3.5 w-3.5 text-gray-400" />{fmtDateTime(m.start_time, m.timezone)}</span>
            ) : (
              <span className="text-gray-400">Awaiting pick · {timeAgo(m.created_at)}</span>
            )}
          </div>
          <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1 ring-inset', meta.tone)}>
            {meta.label}
          </span>
        </div>
      </div>
      {open && <MeetingDetail id={m.id} status={m.status} />}
    </li>
  );
}

function MeetingDetail({ id, status }) {
  const { data, isLoading } = useMeetingDetail(id);
  const cancel = useCancelMeeting();
  const canCancel = status === 'proposed' || status === 'confirmed';

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 border-t border-gray-100 px-4 py-4 text-sm text-gray-400">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
      </div>
    );
  }
  if (!data) return null;

  return (
    <div className="space-y-4 border-t border-gray-100 px-4 py-4">
      {data.calendar_event_id && (
        <div className="flex items-center gap-1.5 text-sm text-green-700">
          <CheckCircle2 className="h-4 w-4" />
          Calendar invite created
        </div>
      )}

      {Array.isArray(data.proposed_slots) && data.proposed_slots.length > 0 && (
        <div>
          <h4 className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Proposed slots</h4>
          <ul className="mt-1.5 flex flex-wrap gap-2">
            {data.proposed_slots.map((s, i) => (
              <li key={i} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2.5 py-1 text-xs text-gray-700">
                <Clock className="h-3 w-3 text-gray-400" />
                {s.label || fmtDateTime(s.start, data.timezone)}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <h4 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-gray-500">
          <MessageSquare className="h-3.5 w-3.5" /> Scheduling thread
        </h4>
        {Array.isArray(data.conversation_thread) && data.conversation_thread.length > 0 ? (
          <ul className="mt-2 space-y-2">
            {data.conversation_thread.map((turn, i) => (
              <li key={i} className={cn('flex', turn.role === 'agent' ? 'justify-end' : 'justify-start')}>
                <div
                  className={cn(
                    'max-w-[80%] rounded-lg px-3 py-2 text-sm',
                    turn.role === 'agent' ? 'bg-indigo-50 text-indigo-900' : 'bg-gray-100 text-gray-800'
                  )}
                >
                  <div className="mb-0.5 flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wide opacity-60">
                    {turn.role === 'agent' ? <Mail className="h-3 w-3" /> : <Users className="h-3 w-3" />}
                    {turn.role === 'agent' ? (turn.kind || 'Agent') : 'Prospect'}
                  </div>
                  <p className="whitespace-pre-wrap break-words">{turn.text || <span className="italic opacity-60">(no text)</span>}</p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-1 text-sm text-gray-400">No messages recorded yet.</p>
        )}
      </div>

      {canCancel && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => cancel.mutate(id)}
            disabled={cancel.isPending}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50 disabled:opacity-50"
          >
            {cancel.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <X className="h-3 w-3" />}
            Cancel meeting
          </button>
        </div>
      )}
    </div>
  );
}
