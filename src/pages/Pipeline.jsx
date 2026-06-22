import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Filter } from 'lucide-react';
import PipelineColumn from '../components/PipelineColumn';
import { usePipeline, useTransitionStage } from '../hooks/usePipeline';
import { STAGES, COUNTRIES, SOURCES, SOURCE_LABELS } from '../lib/constants';

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
  const [draggingId, setDraggingId] = useState(null);

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
                companies={pipeline?.[stage] || []}
                onCardClick={handleCardClick}
                onTransition={handleTransition}
                draggingId={draggingId}
                onCardDragStart={(company) => setDraggingId(company.id)}
                onCardDragEnd={() => setDraggingId(null)}
                onDropCompany={handleDropCompany}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
