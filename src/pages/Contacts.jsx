import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Search,
  CreditCard,
  Mail,
  Phone,
  Linkedin,
  Building2,
  MapPin,
  Users,
  ScanLine,
  ArrowUpDown,
  LayoutGrid,
  Trash2,
  Briefcase,
  X,
  ChevronLeft,
  ChevronRight,
  Download,
  Check,
  UserPlus,
} from 'lucide-react';
import toast from 'react-hot-toast';
import EmptyState from '../components/EmptyState';
import MetricCard from '../components/MetricCard';
import ContactDetailModal from '../components/ContactDetailModal';
import { useContacts, useDeleteContact, useQuickAddContact } from '../hooks/useContacts';
import { getInitials, cn, formatDate, timeAgo, contactPhones } from '../lib/utils';

/** Friendly label + styling for a contact's source. */
function sourceMeta(source) {
  const s = (source || '').toLowerCase();
  if (/card|scan/.test(s)) {
    return { label: 'Scanned Card', className: 'bg-blue-50 text-blue-700 ring-blue-200', icon: CreditCard };
  }
  const labels = {
    manual: 'Manual',
    csv_import: 'CSV Import',
    web_scrape: 'Web Scrape',
    referral: 'Referral',
    linkedin: 'LinkedIn',
    apollo: 'Apollo',
    quick_add: 'Quick Add',
  };
  const label = labels[s] || (source ? source.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : 'Other');
  return { label, className: 'bg-gray-100 text-gray-600 ring-gray-200', icon: Briefcase };
}

/** Maps the old client-side sort keys to server-side field + direction. */
const SORTS = {
  recent: { label: 'Recently added', sortBy: 'created_at', sortDir: 'desc' },
  name: { label: 'Name (A–Z)', sortBy: 'first_name', sortDir: 'asc' },
  company: { label: 'Company (A–Z)', sortBy: 'company_name', sortDir: 'asc' },
};

function fullName(c) {
  return [c.first_name, c.last_name].filter(Boolean).join(' ').trim() || c.email || 'Unknown';
}

