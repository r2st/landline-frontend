import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Filter, Search, Plus, X } from 'lucide-react';
import PipelineColumn from '../components/PipelineColumn';
import { usePipeline, useTransitionStage } from '../hooks/usePipeline';
import { useCreateCompany } from '../hooks/useCompanies';
import { STAGES, STAGE_LABELS, COUNTRIES, SOURCES, SOURCE_LABELS } from '../lib/constants';

function SkeletonColumn() {
  return (
    <div className="flex min-w-[280px] max-w-[320px] flex-shrink-0 animate-pulse flex-col rounded-lg border border-gray-200 bg-gray-50">
      <div className="rounded-t-lg border-b border-gray-200 bg-white px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="h-4 w-20 rounded bg-gray-200" />
          <div className="h-5 w-5 rounded-full bg-gray-200" />
        </div>
      </div>
      <div className="space-y-2 p-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-28 rounded-lg bg-gray-200" />
        ))}
      </div>
    </div>
  );
}

export default function Pipeline() {
  const navigate = useNavigate();
  const [filters, setFilters] = useState({
    country: '',
    source: '',
    scoreMin: '',
    scoreMax: '',
  });
  const [showFilters, setShowFilters] = useState(false);

  const activeFilters = {};
  if (filters.country) activeFilters.country = filters.country;
  if (filters.source) activeFilters.source = filters.source;
  if (filters.scoreMin) activeFilters.scoreMin = filters.scoreMin;
  if (filters.scoreMax) activeFilters.scoreMax = filters.scoreMax;

  const { data: pipeline, isLoading } = usePipeline(activeFilters);
  const transitionMutation = useTransitionStage();
  const createCompanyMutation = useCreateCompany();
  const [draggingId, setDraggingId] = useState(null);
  const [pipelineSearch, setPipelineSearch] = useState('');
  const [quickAddStage, setQuickAddStage] = useState(null);
  const [quickAddName, setQuickAddName] = useState('');
  const [quickAddDomain, setQuickAddDomain] = useState('');

  // Filter pipeline by search
  const filteredPipeline = useMemo(() => {
    if (!pipeline || !pipelineSearch.trim()) return pipeline;
    const q = pipelineSearch.trim().toLowerCase();
    const filtered = {};
    for (const [stage, companies] of Object.entries(pipeline)) {
      filtered[stage] = companies.filter(c =>
        (c.name || '').toLowerCase().includes(q) ||
        (c.domain || '').toLowerCase().includes(q)
      );
    }
    return filtered;
  }, [pipeline, pipelineSearch]);

  // Metrics from pipeline data
  const totalCompanies = useMemo(() => {
    if (!pipeline) return 0;
    return Object.values(pipeline).reduce((sum, list) => sum + list.length, 0);
  }, [pipeline]);

  const activeStages = useMemo(() => {
    if (!pipeline) return 0;
    return Object.values(pipeline).filter((list) => list.length > 0).length;
  }, [pipeline]);

  const handleCardClick = (company) => {
    navigate(`/companies/${company.id}`);
  };

  const handleTransition = (id, stage) => {
    transitionMutation.mutate({ id, stage });
  };

  const handleDropCompany = (id, stage) => {
    setDraggingId(null);
    transitionMutation.mutate({ id, stage });
  };

  const handleQuickAdd = async (e) => {
    e.preventDefault();
    if (!quickAddName.trim()) return;
    try {
      await createCompanyMutation.mutateAsync({
        name: quickAddName.trim(),
        domain: quickAddDomain.trim() || undefined,
        stage: quickAddStage,
        source: 'manual',
      });
      setQuickAddStage(null);
      setQuickAddName('');
      setQuickAddDomain('');
    } catch {
      // Error toast is handled by useCreateCompany hook
    }
  };

  const handleFilterChange = (field, value) => {
    setFilters((prev) => ({ ...prev, [field]: value }));
  };

  const hasActiveFilters = Object.values(activeFilters).some(Boolean);

  const clearFilters = () => {
    setFilters({ country: '', source: '', scoreMin: '', scoreMax: '' });
  };

  return (
    <div className="flex h-full flex-col">
      {/* Top Bar */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setShowFilters(!showFilters)}
          className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
            showFilters || hasActiveFilters
              ? 'border-blue-300 bg-blue-50 text-blue-700'
              : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
          }`}
        >
          <Filter className="h-4 w-4" />
          Filters
          {hasActiveFilters && (
            <span className="ml-1 inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-blue-600 px-1.5 text-xs font-bold text-white">
              {Object.values(activeFilters).filter(Boolean).length}
            </span>
          )}
        </button>

        {hasActiveFilters && (
          <button
            type="button"
            onClick={clearFilters}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Clear all
          </button>
        )}

        {/* Pipeline Search */}
        <div className="relative" style={{ minWidth: '200px', maxWidth: '300px' }}>
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search pipeline..."
            value={pipelineSearch}
            onChange={(e) => setPipelineSearch(e.target.value)}
            className="h-9 w-full rounded-lg border border-gray-300 bg-white pl-9 pr-3 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <span className="ml-auto hidden text-xs text-gray-400 sm:inline">
          Drag cards between stages, or use the dropdown on each card
        </span>
      </div>

      {/* Filter Row */}
      {showFilters && (
        <div className="mb-4 flex flex-wrap items-end gap-3 rounded-lg border border-gray-200 bg-white p-4">
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
        </div>
      )}

      {/* Metrics Bar */}
      {!isLoading && pipeline && (
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-lg border border-gray-200 bg-white p-3">
            <p className="text-xs font-medium text-gray-500">Total Pipeline</p>
            <p className="text-lg font-bold text-gray-900">{totalCompanies}</p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-3">
            <p className="text-xs font-medium text-gray-500">Active Stages</p>
            <p className="text-lg font-bold text-gray-900">{activeStages}</p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-3">
            <p className="text-xs font-medium text-gray-500">Qualified</p>
            <p className="text-lg font-bold text-green-600">{pipeline?.qualified?.length || 0}</p>
          </div>
          <div className="rounded-lg border border-gray-200 bg-white p-3">
            <p className="text-xs font-medium text-gray-500">Opportunities</p>
            <p className="text-lg font-bold text-emerald-600">{pipeline?.opportunity?.length || 0}</p>
          </div>
        </div>
      )}

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto pb-4">
        <div className="inline-flex gap-4" style={{ minWidth: 'max-content' }}>
          {isLoading ? (
            STAGES.map((stage) => <SkeletonColumn key={stage} />)
          ) : (
            STAGES.map((stage) => (
              <PipelineColumn
                key={stage}
                stage={stage}
                companies={filteredPipeline?.[stage] || []}
                onCardClick={handleCardClick}
                onTransition={handleTransition}
                draggingId={draggingId}
                onCardDragStart={(company) => setDraggingId(company.id)}
                onCardDragEnd={() => setDraggingId(null)}
                onDropCompany={handleDropCompany}
                onQuickAdd={(s) => setQuickAddStage(s)}
              />
            ))
          )}
        </div>
      </div>

      {/* Quick-Add Company Modal */}
      {quickAddStage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/50" onClick={() => setQuickAddStage(null)} />
          <div className="relative w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900">
                Add to {STAGE_LABELS[quickAddStage]}
              </h3>
              <button
                type="button"
                onClick={() => setQuickAddStage(null)}
                className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleQuickAdd} className="mt-4 space-y-3">
              <input
                type="text"
                required
                placeholder="Company name"
                value={quickAddName}
                onChange={(e) => setQuickAddName(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                autoFocus
              />
              <input
                type="text"
                placeholder="Domain (optional)"
                value={quickAddDomain}
                onChange={(e) => setQuickAddDomain(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setQuickAddStage(null)}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createCompanyMutation.isPending}
                  className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-600 disabled:opacity-50"
                >
                  {createCompanyMutation.isPending ? 'Adding...' : 'Add'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
