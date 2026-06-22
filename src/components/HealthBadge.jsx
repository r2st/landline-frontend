import { cn } from '../lib/utils';
import { HEALTH_COLORS, HEALTH_LABELS, healthStatusFromScore } from '../lib/constants';

const sizeClasses = {
  sm: 'text-xs px-2 py-0.5 gap-1',
  md: 'text-sm px-2.5 py-1 gap-1.5',
};

// RAG health pill. Pass a `status` (green/yellow/red) or a 0-100 `score`.
export default function HealthBadge({ status, score, size = 'md', showScore = false }) {
  const resolved = status || healthStatusFromScore(score);
  if (!resolved) {
    return (
      <span className={cn('inline-flex items-center rounded-full bg-gray-100 font-medium text-gray-500', sizeClasses[size])}>
        No data
      </span>
    );
  }
  const palette = HEALTH_COLORS[resolved] || HEALTH_COLORS.yellow;
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-semibold ring-1 ring-inset',
        sizeClasses[size],
        palette.bg,
        palette.text,
        palette.ring
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', palette.dot)} />
      {HEALTH_LABELS[resolved]}
      {showScore && score != null && <span className="font-medium opacity-80">· {score}</span>}
    </span>
  );
}