// ─── CSV export helper (self-contained, mirrors Companies.jsx) ─────────────
function downloadCsv(filename, headers, rows) {
  const escape = (val) => {
    const str = Array.isArray(val) ? val.join('; ') : val == null ? '' : String(val);
    return `"${str.replace(/"/g, '""')}"`;
  };
  const csv = [headers.map(escape).join(','), ...rows.map((r) => r.map(escape).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const CONTACT_EXPORT_COLS = [
  ['First Name', (c) => c.first_name],
  ['Last Name', (c) => c.last_name],
  ['Email', (c) => c.email],
  ['Phone', (c) => c.phone],
  ['Title', (c) => c.title],
  ['Company', (c) => c.company],
  ['City', (c) => c.city],
  ['State', (c) => c.state],
  ['Country', (c) => c.country],
  ['LinkedIn', (c) => c.linkedin_url],
  ['Source', (c) => c.source],
  ['Created', (c) => c.created_at],
];

// ─── Contact Card ──────────────────────────────────────────────────────────
function ContactCard({ contact, highlighted, onDelete, onOpen, selected, onSelect }) {
  const meta = sourceMeta(contact.source);
  const name = fullName(contact);
  const location = [contact.city, contact.industry_segment].filter(Boolean).join(' · ');
  const phones = contactPhones(contact);

  return (
    <div
      onClick={() => onOpen(contact)}
      className={cn(
        'group relative flex cursor-pointer flex-col rounded-xl border bg-white p-4 shadow-sm transition-all hover:border-blue-300 hover:shadow-md',
        highlighted ? 'border-blue-400 ring-2 ring-blue-200' : 'border-gray-200',
        selected && 'border-blue-400 bg-blue-50/40 ring-2 ring-blue-200'
      )}
    >
      {/* Selection checkbox */}
      <label
        className="absolute left-3 top-3 z-10"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          type="checkbox"
          checked={selected}
          onChange={(e) => onSelect(contact.id, e.target.checked)}
          className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
      </label>

      {/* Source badge */}
      <span
        className={cn(
          'absolute right-3 top-3 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ring-1',
          meta.className
        )}
      >
        <meta.icon className="h-3 w-3" />
        {meta.label}
      </span>

      {/* Identity */}
      <div className="flex items-start gap-3 pl-5 pr-24">
        <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-600">
          {getInitials(contact.first_name, contact.last_name)}
        </div>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-gray-900">{name}</p>
          {contact.title && <p className="truncate text-xs text-gray-500">{contact.title}</p>}
        </div>
      </div>

      {/* Company */}
      {contact.company && (
        <div className="mt-3 flex items-center gap-2 text-sm text-gray-700">
          <Building2 className="h-4 w-4 flex-shrink-0 text-gray-400" />
          {contact.company_id ? (
            <Link to={`/companies/${contact.company_id}`} onClick={(e) => e.stopPropagation()} className="truncate font-medium text-blue-600 hover:text-blue-700">
              {contact.company}
            </Link>
          ) : (
            <span className="truncate">{contact.company}</span>
          )}
        </div>
      )}

      {location && (
        <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
          <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
          <span className="truncate">{location}</span>
        </div>
      )}

      {/* Contact details */}
      <div className="mt-3 space-y-1.5 border-t border-gray-100 pt-3">
        {contact.email ? (
          <a
            href={`mailto:${contact.email}`}
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-2 text-xs text-gray-600 hover:text-blue-600"
          >
            <Mail className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
            <span className="truncate">{contact.email}</span>
          </a>
        ) : (
          <div className="flex items-center gap-2 text-xs text-gray-300">
            <Mail className="h-3.5 w-3.5 flex-shrink-0" />
            <span>No email</span>
          </div>
        )}
        {phones.map((p, i) => (
          <a
            key={i}
            href={`tel:${p.number}`}
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-2 text-xs text-gray-600 hover:text-blue-600"
          >
            <Phone className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
            <span className="truncate">{p.number}</span>
            {p.label && <span className="flex-shrink-0 text-gray-400">&middot; {p.label}</span>}
          </a>
        ))}
        {contact.linkedin_url && (
          <a
            href={contact.linkedin_url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-2 text-xs text-gray-600 hover:text-blue-600"
          >
            <Linkedin className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
            <span className="truncate">LinkedIn profile</span>
          </a>
        )}
      </div>

      {/* Footer */}
      <div className="mt-3 flex items-center justify-between border-t border-gray-100 pt-2.5">
        <span className="text-[11px] text-gray-400" title={contact.created_at ? formatDate(contact.created_at) : ''}>
          {contact.created_at ? `Added ${timeAgo(contact.created_at)}` : ''}
        </span>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onDelete(contact); }}
          className="rounded-md p-1 text-gray-300 opacity-0 transition hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
          title="Delete contact"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

// ─── Quick Add Form ────────────────────────────────────────────────────────
function QuickAddForm({ onClose }) {
  const quickAdd = useQuickAddContact();
  const [form, setForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    company_name: '',
    title: '',
  });

  const set = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.first_name.trim() && !form.email.trim()) {
      toast.error('Please enter at least a first name or email');
      return;
    }
    quickAdd.mutate(form, {
      onSuccess: () => {
        setForm({ first_name: '', last_name: '', email: '', phone: '', company_name: '', title: '' });
        onClose();
      },
    });
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-blue-200 bg-blue-50/50 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-800">Quick Add Contact</h3>
        <button type="button" onClick={onClose} className="rounded-md p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <input
          type="text"
          placeholder="First name *"
          value={form.first_name}
          onChange={set('first_name')}
          className="h-9 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <input
          type="text"
          placeholder="Last name"
          value={form.last_name}
          onChange={set('last_name')}
          className="h-9 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <input
          type="email"
          placeholder="Email"
          value={form.email}
          onChange={set('email')}
          className="h-9 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <input
          type="tel"
          placeholder="Phone"
          value={form.phone}
          onChange={set('phone')}
          className="h-9 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <input
          type="text"
          placeholder="Company name"
          value={form.company_name}
          onChange={set('company_name')}
          className="h-9 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        <input
          type="text"
          placeholder="Title / Role"
          value={form.title}
          onChange={set('title')}
          className="h-9 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>
      <div className="mt-3 flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={quickAdd.isPending}
          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
        >
          <Check className="h-3.5 w-3.5" />
          {quickAdd.isPending ? 'Adding...' : 'Add Contact'}
        </button>
      </div>
    </form>
  );
}

// ─── Bulk Action Bar ───────────────────────────────────────────────────────
function BulkActionBar({ selectedIds, items, onDeselect, onDelete, onExport }) {
  if (selectedIds.length === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 z-40 w-[calc(100%-2rem)] max-w-fit -translate-x-1/2 sm:w-auto lg:left-[calc(50%+7.5rem)]">
      <div className="flex items-center gap-2 overflow-x-auto rounded-xl border border-gray-200 bg-white/95 px-4 py-3 shadow-lg backdrop-blur-sm sm:gap-3 sm:px-5">
        <span className="flex-shrink-0 text-sm font-semibold text-gray-700">
          {selectedIds.length} selected
        </span>

        <div className="h-5 w-px flex-shrink-0 bg-gray-200" />

        <button
          type="button"
          onClick={onExport}
          className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          <Download className="h-3.5 w-3.5" />
          Export
        </button>

        <button
          type="button"
          onClick={onDelete}
          className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-red-300 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete
        </button>

        <div className="h-5 w-px flex-shrink-0 bg-gray-200" />

        <button
          type="button"
          onClick={onDeselect}
          className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          <X className="h-3.5 w-3.5" />
          Deselect
        </button>
      </div>
    </div>
  );
}

// ─── Pagination ────────────────────────────────────────────────────────────
function Pagination({ page, pageSize, total, onPageChange, onPageSizeChange }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  if (total <= pageSize) return null;

  // Build a compact page-number list: 1 ... 4 5 [6] 7 8 ... 20
  const pages = [];
  const addPage = (n) => { if (!pages.includes(n) && n >= 1 && n <= totalPages) pages.push(n); };
  addPage(1);
  for (let i = Math.max(2, page - 2); i <= Math.min(totalPages - 1, page + 2); i++) addPage(i);
  addPage(totalPages);
  pages.sort((a, b) => a - b);

  const numbered = [];
  for (let i = 0; i < pages.length; i++) {
    if (i > 0 && pages[i] - pages[i - 1] > 1) numbered.push('...');
    numbered.push(pages[i]);
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-700">
          Showing <span className="font-medium">{((page - 1) * pageSize) + 1}</span> to{' '}
          <span className="font-medium">{Math.min(page * pageSize, total)}</span> of{' '}
          <span className="font-medium">{total}</span>
        </span>
        <select
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          className="h-8 rounded-md border border-gray-300 bg-white px-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          <option value={25}>25 / page</option>
          <option value={50}>50 / page</option>
          <option value={100}>100 / page</option>
        </select>
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" />
          Prev
        </button>

        {numbered.map((item, i) =>
          item === '...' ? (
            <span key={`ellipsis-${i}`} className="px-2 text-sm text-gray-400">&hellip;</span>
          ) : (
            <button
              key={item}
              type="button"
              onClick={() => onPageChange(item)}
              className={cn(
                'min-w-[2rem] rounded-md px-2.5 py-1.5 text-sm font-medium',
                item === page
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
              )}
            >
              {item}
            </button>
          )
        )}

        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="inline-flex items-center gap-1 rounded-md border border-gray-300 bg-white px-2.5 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────
export default function Contacts() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const highlightId = searchParams.get('highlight');

  // Pagination + search + sort state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('recent');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [groupByCompany, setGroupByCompany] = useState(false);
  const [detailContact, setDetailContact] = useState(null);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);

  // Debounced search: wait 300ms after the user stops typing
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  // Reset page to 1 when search/sort/filter changes
  useEffect(() => { setPage(1); }, [search, sort, sourceFilter, pageSize]);

  // Build query params for server-side pagination/search/sort
  const sortMeta = SORTS[sort] || SORTS.recent;
  const { data: contactsData, isLoading, isError } = useContacts({
    page,
    pageSize,
    search,
    sortBy: sortMeta.sortBy,
    sortDir: sortMeta.sortDir,
  });

  const deleteContact = useDeleteContact();

  const items = contactsData?.items || [];
  const total = contactsData?.total ?? items.length;

  // Client-side source filter (backend doesn't have a source filter param)
  const filtered = useMemo(() => {
    if (sourceFilter === 'all') return items;
    return items.filter((c) => /card|scan/.test((c.source || '').toLowerCase()));
  }, [items, sourceFilter]);

  // Stats computed from current page (approximate for display)
  const stats = useMemo(() => {
    const scanned = filtered.filter((c) => /card|scan/.test((c.source || '').toLowerCase())).length;
    const companies = new Set(filtered.map((c) => c.company_id).filter(Boolean)).size;
    return { total, scanned, companies };
  }, [filtered, total]);

  const grouped = useMemo(() => {
    if (!groupByCompany) return null;
    const map = new Map();
    for (const c of filtered) {
      const key = c.company || 'No company';
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(c);
    }
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered, groupByCompany]);

  const handleDelete = (contact) => {
    if (window.confirm(`Delete ${fullName(contact)}? This cannot be undone.`)) {
      deleteContact.mutate({ id: contact.id, companyId: contact.company_id });
      setSelectedIds((prev) => prev.filter((id) => id !== contact.id));
    }
  };

  // ─── Bulk actions ──────────────────────────────────────────────────────
  const handleSelect = (id, checked) => {
    setSelectedIds((prev) =>
      checked ? [...prev, id] : prev.filter((sid) => sid !== id)
    );
  };

  const handleBulkExport = () => {
    const idSet = new Set(selectedIds.map(String));
    const list = filtered.filter((c) => idSet.has(String(c.id)));
    if (list.length === 0) return;
    downloadCsv(
      'landline-contacts-selected.csv',
      CONTACT_EXPORT_COLS.map(([h]) => h),
      list.map((c) => CONTACT_EXPORT_COLS.map(([, f]) => f(c)))
    );
    toast.success(`Exported ${list.length} contacts`);
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Delete ${selectedIds.length} selected contact${selectedIds.length === 1 ? '' : 's'}? This cannot be undone.`)) return;
    const promises = selectedIds.map((id) => deleteContact.mutateAsync({ id }));
    await Promise.allSettled(promises);
    toast.success(`Deleted ${selectedIds.length} contacts`);
    setSelectedIds([]);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-1 flex items-center gap-3">
            <Users className="h-7 w-7 text-blue-600" />
            <h1 className="text-2xl font-bold text-gray-900">Contacts</h1>
          </div>
          <p className="ml-10 text-sm text-gray-500">
            Everyone you've scanned or added — searchable and organized in one place.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowQuickAdd((v) => !v)}
            className={cn(
              'inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium shadow-sm transition',
              showQuickAdd
                ? 'border-blue-300 bg-blue-50 text-blue-700'
                : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
            )}
          >
            <UserPlus className="h-4 w-4" />
            Quick Add
          </button>
          <Link
            to="/scan"
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700"
          >
            <ScanLine className="h-4 w-4" />
            Scan a Card
          </Link>
        </div>
      </div>

      {/* Quick Add Form */}
      {showQuickAdd && <QuickAddForm onClose={() => setShowQuickAdd(false)} />}

      {/* Summary metrics */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <MetricCard title="Total Contacts" value={stats.total} icon={Users} color="blue" />
        <MetricCard title="Scanned Cards" value={stats.scanned} icon={CreditCard} color="teal" />
        <MetricCard title="Companies" value={stats.companies} icon={Building2} color="indigo" />
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full sm:flex-1" style={{ minWidth: '200px', maxWidth: '420px' }}>
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, company, email, phone…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="h-10 w-full rounded-lg border border-gray-300 bg-white pl-9 pr-3 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Source filter */}
        <div className="inline-flex overflow-hidden rounded-lg border border-gray-300">
          {[
            { key: 'all', label: 'All' },
            { key: 'scanned', label: 'Scanned' },
          ].map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => setSourceFilter(opt.key)}
              className={cn(
                'px-3 py-2 text-sm font-medium transition-colors',
                sourceFilter === opt.key ? 'bg-blue-50 text-blue-700' : 'bg-white text-gray-600 hover:bg-gray-50'
              )}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Sort */}
        <div className="relative">
          <ArrowUpDown className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="h-10 appearance-none rounded-lg border border-gray-300 bg-white pl-9 pr-8 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {Object.entries(SORTS).map(([key, { label }]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>

        {/* Group by company */}
        <button
          type="button"
          onClick={() => setGroupByCompany((v) => !v)}
          className={cn(
            'inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
            groupByCompany ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
          )}
        >
          <LayoutGrid className="h-4 w-4" />
          Group by company
        </button>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
        </div>
      ) : isError ? (
        <EmptyState
          icon={Users}
          title="Failed to load contacts"
          description="There was an error loading your contacts. Please try again."
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={CreditCard}
          title={total === 0 ? 'No contacts yet' : 'No matches'}
          description={
            total === 0
              ? 'Scan a business card or import contacts to get started.'
              : 'Try a different search term or filter.'
          }
          action={total === 0 ? { label: 'Import Contacts', onClick: () => navigate('/import') } : undefined}
        />
      ) : groupByCompany ? (
        <div className="space-y-6">
          {grouped.map(([company, members]) => (
            <div key={company}>
              <div className="mb-2 flex items-center gap-2">
                <Building2 className="h-4 w-4 text-gray-400" />
                <h2 className="text-sm font-semibold text-gray-700">{company}</h2>
                <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">{members.length}</span>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {members.map((c) => (
                  <ContactCard
                    key={c.id}
                    contact={c}
                    highlighted={String(c.id) === highlightId}
                    onDelete={handleDelete}
                    onOpen={setDetailContact}
                    selected={selectedIds.includes(c.id)}
                    onSelect={handleSelect}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => (
            <ContactCard
              key={c.id}
              contact={c}
              highlighted={String(c.id) === highlightId}
              onDelete={handleDelete}
              onOpen={setDetailContact}
              selected={selectedIds.includes(c.id)}
              onSelect={handleSelect}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {!isLoading && !isError && filtered.length > 0 && (
        <Pagination
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={setPage}
          onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
        />
      )}

      {/* Bulk Action Bar */}
      <BulkActionBar
        selectedIds={selectedIds}
        items={filtered}
        onDeselect={() => setSelectedIds([])}
        onExport={handleBulkExport}
        onDelete={handleBulkDelete}
      />

      {detailContact && (
        <ContactDetailModal
          contactId={detailContact.id}
          initial={detailContact}
          onClose={() => setDetailContact(null)}
        />
      )}
    </div>
  );
}
