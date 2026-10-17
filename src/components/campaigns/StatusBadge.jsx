import { CAMPAIGN_STATUS, PROSPECT_STATUS } from '../../lib/campaigns';
import { cn } from '../../lib/utils';

export function CampaignStatusBadge({ status, className }) {
  const meta = CAMPAIGN_STATUS[status] || { label: status || 'Unknown', className: 'bg-gray-100 text-gray-700', dot: 'bg-gray-400' };
  return (
    <span
      className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium', meta.className, className)}
      data-testid="campaign-status"
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', meta.dot, status === 'active' && 'animate-pulse')} />
      {meta.label}
    </span>
  );
}

export function ProspectStatusBadge({ status }) {
  const meta = PROSPECT_STATUS[status] || { label: status || 'Unknown', className: 'bg-gray-100 text-gray-700' };
  return (
    <span className={cn('inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium', meta.className)}>{meta.label}</span>
  );
}
