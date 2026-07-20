import React from 'react';
import { Eye, X } from 'lucide-react';
import { usePlatform } from '../context/PlatformContext';

/**
 * Sticky banner shown while a platform admin is "viewing as" an organization.
 * Makes the impersonated context impossible to miss and offers a one-click exit
 * back to the platform (god) view. Renders nothing when not impersonating.
 */
export default function ImpersonationBanner() {
  const { isImpersonating, impersonation, stopImpersonation } = usePlatform();

  if (!isImpersonating) return null;

  return (
    <div
      role="status"
      className="flex items-center gap-3 border-b border-amber-300 bg-amber-100 px-4 py-2 text-sm text-amber-900 lg:px-8"
    >
      <Eye className="h-4 w-4 flex-shrink-0" />
      <span className="min-w-0 flex-1 truncate">
        Viewing as: <span className="font-semibold">{impersonation.orgName}</span>
        {impersonation.userEmail && (
          <span className="hidden text-amber-700 sm:inline"> · {impersonation.userEmail}</span>
        )}
      </span>
      <button
        type="button"
        onClick={stopImpersonation}
        className="inline-flex flex-shrink-0 items-center gap-1 rounded-md border border-amber-400 bg-white/60 px-2.5 py-1 text-xs font-medium text-amber-900 transition-colors hover:bg-white"
      >
        <X className="h-3.5 w-3.5" />
        Exit
      </button>
    </div>
  );
}
