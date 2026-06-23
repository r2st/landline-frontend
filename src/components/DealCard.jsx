import { GripVertical, DollarSign, Clock, Building2 } from 'lucide-react';
import { cn, formatCurrency } from '../lib/utils';

function daysSince(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  if (isNaN(d)) return null;
  const ms = new Date().setHours(0, 0, 0, 0) - d.setHours(0, 0, 0, 0);
  return Math.max(0, Math.round(ms / (1000 * 60 * 60 * 24)));
}

export default function DealCard({ deal, onClick, draggable = false, dragging = false, onDragStart, onDragEnd, compact = false }) {
  const days = daysSince(deal.created_at);
  const daysColor = days == null ? 'text-gray-400 bg-gray-100' :
    days < 7 ? 'text-green-700 bg-green-50' :
    days < 14 ? 'text-amber-700 bg-amber-50' : 'text-red-700 bg-red-50';

  return (
    <div
      onClick={() => onClick?.(deal)}
      draggable={draggable}
      onDragStart={draggable ? (e) => {
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', String(deal.id));
        onDragStart?.(deal);
      } : undefined}
      onDragEnd={draggable ? () => onDragEnd?.() : undefined}
      className={cn(
        'group relative rounded-lg border bg-white shadow-sm transition-all duration-200',
        'hover:shadow-md hover:-translate-y-0.5 hover:border-blue-200',
        onClick && 'cursor-pointer',
        draggable && 'cursor-grab active:cursor-grabbing',
        dragging && 'opacity-40 scale-95',
        compact ? 'p-3' : 'p-4',
        'border-gray-200'
      )}
    >
      {/* Drag handle */}
      {draggable && (
        <GripVertical className="absolute right-2 top-2 h-4 w-4 text-gray-200 opacity-0 transition group-hover:opacity-100" aria-hidden="true" />
      )}

      {/* Company name (bold) */}
      <p className="text-sm font-bold text-gray-900 truncate pr-6">
        {deal.title}
      </p>

      {/* Deal value */}
      <p className="mt-1.5 text-lg font-semibold text-gray-900">
        {formatCurrency(deal.value)}
      </p>

      {/* Bottom row: contact + days in stage */}
      <div className="mt-2 flex items-center justify-between gap-2">
        {deal.company_name ? (
          <div className="flex items-center gap-1 text-xs text-gray-500 truncate">
            <Building2 className="h-3 w-3 flex-shrink-0" />
            <span className="truncate">{deal.company_name}</span>
          </div>
        ) : (
          <div />
        )}

        {days != null && (
          <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap', daysColor)}>
            <Clock className="h-3 w-3" />
            {days}d
          </span>
        )}
      </div>
    </div>
  );
}
