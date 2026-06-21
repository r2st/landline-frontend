import { cn } from '../lib/utils';
import { STAGE_LABELS, STAGE_COLORS } from '../lib/constants';
import CompanyCard from './CompanyCard';

export default function PipelineColumn({ stage, companies = [], onCardClick, onTransition }) {
  const stageColor = STAGE_COLORS[stage] || {};
  const label = STAGE_LABELS[stage] || stage;

  return (
    <div className="flex min-w-[260px] max-w-[320px] flex-shrink-0 flex-col rounded-lg border border-gray-200 bg-gray-50 sm:min-w-[280px]">
      {/* Column Header */}
      <div
        className="rounded-t-lg border-b border-gray-200 bg-white px-4 py-3"
        style={{ borderTop: `4px solid ${stageColor.hex || '#6b7280'}` }}
      >
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900">{label}</h3>
          <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-gray-200 px-1.5 text-xs font-medium text-gray-700">
            {companies.length}
          </span>
        </div>
      </div>

      {/* Column Body */}
      <div className="flex-1 space-y-2 overflow-y-auto p-3" style={{ minHeight: '160px', maxHeight: 'calc(100vh - 200px)' }}>
        {companies.length > 0 ? (
          companies.map((company) => (
            <CompanyCard
              key={company.id}
              company={company}
              onClick={onCardClick}
              onTransition={onTransition}
              compact
            />
          ))
        ) : (
          <div className="flex h-24 items-center justify-center">
            <p className="text-sm text-gray-400">No companies</p>
          </div>
        )}
      </div>
    </div>
  );
}
