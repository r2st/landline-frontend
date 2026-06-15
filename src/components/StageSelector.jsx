import { cn } from '../lib/utils';
import { STAGES, STAGE_LABELS, STAGE_COLORS } from '../lib/constants';

export default function StageSelector({ value, onChange, compact = false }) {
  const currentColor = STAGE_COLORS[value] || {};

  const handleChange = (e) => {
    if (onChange) {
      onChange(e.target.value);
    }
  };

  return (
    <select
      value={value}
      onChange={handleChange}
      className={cn(
        'cursor-pointer rounded-md border-0 font-medium text-white focus:outline-none focus:ring-2 focus:ring-offset-1',
        compact ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-sm'
      )}
      style={{
        backgroundColor: currentColor.hex || '#6b7280',
      }}
    >
      {STAGES.map((stage) => (
        <option key={stage} value={stage} className="bg-white text-gray-900">
          {STAGE_LABELS[stage] || stage}
        </option>
      ))}
    </select>
  );
}
