import { Users, Globe, MapPin } from 'lucide-react';
import { cn } from '../lib/utils';
import { SOURCE_LABELS } from '../lib/constants';
import ScoreBadge from './ScoreBadge';
import StageSelector from './StageSelector';

export default function CompanyCard({ company, onClick, onTransition, compact = false }) {
  const handleCardClick = () => {
    if (onClick) onClick(company);
  };

  const handleStageChange = (newStage) => {
    if (onTransition) onTransition(company.id, newStage);
  };

  const handleSelectorClick = (e) => {
    e.stopPropagation();
  };

  return (
    <div
      onClick={handleCardClick}
      className={cn(
        'cursor-pointer rounded-lg border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md',
        compact ? 'p-3' : 'p-4'
      )}
    >
      {/* Header: Name + Score */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h4 className={cn('truncate font-medium text-gray-900', compact ? 'text-sm' : 'text-base')}>
            {company.name}
          </h4>
          {company.domain && (
            <div className="mt-0.5 flex items-center gap-1">
              <Globe className="h-3 w-3 flex-shrink-0 text-gray-400" />
              <span className="truncate text-sm text-gray-500">{company.domain}</span>
            </div>
          )}
        </div>
        {company.score != null && (
          <ScoreBadge score={company.score} size={compact ? 'sm' : 'md'} />
        )}
      </div>

      {/* Details */}
      <div className={cn('flex flex-wrap items-center gap-x-3 gap-y-1', compact ? 'mt-2' : 'mt-3')}>
        {(company.city || company.state) && (
          <div className="flex items-center gap-1 text-sm text-gray-500">
            <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
            <span className="truncate">
              {[company.city, company.state].filter(Boolean).join(', ')}
            </span>
          </div>
        )}

        {company.contact_count !== undefined && (
          <div className="flex items-center gap-1 text-sm text-gray-500">
            <Users className="h-3.5 w-3.5 flex-shrink-0" />
            <span>{company.contact_count}</span>
          </div>
        )}

        {company.source && (
          <span className="inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
            {SOURCE_LABELS[company.source] || company.source}
          </span>
        )}
      </div>

      {/* Stage Selector */}
      {onTransition && (
        <div className={cn('border-t border-gray-100', compact ? 'mt-2 pt-2' : 'mt-3 pt-3')} onClick={handleSelectorClick}>
          <StageSelector
            value={company.stage}
            onChange={handleStageChange}
            compact
          />
        </div>
      )}
    </div>
  );
}
