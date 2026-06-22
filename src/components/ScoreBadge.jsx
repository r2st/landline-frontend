import { cn } from '../lib/utils';
import { getScoreColor, getScoreLabel } from '../lib/utils';

const sizeClasses = {
  sm: 'text-xs px-2 py-0.5',
  md: 'text-sm px-2.5 py-1',
  lg: 'text-base px-3 py-1.5',
};

function getScorePalette(score) {
  if (score >= 81) return { bg: 'bg-green-100', text: 'text-green-700', ring: 'ring-green-600/20' };
  if (score >= 61) return { bg: 'bg-blue-100', text: 'text-blue-700', ring: 'ring-blue-600/20' };
  if (score >= 31) return { bg: 'bg-yellow-100', text: 'text-yellow-700', ring: 'ring-yellow-600/20' };
  return { bg: 'bg-red-100', text: 'text-red-700', ring: 'ring-red-600/20' };
}

export default function ScoreBadge({ score, size = 'md' }) {
  const palette = getScorePalette(score);
  const showLabel = size === 'md' || size === 'lg';

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full font-semibold ring-1 ring-inset',
        sizeClasses[size],
        palette.bg,
        palette.text,
        palette.ring
      )}
    >
      {score}
      {showLabel && (
        <span className="font-medium opacity-80">
          {getScoreLabel(score)}
        </span>
      )}
    </span>
  );
}
