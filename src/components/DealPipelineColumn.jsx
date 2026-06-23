import { useState } from 'react';
import { Plus } from 'lucide-react';
import { cn, formatCurrency } from '../lib/utils';
import { DEAL_STAGE_LABELS, DEAL_STAGE_COLORS, DEAL_STAGE_PROBABILITIES } from '../lib/constants';
import DealCard from './DealCard';

export default function DealPipelineColumn({
  stage,
  deals = [],
  onCardClick,
  draggingId = null,
  onCardDragStart,
  onCardDragEnd,
  onDropDeal,
  onQuickAdd,
}) {
  const stageColor = DEAL_STAGE_COLORS[stage] || {};
  const label = DEAL_STAGE_LABELS[stage] || stage;
  const probability = DEAL_STAGE_PROBABILITIES[stage] || 0;
  const [isOver, setIsOver] = useState(false);

  const totalValue = deals.reduce((sum, d) => sum + (Number(d.value) || 0), 0);

  const draggingHere = deals.some((d) => String(d.id) === String(draggingId));
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
    if (id && canDrop) onDropDeal?.(id, stage);
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={() => setIsOver(false)}
      onDrop={handleDrop}
      className={cn(
        'flex min-w-[260px] max-w-[320px] flex-shrink-0 flex-col rounded-lg border transition-colors sm:min-w-[280px]',
        isOver && canDrop ? 'border-blue-400 ring-2 ring-blue-200' : 'border-gray-200'
      )}
      style={{ backgroundColor: stageColor.light || '#fafafa' }}
    >
      {/* Column Header */}
      <div
        className="rounded-t-lg border-b border-gray-200 bg-white px-4 py-3"
        style={{ borderTop: `4px solid ${stageColor.hex || '#6b7280'}` }}
      >
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-gray-900">{label}</h3>
            <p className="mt-0.5 text-xs text-gray-400">{probability}% probability</p>
          </div>
          <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-xs font-medium"
            style={{ backgroundColor: stageColor.hex ? `${stageColor.hex}20` : '#e5e7eb', color: stageColor.hex || '#374151' }}
          >
            {deals.length}
          </span>
        </div>
        {/* Total value in stage */}
        {deals.length > 0 && (
          <p className="mt-1 text-xs font-semibold text-gray-500">
            {formatCurrency(totalValue, { compact: true })}
          </p>
        )}
      </div>

      {/* Column Body */}
      <div className="flex-1 space-y-2 overflow-y-auto p-3" style={{ minHeight: '120px', maxHeight: 'calc(100vh - 280px)' }}>
        {deals.length > 0 ? (
          deals.map((deal) => (
            <DealCard
              key={deal.id}
              deal={deal}
              onClick={onCardClick}
              draggable
              dragging={String(deal.id) === String(draggingId)}
              onDragStart={onCardDragStart}
              onDragEnd={onCardDragEnd}
              compact
            />
          ))
        ) : (
          <div className={cn(
            'flex h-20 items-center justify-center rounded-lg border-2 border-dashed text-center transition-all',
            isOver && canDrop
              ? 'border-blue-300 bg-blue-50 text-blue-500 scale-[1.02]'
              : 'border-transparent text-gray-400'
          )}>
            <p className="px-2 text-xs leading-relaxed">
              {isOver && canDrop ? 'Drop to move here' : 'No deals in this stage.\nDrag one here or click + to add.'}
            </p>
          </div>
        )}

        {/* Quick Add */}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onQuickAdd?.(stage); }}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-gray-200 py-2 text-xs font-medium text-gray-400 transition hover:border-blue-300 hover:text-blue-500"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Deal
        </button>
      </div>
    </div>
  );
}
