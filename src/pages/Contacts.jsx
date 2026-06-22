import { useMemo, useState } from 'react';
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
} from 'lucide-react';
import EmptyState from '../components/EmptyState';
import MetricCard from '../components/MetricCard';
import ContactDetailModal from '../components/ContactDetailModal';
import { useContacts, useDeleteContact } from '../hooks/useContacts';
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

const SORTS = {
  recent: { label: 'Recently added', fn: (a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0) },
  name: { label: 'Name (A–Z)', fn: (a, b) => fullName(a).localeCompare(fullName(b)) },
  company: { label: 'Company (A–Z)', fn: (a, b) => (a.company || '').localeCompare(b.company || '') },
};

function fullName(c) {
  return [c.first_name, c.last_name].filter(Boolean).join(' ').trim() || c.email || 'Unknown';
}

function ContactCard({ contact, highlighted, onDelete, onOpen }) {
  const meta = sourceMeta(contact.source);
  const name = fullName(contact);
  const location = [contact.city, contact.industry_segment].filter(Boolean).join(' · ');
  const phones = contactPhones(contact);

  return (
    <div
      onClick={() => onOpen(contact)}
      className={cn(
        'group relative flex cursor-pointer flex-col rounded-xl border bg-white p-4 shadow-sm transition-all hover:border-blue-300 hover:shadow-md',
        highlighted ? 'border-blue-400 ring-2 ring-blue-200' : 'border-gray-200'
      )}
    >
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
      <div className="flex items-start gap-3 pr-24">
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
            {p.label && <span className="flex-shrink-0 text-gray-400">· {p.label}</span>}
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

export default function Contacts() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const highlightId = searchParams.get('highlight');

  const { data: contacts, isLoading, isError } = useContacts();
  const deleteContact = useDeleteContact();

  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('recent');
  const [sourceFilter, setSourceFilter] = useState('all'); // 'all' | 'scanned'
  const [groupByCompany, setGroupByCompany] = useState(false);
  const [detailContact, setDetailContact] = useState(null);

  const all = contacts || [];

  const stats = useMemo(() => {
    const scanned = all.filter((c) => /card|scan/.test((c.source || '').toLowerCase())).length;
    const companies = new Set(all.map((c) => c.company_id).filter(Boolean)).size;
    return { total: all.length, scanned, companies };
  }, [all]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = all.filter((c) => {
      if (sourceFilter === 'scanned' && !/card|scan/.test((c.source || '').toLowerCase())) return false;
      if (!q) return true;
      return [c.first_name, c.last_name, c.email, c.phone, c.title, c.company]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q));
    });
    list = [...list].sort(SORTS[sort].fn);
    return list;
  }, [all, search, sort, sourceFilter]);

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
    }
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
        <Link
          to="/scan"
          className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700"
        >
          <ScanLine className="h-4 w-4" />
          Scan a Card
        </Link>
      </div>

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
            value={search}
            onChange={(e) => setSearch(e.target.value)}
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
          title={all.length === 0 ? 'No contacts yet' : 'No matches'}
          description={
            all.length === 0
              ? 'Scan a business card to add your first contact — it will show up here.'
              : 'Try a different search term or filter.'
          }
          action={all.length === 0 ? { label: 'Scan a Card', onClick: () => navigate('/scan') } : undefined}
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
                  <ContactCard key={c.id} contact={c} highlighted={String(c.id) === highlightId} onDelete={handleDelete} onOpen={setDetailContact} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => (
            <ContactCard key={c.id} contact={c} highlighted={String(c.id) === highlightId} onDelete={handleDelete} onOpen={setDetailContact} />
          ))}
        </div>
      )}

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
