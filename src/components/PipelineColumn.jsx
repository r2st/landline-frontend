import { useState } from 'react';
import { cn } from '../lib/utils';
import { STAGE_LABELS, STAGE_COLORS } from '../lib/constants';
import CompanyCard from './CompanyCard';

export default function PipelineColumn({
  stage,
  companies = [],
  onCardClick,
  onTransition,
  draggingId = null,
  onCardDragStart,
  onCardDragEnd,
  onDropCompany,
}) {
  const stageColor = STAGE_COLORS[stage] || {};
  const label = STAGE_LABELS[stage] || stage;
  const [isOver, setIsOver] = useState(false);

  // Whether the currently-dragged card already lives in this column (no-op drop).
  const draggingHere = companies.some((c) => String(c.id) === String(draggingId));
  const canDrop = draggingId != null && !draggingHere;

  const handleDragOver = (e) => {
    if (draggingId == null) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (canDrop && !isOver) setIsOver(true);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsOver(false);
    const id = e.dataTransfer.getData('text/plain') || draggingId;
    if (id && canDrop) onDropCompany?.(id, stage);
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={() => setIsOver(false)}
      onDrop={handleDrop}
      className={cn(
        'flex min-w-[260px] max-w-[320px] flex-shrink-0 flex-col rounded-lg border bg-gray-50 transition-colors sm:min-w-[280px]',
        isOver && canDrop ? 'border-blue-400 bg-blue-50/60 ring-2 ring-blue-200' : 'border-gray-200'
      )}
    >
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
              draggable
              dragging={String(company.id) === String(draggingId)}
              onDragStart={onCardDragStart}
              onDragEnd={onCardDragEnd}
              compact
            />
          ))
        ) : (
          <div className={cn(
            'flex h-24 items-center justify-center rounded-lg border-2 border-dashed',
            isOver && canDrop ? 'border-blue-300 text-blue-500' : 'border-transparent text-gray-400'
          )}>
            <p className="text-sm">{isOver && canDrop ? 'Drop here' : 'No companies'}</p>
          </div>
        )}
      </div>
    </div>
  );
}
