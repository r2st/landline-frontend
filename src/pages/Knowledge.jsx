import { useMemo, useState } from 'react';
import {
  BookOpen,
  Search,
  Users,
  Brain,
  Lightbulb,
  Layers,
  Cpu,
  Plus,
  Pencil,
  Trash2,
  Mail,
  Phone,
  Linkedin,
  Building2,
  X,
  ExternalLink,
  Target,
  ListChecks,
} from 'lucide-react';
import EmptyState from '../components/EmptyState';
import Markdown from '../components/Markdown';
import { cn } from '../lib/utils';
import {
  useKnowledgeContacts,
  useIndustryCounts,
  useSaveKnowledgeContact,
  useDeleteKnowledgeContact,
  useKnowledgeDoc,
  useIndustries,
  useAiGuidelines,
} from '../hooks/useKnowledge';

const TABS = [
  { id: 'contacts', label: 'Contacts', icon: Users },
  { id: 'guidelines', label: 'Guidelines', icon: Brain },
  { id: 'strategy', label: 'Strategy', icon: Lightbulb },
  { id: 'industries', label: 'Industries', icon: Layers },
  { id: 'ai', label: 'AI Config', icon: Cpu },
];

function Spinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-indigo-600" />
    </div>
  );
}

// ─── Contact form modal ───────────────────────────────────────────────────────
function ContactModal({ contact, industries, onClose }) {
  const save = useSaveKnowledgeContact();
  const [form, setForm] = useState({
    name: contact?.name || '',
    title: contact?.title || '',
    company: contact?.company || '',
    industry: contact?.industry || '',
    email: contact?.email || '',
    phone: contact?.phone || '',
    linkedin_url: contact?.linkedin_url || '',
    notes: contact?.notes || '',
  });
  const set = (field) => (e) => setForm((p) => ({ ...p, [field]: e.target.value }));

  const submit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    save.mutate({ id: contact?.id, data: form }, { onSuccess: onClose });
  };

  const input = 'h-9 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        className="w-full max-w-lg rounded-xl border border-gray-200 bg-white shadow-2xl"
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3.5">
          <h2 className="text-sm font-semibold text-gray-900">{contact ? 'Edit Contact' : 'Add Industry Contact'}</h2>
          <button type="button" onClick={onClose} className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-medium text-gray-500">Name *</label>
            <input className={input} value={form.name} onChange={set('name')} placeholder="Full name" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Title</label>
            <input className={input} value={form.title} onChange={set('title')} placeholder="Role / title" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Company</label>
            <input className={input} value={form.company} onChange={set('company')} placeholder="Company" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Industry</label>
            <input className={input} value={form.industry} onChange={set('industry')} placeholder="Industry" list="knowledge-industry-list" />
            <datalist id="knowledge-industry-list">
              {industries.map((it) => (
                <option key={it.key || it.industry || it.name} value={it.key || it.industry || it.name} />
              ))}
            </datalist>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Email</label>
            <input className={input} type="email" value={form.email} onChange={set('email')} placeholder="email@company.com" />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Phone</label>
            <input className={input} value={form.phone} onChange={set('phone')} placeholder="Phone" />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-medium text-gray-500">LinkedIn</label>
            <input className={input} value={form.linkedin_url} onChange={set('linkedin_url')} placeholder="https://linkedin.com/in/…" />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1 block text-xs font-medium text-gray-500">Notes</label>
            <textarea
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              rows={3}
              value={form.notes}
              onChange={set('notes')}
              placeholder="Anything useful to remember…"
            />
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-gray-100 px-5 py-3">
          <button type="button" onClick={onClose} className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
            Cancel
          </button>
          <button type="submit" disabled={save.isPending} className="rounded-lg bg-indigo-600 px-3 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50">
            {save.isPending ? 'Saving…' : contact ? 'Save Changes' : 'Add Contact'}
          </button>
        </div>
      </form>
    </div>
  );
}

