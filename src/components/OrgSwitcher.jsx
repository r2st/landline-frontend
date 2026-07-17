import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Check, ChevronDown, Eye, ShieldCheck } from 'lucide-react';
import { useOrganizations } from '../hooks/usePlatform';
import { usePlatform } from '../context/PlatformContext';
import { cn } from '../lib/utils';

/**
 * Platform-admin org switcher — a header dropdown that lets a platform_admin
 * "view as" any organization for debugging. Renders nothing for everyone else.
 *
 * Populated from GET /platform/organizations; picking an org mints a scoped
 * token (via the platform impersonate endpoint) so every subsequent read runs
 * as a user in that org. The current selection shows an amber pill; "Platform
 * admin" restores the god view.
 */
export default function OrgSwitcher() {
  const { isPlatformAdmin, impersonation, isImpersonating, startImpersonation, stopImpersonation } =
    usePlatform();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Only fetch the org list for platform admins, and pause while impersonating
  // (the scoped token would 403 the platform endpoint).
  const { data: orgs = [] } = useOrganizations(false, {
    enabled: isPlatformAdmin && !isImpersonating,
  });

  useEffect(() => {
    const onDocClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  if (!isPlatformAdmin) return null;

  const pick = async (org) => {
    setOpen(false);
    try {
      await startImpersonation(org);
    } catch (e) {
      const { default: toast } = await import('react-hot-toast');
      toast.error(e?.message || 'Could not view as this organization');
    }
  };

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'inline-flex items-center gap-1.5 rounded-lg border py-1.5 pl-2.5 pr-2 text-sm font-medium transition-colors',
          isImpersonating
            ? 'border-amber-300 bg-amber-50 text-amber-800'
            : 'border-gray-200 bg-gray-50 text-gray-500 hover:border-gray-300 hover:bg-gray-100'
        )}
        title="Platform: view as an organization"
      >
        {isImpersonating ? <Eye className="h-4 w-4 flex-shrink-0" /> : <ShieldCheck className="h-4 w-4 flex-shrink-0" />}
        <span className="hidden max-w-[10rem] truncate sm:inline">
          {isImpersonating ? impersonation.orgName : 'Platform'}
        </span>
        <ChevronDown className="h-3.5 w-3.5 flex-shrink-0 opacity-60" />
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-1.5 w-64 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
          <button
            type="button"
            onClick={() => {
              setOpen(false);
              if (isImpersonating) stopImpersonation();
            }}
            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50"
          >
            <ShieldCheck className="h-4 w-4 flex-shrink-0 text-indigo-500" />
            <span className="flex-1 font-medium text-gray-900">Platform admin</span>
            {!isImpersonating && <Check className="h-4 w-4 text-indigo-600" />}
          </button>

          <div className="max-h-72 overflow-y-auto border-t border-gray-100 py-1">
            <p className="px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
              View as organization
            </p>
            {orgs.length === 0 ? (
              <p className="px-3 py-2 text-sm text-gray-400">No organizations.</p>
            ) : (
              orgs.map((org) => {
                const selected = isImpersonating && impersonation.orgId === org.id;
                const disabled = !org.impersonatable_user_id;
                return (
                  <button
                    key={org.id}
                    type="button"
                    disabled={disabled}
                    onClick={() => pick(org)}
                    title={disabled ? 'No users to view as yet' : `View as ${org.name}`}
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Building2 className="h-4 w-4 flex-shrink-0 text-gray-400" />
                    <span className="flex-1 truncate text-gray-700">{org.name}</span>
                    {selected && <Check className="h-4 w-4 flex-shrink-0 text-amber-600" />}
                  </button>
                );
              })
            )}
          </div>

          <div className="border-t border-gray-100">
            <Link
              to="/platform"
              onClick={() => setOpen(false)}
              className="block px-3 py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-50"
            >
              Open Platform dashboard →
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
