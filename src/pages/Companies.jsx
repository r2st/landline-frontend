import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Plus,
  Download,
  Target,
  X,
  Filter,
} from 'lucide-react';
import DataTable from '../components/DataTable';
import ScoreBadge from '../components/ScoreBadge';
import EmptyState from '../components/EmptyState';
import { useCompanies, useCreateCompany, useScoreCompany } from '../hooks/useCompanies';
import { STAGES, STAGE_LABELS, STAGE_COLORS, COUNTRIES, SOURCES, SOURCE_LABELS } from '../lib/constants';
import { formatNumber, formatDate, cn } from '../lib/utils';

function AddCompanyModal({ open, onClose, onCreate }) {
  const [form, setForm] = useState({
    name: '',
    domain: '',
    city: '',
    state: '',
    country: 'US',
    employees: '',
    industry: '',
    source: 'manual',
  });

  if (!open) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    onCreate({
      ...form,
      employees: form.employees ? Number(form.employees) : null,
    });
    setForm({ name: '', domain: '', city: '', state: '', country: 'US', employees: '', industry: '', source: 'manual' });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative flex max-h-[92vh] w-full max-w-lg flex-col overflow-y-auto rounded-t-2xl bg-white p-6 shadow-xl sm:max-h-[90vh] sm:rounded-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Add Company</h3>
          <button type="button" onClick={onClose} className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="col-span-1 sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700">Company Name *</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Acme Corporation"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Domain</label>
              <input
                type="text"
                value={form.domain}
                onChange={(e) => setForm({ ...form, domain: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="acme.com"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Industry</label>
              <input
                type="text"
                value={form.industry}
                onChange={(e) => setForm({ ...form, industry: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="Technology"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">City</label>
              <input
                type="text"
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="San Francisco"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">State</label>
              <input
                type="text"
                value={form.state}
                onChange={(e) => setForm({ ...form, state: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="CA"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Country</label>
              <select
                value={form.country}
                onChange={(e) => setForm({ ...form, country: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {COUNTRIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Employees</label>
              <input
                type="number"
                min="1"
                value={form.employees}
                onChange={(e) => setForm({ ...form, employees: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="100"
              />
            </div>
            <div className="col-span-1 sm:col-span-2">
              <label className="mb-1 block text-sm font-medium text-gray-700">Source</label>
              <select
                value={form.source}
                onChange={(e) => setForm({ ...form, source: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {SOURCES.map((s) => (
                  <option key={s} value={s}>{SOURCE_LABELS[s]}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-lg bg-blue-500 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-600"
            >
              Add Company
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Companies() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [filters, setFilters] = useState({
    stage: '',
    country: '',
    source: '',
    scoreMin: '',
    scoreMax: '',
  });

  // Server-side filters (supported by the company list endpoint).
  const serverFilters = {};
  if (search) serverFilters.search = search;
  if (filters.stage) serverFilters.stage = filters.stage;
  if (filters.country) serverFilters.country = filters.country;

  const { data: allCompanies, isLoading, isError } = useCompanies(serverFilters);
  const createCompany = useCreateCompany();
  const scoreCompany = useScoreCompany();

  // Source + score range are filtered client-side (not supported server-side).
  const companies = useMemo(() => {
    const min = filters.scoreMin !== '' ? Number(filters.scoreMin) : null;
    const max = filters.scoreMax !== '' ? Number(filters.scoreMax) : null;
    return (allCompanies || []).filter((c) => {
      if (filters.source && c.source !== filters.source) return false;
      if (min != null && (c.score ?? -1) < min) return false;
      if (max != null && (c.score ?? 101) > max) return false;
      return true;
    });
  }, [allCompanies, filters.source, filters.scoreMin, filters.scoreMax]);

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const handleExportCSV = () => {
    if (!companies || companies.length === 0) return;
    const headers = ['Name', 'Domain', 'City', 'State', 'Country', 'Employees', 'Industry', 'Score', 'Stage', 'Source', 'Created'];
    const rows = companies.map((c) => [
      c.name, c.domain, c.city, c.state, c.country, c.employees, c.industry, c.score, c.stage, c.source, c.created_at,
    ]);
    const csv = [headers, ...rows].map((r) => r.map((v) => `"${v || ''}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'landline-companies.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleScoreAll = async () => {
    if (selectedIds.length === 0) return;
    for (const id of selectedIds) {
      scoreCompany.mutate(id);
    }
    setSelectedIds([]);
  };

  const columns = [
    {
      key: 'name',
      label: 'Company',
      render: (val, row) => (
        <span className="font-medium text-blue-600 hover:text-blue-700">{row.name}</span>
      ),
    },
    { key: 'domain', label: 'Domain' },
    {
      key: 'city',
      label: 'Location',
      render: (val, row) => [row.city, row.state].filter(Boolean).join(', ') || '—',
    },
    {
      key: 'employees',
      label: 'Employees',
      render: (val) => val ? formatNumber(val) : '—',
    },
    {
      key: 'score',
      label: 'Score',
      render: (val) => val != null ? <ScoreBadge score={val} size="sm" /> : '—',
    },
    {
      key: 'stage',
      label: 'Stage',
      render: (val) => (
        <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', STAGE_COLORS[val]?.bg, STAGE_COLORS[val]?.text)}>
          {STAGE_LABELS[val] || val}
        </span>
      ),
    },
    {
      key: 'source',
      label: 'Source',
      render: (val) => SOURCE_LABELS[val] || val || '—',
    },
    {
      key: 'created_at',
      label: 'Created',
      render: (val) => val ? formatDate(val) : '—',
    },
  ];

  const hasActiveFilters = filters.stage || filters.country || filters.source || filters.scoreMin || filters.scoreMax;

  return (
    <div className="space-y-4">
      {/* Search & Actions Bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full sm:flex-1" style={{ minWidth: '200px', maxWidth: '400px' }}>
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search companies..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 w-full rounded-lg border border-gray-300 bg-white pl-9 pr-3 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <button
          type="button"
          onClick={() => setShowFilters(!showFilters)}
          className={cn(
            'inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
            showFilters || hasActiveFilters
              ? 'border-blue-300 bg-blue-50 text-blue-700'
              : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
          )}
        >
          <Filter className="h-4 w-4" />
          Filters
        </button>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {selectedIds.length > 0 && (
            <button
              type="button"
              onClick={handleScoreAll}
              className="inline-flex items-center gap-2 rounded-lg border border-yellow-300 bg-yellow-50 px-3 py-2 text-sm font-medium text-yellow-700 hover:bg-yellow-100"
            >
              <Target className="h-4 w-4" />
              Score ({selectedIds.length})
            </button>
          )}
          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Download className="h-4 w-4" />
            Export CSV
          </button>
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-500 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-600"
          >
            <Plus className="h-4 w-4" />
            Add Company
          </button>
        </div>
      </div>

      {/* Filter Row */}
      {showFilters && (
        <div className="flex flex-wrap items-end gap-3 rounded-lg border border-gray-200 bg-white p-4">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Stage</label>
            <select
              value={filters.stage}
              onChange={(e) => handleFilterChange('stage', e.target.value)}
              className="h-9 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">All Stages</option>
              {STAGES.map((s) => (
                <option key={s} value={s}>{STAGE_LABELS[s]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Country</label>
            <select
              value={filters.country}
              onChange={(e) => handleFilterChange('country', e.target.value)}
              className="h-9 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">All Countries</option>
              {COUNTRIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Source</label>
            <select
              value={filters.source}
              onChange={(e) => handleFilterChange('source', e.target.value)}
              className="h-9 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="">All Sources</option>
              {SOURCES.map((s) => (
                <option key={s} value={s}>{SOURCE_LABELS[s]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Min Score</label>
            <input
              type="number"
              min="0"
              max="100"
              placeholder="0"
              value={filters.scoreMin}
              onChange={(e) => handleFilterChange('scoreMin', e.target.value)}
              className="h-9 w-20 rounded-md border border-gray-300 px-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-500">Max Score</label>
            <input
              type="number"
              min="0"
              max="100"
              placeholder="100"
              value={filters.scoreMax}
              onChange={(e) => handleFilterChange('scoreMax', e.target.value)}
              className="h-9 w-20 rounded-md border border-gray-300 px-2 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={() => setFilters({ stage: '', country: '', source: '', scoreMin: '', scoreMax: '' })}
              className="h-9 text-sm text-gray-500 hover:text-gray-700"
            >
              Clear
            </button>
          )}
        </div>
      )}

      {/* Data Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : isError ? (
        <EmptyState
          title="Failed to load companies"
          description="There was an error loading the company list. Please try again."
        />
      ) : companies && companies.length === 0 ? (
        <EmptyState
          title="No companies found"
          description={search || hasActiveFilters ? 'Try adjusting your search or filters.' : 'Get started by adding your first company.'}
          action={!search && !hasActiveFilters ? { label: 'Add Company', onClick: () => setShowModal(true) } : undefined}
        />
      ) : (
        <DataTable
          columns={columns}
          data={companies || []}
          onRowClick={(row) => navigate(`/companies/${row.id}`)}
          selectable
          selectedIds={selectedIds}
          onSelectionChange={setSelectedIds}
          emptyMessage="No companies match your criteria"
        />
      )}

      {/* Add Company Modal */}
      <AddCompanyModal
        open={showModal}
        onClose={() => setShowModal(false)}
        onCreate={(data) => createCompany.mutate(data)}
      />
    </div>
  );
}
