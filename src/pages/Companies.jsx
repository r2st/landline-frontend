import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Plus,
  Download,
  Target,
  X,
  Filter,
  Trash2,
  FolderPlus,
  ArrowRightLeft,
  XCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';
import DataTable from '../components/DataTable';
import ScoreBadge from '../components/ScoreBadge';
import EmptyState from '../components/EmptyState';
import { useCompanies, useCreateCompany, useScoreCompany, useDeleteCompany } from '../hooks/useCompanies';
import { useGroups, useAddGroupMembers } from '../hooks/useGroups';
import { pipelineApi, queryClient } from '../api/client';
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

function ConfirmModal({ open, onClose, onConfirm, title, message, confirmLabel = 'Confirm', confirmColor = 'red' }) {
  if (!open) return null;
  const btnColors = {
    red: 'bg-red-600 hover:bg-red-700 text-white',
    blue: 'bg-blue-500 hover:bg-blue-600 text-white',
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        <p className="mt-2 text-sm text-gray-600">{message}</p>
        <div className="mt-4 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => { onConfirm(); onClose(); }}
            className={cn('rounded-lg px-4 py-2 text-sm font-medium shadow-sm', btnColors[confirmColor] || btnColors.red)}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

function BulkActionBar({ selectedIds, onDeselect, onStageChange, onAddToGroup, onScoreAll, onDelete, groups }) {
  const [stageDropdown, setStageDropdown] = useState(false);
  const [groupDropdown, setGroupDropdown] = useState(false);

  if (selectedIds.length === 0) return null;

  return (
    <div className="fixed bottom-6 left-1/2 z-40 -translate-x-1/2 lg:left-[calc(50%+7.5rem)]">
      <div className="flex items-center gap-3 rounded-xl border border-gray-200 bg-white/95 px-5 py-3 shadow-lg backdrop-blur-sm">
        <span className="text-sm font-semibold text-gray-700">
          {selectedIds.length} selected
        </span>

        <div className="h-5 w-px bg-gray-200" />

        {/* Change Stage Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => { setStageDropdown(!stageDropdown); setGroupDropdown(false); }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <ArrowRightLeft className="h-3.5 w-3.5" />
            Change Stage
          </button>
          {stageDropdown && (
            <div className="absolute bottom-full left-0 mb-2 w-44 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
              {STAGES.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => { onStageChange(s); setStageDropdown(false); }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <span className={cn('h-2 w-2 rounded-full', STAGE_COLORS[s]?.bg)} />
                  {STAGE_LABELS[s]}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Add to Group Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => { setGroupDropdown(!groupDropdown); setStageDropdown(false); }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <FolderPlus className="h-3.5 w-3.5" />
            Add to Group
          </button>
          {groupDropdown && (
            <div className="absolute bottom-full left-0 mb-2 w-52 rounded-lg border border-gray-200 bg-white py-1 shadow-lg">
              {(groups || []).length === 0 ? (
                <p className="px-3 py-2 text-sm text-gray-400">No groups yet</p>
              ) : (
                (groups || []).map((g) => (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => { onAddToGroup(g.id); setGroupDropdown(false); }}
                    className="flex w-full items-center px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    {g.name}
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Score All */}
        <button
          type="button"
          onClick={onScoreAll}
          className="inline-flex items-center gap-1.5 rounded-lg border border-yellow-300 bg-yellow-50 px-3 py-1.5 text-sm font-medium text-yellow-700 hover:bg-yellow-100"
        >
          <Target className="h-3.5 w-3.5" />
          Score All
        </button>

        {/* Delete */}
        <button
          type="button"
          onClick={onDelete}
          className="inline-flex items-center gap-1.5 rounded-lg border border-red-300 bg-red-50 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete
        </button>

        <div className="h-5 w-px bg-gray-200" />

        {/* Deselect All */}
        <button
          type="button"
          onClick={onDeselect}
          className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm font-medium text-gray-500 hover:text-gray-700"
        >
          <XCircle className="h-3.5 w-3.5" />
          Deselect
        </button>
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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [bulkOperating, setBulkOperating] = useState(false);
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
  const deleteCompany = useDeleteCompany();
  const { data: groups } = useGroups();
  const addGroupMembers = useAddGroupMembers();

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
    const escapeCsvValue = (val) => {
      const str = val == null ? '' : String(val);
      // Escape internal double quotes by doubling them, then wrap in quotes
      return `"${str.replace(/"/g, '""')}"`;
    };
    const csv = [headers, ...rows].map((r) => r.map(escapeCsvValue).join(',')).join('\n');
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
    setBulkOperating(true);
    for (const id of selectedIds) {
      scoreCompany.mutate(id);
    }
    toast.success(`Scoring ${selectedIds.length} companies...`);
    setSelectedIds([]);
    setBulkOperating(false);
  };

  const handleBulkStageChange = async (stage) => {
    if (selectedIds.length === 0) return;
    setBulkOperating(true);
    try {
      const promises = selectedIds.map((id) =>
        pipelineApi.transitionStage(id, stage)
      );
      await Promise.allSettled(promises);
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      queryClient.invalidateQueries({ queryKey: ['pipeline'] });
      toast.success(`Updated ${selectedIds.length} companies to ${STAGE_LABELS[stage]}`);
      setSelectedIds([]);
    } catch (err) {
      toast.error('Some stage updates failed');
    } finally {
      setBulkOperating(false);
    }
  };

  const handleBulkAddToGroup = async (groupId) => {
    if (selectedIds.length === 0) return;
    setBulkOperating(true);
    try {
      await addGroupMembers.mutateAsync({ groupId, companyIds: selectedIds });
      setSelectedIds([]);
    } catch {
      // error handled by mutation
    } finally {
      setBulkOperating(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    setBulkOperating(true);
    try {
      const promises = selectedIds.map((id) => deleteCompany.mutateAsync(id));
      await Promise.allSettled(promises);
      toast.success(`Deleted ${selectedIds.length} companies`);
      setSelectedIds([]);
    } catch {
      toast.error('Some deletions failed');
    } finally {
      setBulkOperating(false);
    }
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

      {/* Bulk Action Bar */}
      <BulkActionBar
        selectedIds={selectedIds}
        onDeselect={() => setSelectedIds([])}
        onStageChange={handleBulkStageChange}
        onAddToGroup={handleBulkAddToGroup}
        onScoreAll={handleScoreAll}
        onDelete={() => setShowDeleteConfirm(true)}
        groups={groups}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={handleBulkDelete}
        title="Delete Companies"
        message={`Are you sure you want to delete ${selectedIds.length} selected ${selectedIds.length === 1 ? 'company' : 'companies'}? This action cannot be undone.`}
        confirmLabel="Delete"
        confirmColor="red"
      />
    </div>
  );
}