// ─── Contacts tab ─────────────────────────────────────────────────────────────
function ContactsTab() {
  const [industry, setIndustry] = useState('all');
  const [group, setGroup] = useState('all');
  const [searchInput, setSearchInput] = useState('');
  const [modal, setModal] = useState(null); // { contact } | { contact: null } for add
  const { data: counts = [] } = useIndustryCounts();
  const { data: industriesData = [] } = useIndustries();
  const { data, isLoading } = useKnowledgeContacts({
    ...(industry !== 'all' ? { industry } : {}),
    ...(group !== 'all' ? { group } : {}),
  });
  const del = useDeleteKnowledgeContact();
  const items = data?.items || [];

  const filtered = useMemo(() => {
    const q = searchInput.trim().toLowerCase();
    if (!q) return items;
    return items.filter((c) =>
      [c.name, c.company, c.title, c.email, c.industry].filter(Boolean).join(' ').toLowerCase().includes(q)
    );
  }, [items, searchInput]);

  const handleDelete = (c) => {
    if (window.confirm(`Delete ${c.name}? This cannot be undone.`)) del.mutate(c.id);
  };

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search contacts…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="h-10 w-full rounded-lg border border-gray-300 bg-white pl-9 pr-3 text-sm text-gray-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <button
          type="button"
          onClick={() => setModal({ contact: null })}
          className="ml-auto inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" />
          Add Contact
        </button>
      </div>

      {/* Genuine vs test group chips */}
      <div className="flex flex-wrap gap-2">
        {[
          { value: 'all', label: 'All', active: 'bg-indigo-600 text-white' },
          { value: 'genuine', label: 'Genuine', active: 'bg-emerald-600 text-white' },
          { value: 'test', label: 'Test', active: 'bg-amber-500 text-white' },
        ].map((g) => (
          <button
            key={g.value}
            type="button"
            onClick={() => setGroup(g.value)}
            className={cn(
              'rounded-full px-3 py-1 text-xs font-medium transition-colors',
              group === g.value ? g.active : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            )}
          >
            {g.label}
          </button>
        ))}
      </div>

      {/* Industry filter chips */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setIndustry('all')}
          className={cn(
            'rounded-full px-3 py-1 text-xs font-medium transition-colors',
            industry === 'all' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          )}
        >
          All
        </button>
        {counts.map((c) => {
          const key = c.industry || c.key || c.name;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setIndustry(key)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-colors',
                industry === key ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              )}
            >
              {key}
              {c.count != null && (
                <span className={cn('rounded-full px-1.5 text-[10px]', industry === key ? 'bg-indigo-500' : 'bg-gray-200')}>
                  {c.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Table */}
      {isLoading ? (
        <Spinner />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No contacts yet"
          description="Add an industry contact to start building your knowledge base."
          action={{ label: 'Add Contact', onClick: () => setModal({ contact: null }) }}
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Name</th>
                  <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 md:table-cell">Company</th>
                  <th className="hidden px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 lg:table-cell">Industry</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Contact</th>
                  <th className="w-20 px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((c, idx) => (
                  <tr key={c.id} className={cn('transition-colors hover:bg-indigo-50/30', idx % 2 === 1 && 'bg-gray-50/30')}>
                    <td className="px-4 py-3">
                      <div className="text-sm font-semibold text-gray-900">{c.name}</div>
                      {c.title && <div className="text-xs text-gray-500">{c.title}</div>}
                    </td>
                    <td className="hidden px-4 py-3 text-sm text-gray-700 md:table-cell">
                      {c.company ? (
                        <span className="inline-flex items-center gap-1.5">
                          <Building2 className="h-3.5 w-3.5 text-gray-400" />
                          {c.company}
                        </span>
                      ) : <span className="text-gray-300">--</span>}
                    </td>
                    <td className="hidden px-4 py-3 lg:table-cell">
                      {c.industry && (
                        <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-700 ring-1 ring-indigo-100">
                          {c.industry}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3 text-gray-400">
                        {c.email && (
                          <a href={`mailto:${c.email}`} title={c.email} className="hover:text-indigo-600"><Mail className="h-4 w-4" /></a>
                        )}
                        {c.phone && (
                          <a href={`tel:${c.phone}`} title={c.phone} className="hover:text-indigo-600"><Phone className="h-4 w-4" /></a>
                        )}
                        {c.linkedin_url && (
                          <a href={c.linkedin_url} target="_blank" rel="noopener noreferrer" className="hover:text-indigo-600"><Linkedin className="h-4 w-4" /></a>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <button type="button" onClick={() => setModal({ contact: c })} className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700" title="Edit">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button type="button" onClick={() => handleDelete(c)} className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500" title="Delete">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {modal && <ContactModal contact={modal.contact} industries={industriesData} onClose={() => setModal(null)} />}
    </div>
  );
}

// ─── Doc tab (guidelines / strategy) ──────────────────────────────────────────
function DocTab({ kind, emptyTitle }) {
  const { data, isLoading } = useKnowledgeDoc(kind);
  if (isLoading) return <Spinner />;
  const content = data?.content || data?.body || data?.markdown || (typeof data === 'string' ? data : '');
  if (!content) {
    return <EmptyState icon={kind === 'guidelines' ? Brain : Lightbulb} title={emptyTitle} description="This document hasn't been published yet." />;
  }
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
      {data?.title && <h2 className="mb-4 text-xl font-bold text-gray-900">{data.title}</h2>}
      <Markdown content={content} />
    </div>
  );
}

// ─── Industries tab ───────────────────────────────────────────────────────────
function listOf(val) {
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') return val.split(/[\n,]/).map((s) => s.trim()).filter(Boolean);
  return [];
}

function IndustriesTab() {
  const { data: industries = [], isLoading } = useIndustries();
  if (isLoading) return <Spinner />;
  if (industries.length === 0) {
    return <EmptyState icon={Layers} title="No industry verticals" description="Industry configs will appear here once defined." />;
  }
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {industries.map((ind) => {
        const name = ind.name || ind.key || ind.industry || 'Industry';
        const painPoints = listOf(ind.pain_points || ind.painPoints);
        const demoLinks = ind.demo_links || ind.demoLinks || [];
        const sequences = ind.sequences || [];
        return (
          <div key={name} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50">
                <Layers className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-gray-900">{name}</h3>
                {ind.description && <p className="text-xs text-gray-500">{ind.description}</p>}
              </div>
            </div>

            {painPoints.length > 0 && (
              <div className="mb-3">
                <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                  <Target className="h-3.5 w-3.5" /> Pain Points
                </p>
                <ul className="space-y-1">
                  {painPoints.map((p, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                      <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-indigo-400" />
                      {typeof p === 'string' ? p : p.label || p.text}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {Array.isArray(demoLinks) && demoLinks.length > 0 && (
              <div className="mb-3">
                <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400">Demo Links</p>
                <div className="flex flex-wrap gap-2">
                  {demoLinks.map((d, i) => {
                    const url = typeof d === 'string' ? d : d.url || d.href;
                    const label = typeof d === 'string' ? `Demo ${i + 1}` : d.label || d.name || `Demo ${i + 1}`;
                    return (
                      <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700 hover:bg-gray-200">
                        <ExternalLink className="h-3 w-3" /> {label}
                      </a>
                    );
                  })}
                </div>
              </div>
            )}

            {Array.isArray(sequences) && sequences.length > 0 && (
              <div>
                <p className="mb-1.5 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                  <ListChecks className="h-3.5 w-3.5" /> Sequences
                </p>
                <div className="flex flex-wrap gap-2">
                  {sequences.map((s, i) => (
                    <span key={i} className="rounded-md bg-indigo-50 px-2 py-0.5 text-xs font-medium text-indigo-700">
                      {typeof s === 'string' ? s : s.name || s.title || `Sequence ${i + 1}`}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── AI Config tab ────────────────────────────────────────────────────────────
function humanize(key) {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function AiValue({ value }) {
  if (value == null) return <span className="text-gray-300">--</span>;
  if (Array.isArray(value)) {
    return (
      <ul className="space-y-1">
        {value.map((v, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
            <span className="mt-1.5 h-1 w-1 flex-shrink-0 rounded-full bg-indigo-400" />
            {typeof v === 'object' ? <AiValue value={v} /> : String(v)}
          </li>
        ))}
      </ul>
    );
  }
  if (typeof value === 'object') {
    return (
      <div className="space-y-1.5">
        {Object.entries(value).map(([k, v]) => (
          <div key={k} className="text-sm">
            <span className="font-medium text-gray-600">{humanize(k)}: </span>
            <span className="text-gray-700">{typeof v === 'object' ? JSON.stringify(v) : String(v)}</span>
          </div>
        ))}
      </div>
    );
  }
  return <span className="text-sm text-gray-700">{String(value)}</span>;
}

function AiConfigTab() {
  const { data, isLoading } = useAiGuidelines();
  if (isLoading) return <Spinner />;
  if (!data || (typeof data === 'object' && Object.keys(data).length === 0)) {
    return <EmptyState icon={Cpu} title="No AI config" description="AI sales guidelines haven't been configured yet." />;
  }
  const entries = Object.entries(data).filter(([k]) => k !== 'id' && k !== 'created_at' && k !== 'updated_at');
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {entries.map(([key, value]) => (
        <div key={key} className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="mb-2.5 flex items-center gap-2 text-sm font-semibold text-gray-900">
            <Cpu className="h-4 w-4 text-indigo-500" />
            {humanize(key)}
          </h3>
          <AiValue value={value} />
        </div>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function Knowledge() {
  const [activeTab, setActiveTab] = useState('contacts');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="mb-1 flex items-center gap-3">
          <BookOpen className="h-7 w-7 text-indigo-600" />
          <h1 className="text-2xl font-bold text-gray-900">Knowledge Base</h1>
        </div>
        <p className="ml-10 text-sm text-gray-500">
          Industry contacts, sales guidelines, approach strategy, and AI playbook — all in one place.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-1 rounded-lg border border-gray-200 bg-white p-1 shadow-sm">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                activeTab === tab.id ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100'
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {activeTab === 'contacts' && <ContactsTab />}
      {activeTab === 'guidelines' && <DocTab kind="guidelines" emptyTitle="No guidelines published" />}
      {activeTab === 'strategy' && <DocTab kind="strategy" emptyTitle="No strategy published" />}
      {activeTab === 'industries' && <IndustriesTab />}
      {activeTab === 'ai' && <AiConfigTab />}
    </div>
  );
}
