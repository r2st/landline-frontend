import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckSquare, Plus, Search, List, Calendar as CalendarIcon, Check, Pencil, Trash2,
  Building2, AlertTriangle, ChevronLeft, ChevronRight,
} from 'lucide-react';
import EmptyState from '../components/EmptyState';
import TaskFormModal from '../components/TaskFormModal';
import { useTasks, useCreateTask, useUpdateTask, useDeleteTask } from '../hooks/useTasks';
import { useCompanies } from '../hooks/useCompanies';
import {
  TASK_PRIORITIES, TASK_PRIORITY_LABELS, TASK_PRIORITY_COLORS,
  TASK_STATUSES, TASK_STATUS_LABELS,
} from '../lib/constants';
import { formatDate, daysUntil, cn } from '../lib/utils';

const isDone = (t) => t.status === 'completed' || t.status === 'done';

function PriorityDot({ priority }) {
  const c = TASK_PRIORITY_COLORS[priority] || TASK_PRIORITY_COLORS.medium;
  return <span className={cn('h-2 w-2 flex-shrink-0 rounded-full', c.dot)} />;
}

function TaskCard({ task, onToggle, onEdit, onDelete, onOpenCompany }) {
  const done = isDone(task);
  const days = daysUntil(task.due_date);
  const overdue = !done && days != null && days < 0;
  const palette = TASK_PRIORITY_COLORS[task.priority] || TASK_PRIORITY_COLORS.medium;

  return (
    <li
      className={cn(
        'flex items-start gap-3 border-l-4 px-4 py-3 transition-colors hover:bg-gray-50',
        done ? 'border-l-gray-200' : palette.accent,
        overdue && 'bg-red-50/40'
      )}
    >
      <button
        type="button"
        onClick={() => onToggle(task)}
        title={done ? 'Mark open' : 'Mark complete'}
        className={cn(
          'mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded border transition-colors',
          done ? 'border-green-500 bg-green-500 text-white' : 'border-gray-300 hover:border-green-400'
        )}
      >
        {done && <Check className="h-3.5 w-3.5" />}
      </button>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className={cn('text-sm font-medium', done ? 'text-gray-400 line-through' : 'text-gray-900')}>
            {task.title}
          </span>
          <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium', palette.bg, palette.text)}>
            <PriorityDot priority={task.priority} />
            {TASK_PRIORITY_LABELS[task.priority] || task.priority}
          </span>
          {overdue && (
            <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-medium text-red-700">
              <AlertTriangle className="h-3 w-3" />
              Overdue
            </span>
          )}
        </div>
        {task.description && <p className="mt-0.5 truncate text-sm text-gray-600">{task.description}</p>}
        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-400">
          {task.due_date && (
            <span className={cn(overdue && 'font-medium text-red-600')}>
              Due {formatDate(task.due_date)}
              {!done && days != null && days >= 0 && days <= 7 && <span> · in {days}d</span>}
            </span>
          )}
          {(task.company_name || task.company_id) && (
            <button
              type="button"
              onClick={() => task.company_id && onOpenCompany(task.company_id)}
              className="inline-flex items-center gap-1 hover:text-blue-600"
            >
              <Building2 className="h-3 w-3" />
              {task.company_name || 'Company'}
            </button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1">
        <button type="button" onClick={() => onEdit(task)} title="Edit" className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
          <Pencil className="h-4 w-4" />
        </button>
        <button type="button" onClick={() => onDelete(task)} title="Delete" className="rounded-md p-1.5 text-gray-300 hover:bg-red-50 hover:text-red-500">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </li>
  );
}

function Section({ title, count, tone, children }) {
  if (count === 0) return null;
  return (
    <div>
      <div className={cn('border-b border-gray-100 px-4 py-2 text-xs font-semibold uppercase tracking-wide', tone)}>
        {title} ({count})
      </div>
      <ul className="divide-y divide-gray-50">{children}</ul>
    </div>
  );
}

// ─── Calendar view ───────────────────────────────────────────────────────────

function CalendarView({ tasks, onOpenCompany }) {
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  const { year, month } = cursor;
  const first = new Date(year, month, 1);
  const startDay = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayKey = new Date().toDateString();

  // Bucket tasks by their due date's local date string.
  const byDay = useMemo(() => {
    const map = {};
    for (const t of tasks) {
      if (!t.due_date) continue;
      const d = new Date(t.due_date);
      if (isNaN(d)) continue;
      const key = new Date(d.getFullYear(), d.getMonth(), d.getDate()).toDateString();
      (map[key] = map[key] || []).push(t);
    }
    return map;
  }, [tasks]);

  const cells = [];
  for (let i = 0; i < startDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const monthLabel = first.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  const shift = (delta) => {
    setCursor((c) => {
      const m = c.month + delta;
      return { year: c.year + Math.floor(m / 12), month: ((m % 12) + 12) % 12 };
    });
  };

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900">{monthLabel}</h2>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => shift(-1)} className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button type="button" onClick={() => setCursor({ year: new Date().getFullYear(), month: new Date().getMonth() })} className="rounded-md px-2 py-1 text-xs font-medium text-gray-500 hover:bg-gray-100">
            Today
          </button>
          <button type="button" onClick={() => shift(1)} className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
      <div className="grid grid-cols-7 gap-px min-w-[500px]">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <div key={d} className="pb-1 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-400">{d}</div>
        ))}
        {cells.map((day, i) => {
          if (day == null) return <div key={`empty-${i}`} className="min-h-[60px] sm:min-h-[84px] rounded-lg bg-gray-50/50" />;
          const key = new Date(year, month, day).toDateString();
          const dayTasks = byDay[key] || [];
          const isToday = key === todayKey;
          return (
            <div key={key} className={cn('min-h-[60px] sm:min-h-[84px] rounded-lg border p-1 sm:p-1.5', isToday ? 'border-blue-300 bg-blue-50/40' : 'border-gray-100')}>
              <div className={cn('mb-1 text-xs font-medium', isToday ? 'text-blue-600' : 'text-gray-500')}>{day}</div>
              <div className="space-y-1">
                {dayTasks.slice(0, 3).map((t) => {
                  const palette = TASK_PRIORITY_COLORS[t.priority] || TASK_PRIORITY_COLORS.medium;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => t.company_id && onOpenCompany(t.company_id)}
                      title={t.title}
                      className={cn('flex w-full items-center gap-1 rounded px-1.5 py-0.5 text-left text-[11px] font-medium', palette.bg, palette.text, isDone(t) && 'opacity-50 line-through')}
                    >
                      <PriorityDot priority={t.priority} />
                      <span className="truncate">{t.title}</span>
                    </button>
                  );
                })}
                {dayTasks.length > 3 && (
                  <div className="px-1.5 text-[11px] text-gray-400">+{dayTasks.length - 3} more</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function Tasks() {
  const navigate = useNavigate();
  const [view, setView] = useState('list');
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const { data: tasks = [], isLoading } = useTasks();
  const { data: companies = [] } = useCompanies();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (tasks || []).filter((t) => {
      if (priorityFilter && t.priority !== priorityFilter) return false;
      if (statusFilter === 'completed' && !isDone(t)) return false;
      if (statusFilter && statusFilter !== 'completed' && t.status !== statusFilter) return false;
      if (q && !(`${t.title} ${t.description || ''} ${t.company_name || ''}`.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [tasks, search, priorityFilter, statusFilter]);

  // Buckets for the list view.
  const buckets = useMemo(() => {
    const overdue = [], today = [], upcoming = [], noDate = [], done = [];
    for (const t of filtered) {
      if (isDone(t)) { done.push(t); continue; }
      if (!t.due_date) { noDate.push(t); continue; }
      const d = daysUntil(t.due_date);
      if (d == null) noDate.push(t);
      else if (d < 0) overdue.push(t);
      else if (d === 0) today.push(t);
      else upcoming.push(t);
    }
    const byDue = (a, b) => new Date(a.due_date) - new Date(b.due_date);
    upcoming.sort(byDue);
    return { overdue, today, upcoming, noDate, done };
  }, [filtered]);

  const openAdd = () => { setEditing(null); setModalOpen(true); };
  const openEdit = (t) => { setEditing(t); setModalOpen(true); };

  const toggle = (t) => updateTask.mutate({ id: t.id, data: { status: isDone(t) ? 'open' : 'completed' } });
  const remove = (t) => deleteTask.mutate(t.id);

  const handleSubmit = (payload) => {
    if (editing) updateTask.mutate({ id: editing.id, data: payload }, { onSuccess: () => setModalOpen(false) });
    else createTask.mutate(payload, { onSuccess: () => setModalOpen(false) });
  };

  const cardProps = { onToggle: toggle, onEdit: openEdit, onDelete: remove, onOpenCompany: (id) => navigate(`/companies/${id}`) };
  const hasFilters = search || priorityFilter || statusFilter;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-gray-900">
            <CheckSquare className="h-5 w-5 text-blue-500" />
            Tasks
          </h1>
          <p className="mt-1 text-sm text-gray-500">Follow-ups and to-dos across all your accounts.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-gray-300 bg-white p-0.5">
            <button
              type="button"
              onClick={() => setView('list')}
              className={cn('inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium', view === 'list' ? 'bg-blue-50 text-blue-700' : 'text-gray-500 hover:text-gray-700')}
            >
              <List className="h-4 w-4" /> List
            </button>
            <button
              type="button"
              onClick={() => setView('calendar')}
              className={cn('inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium', view === 'calendar' ? 'bg-blue-50 text-blue-700' : 'text-gray-500 hover:text-gray-700')}
            >
              <CalendarIcon className="h-4 w-4" /> Calendar
            </button>
          </div>
          <button
            type="button"
            onClick={openAdd}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-500 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-600"
          >
            <Plus className="h-4 w-4" />
            Add Task
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full sm:flex-1" style={{ minWidth: '200px', maxWidth: '360px' }}>
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 w-full rounded-lg border border-gray-300 bg-white pl-9 pr-3 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">All Priorities</option>
          {TASK_PRIORITIES.map((p) => (
            <option key={p} value={p}>{TASK_PRIORITY_LABELS[p]}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value="">All Statuses</option>
          {TASK_STATUSES.map((s) => (
            <option key={s} value={s}>{TASK_STATUS_LABELS[s]}</option>
          ))}
        </select>
        {hasFilters && (
          <button type="button" onClick={() => { setSearch(''); setPriorityFilter(''); setStatusFilter(''); }} className="text-sm text-gray-500 hover:text-gray-700">
            Clear
          </button>
        )}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
        </div>
      ) : view === 'calendar' ? (
        <CalendarView tasks={filtered} onOpenCompany={(id) => navigate(`/companies/${id}`)} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={CheckSquare}
          title="No tasks"
          description={hasFilters ? 'No tasks match your filters.' : 'Add your first task to start tracking follow-ups.'}
          action={!hasFilters ? { label: 'Add Task', onClick: openAdd } : undefined}
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <Section title="Overdue" count={buckets.overdue.length} tone="bg-red-50/40 text-red-600">
            {buckets.overdue.map((t) => <TaskCard key={t.id} task={t} {...cardProps} />)}
          </Section>
          <Section title="Today" count={buckets.today.length} tone="bg-blue-50/40 text-blue-600">
            {buckets.today.map((t) => <TaskCard key={t.id} task={t} {...cardProps} />)}
          </Section>
          <Section title="Upcoming" count={buckets.upcoming.length} tone="bg-gray-50 text-gray-500">
            {buckets.upcoming.map((t) => <TaskCard key={t.id} task={t} {...cardProps} />)}
          </Section>
          <Section title="No due date" count={buckets.noDate.length} tone="bg-gray-50 text-gray-500">
            {buckets.noDate.map((t) => <TaskCard key={t.id} task={t} {...cardProps} />)}
          </Section>
          <Section title="Completed" count={buckets.done.length} tone="bg-gray-50 text-gray-500">
            {buckets.done.map((t) => <TaskCard key={t.id} task={t} {...cardProps} />)}
          </Section>
        </div>
      )}

      <TaskFormModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSubmit={handleSubmit}
        task={editing}
        companies={companies}
        saving={createTask.isPending || updateTask.isPending}
      />
    </div>
  );
}
