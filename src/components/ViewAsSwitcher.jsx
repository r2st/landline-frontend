import React from 'react';
import { Eye } from 'lucide-react';
import { useViewAs } from '../context/ViewAsContext';
import { ROLES, ROLE_LABEL, normalizeRole } from '../lib/roles';

/**
 * Admin/manager "View as" switcher. Lets a privileged user scope every
 * user-owned view (inbox, tasks, calls, follow-ups, interactions, …) to their
 * own data (default), a specific teammate, or all users. Renders nothing for
 * regular users.
 */
export default function ViewAsSwitcher() {
  const { isPrivileged, viewAs, setViewAs, members } = useViewAs();

  if (!isPrivileged) return null;

  const impersonating = viewAs !== null;

  return (
    <label
      className={
        'inline-flex items-center gap-1.5 rounded-lg border py-1.5 pl-2.5 pr-1.5 text-sm transition-colors ' +
        (impersonating
          ? 'border-amber-300 bg-amber-50 text-amber-800'
          : 'border-gray-200 bg-gray-50 text-gray-500 hover:border-gray-300 hover:bg-gray-100')
      }
      title="View another user's data (admins & managers)"
    >
      <Eye className="h-4 w-4 flex-shrink-0" />
      <span className="hidden sm:inline text-[13px] font-medium">View as</span>
      <select
        aria-label="View data as"
        value={viewAs ?? ''}
        onChange={(e) => setViewAs(e.target.value || null)}
        className="max-w-[9rem] cursor-pointer truncate border-0 bg-transparent py-0 pl-1 pr-5 text-[13px] font-medium focus:outline-none focus:ring-0"
      >
        <option value="">My data</option>
        <option value="all">All users</option>
        {members.length > 0 && <option disabled>──────────</option>}
        {members.map((m) => {
          const role = normalizeRole(m.role);
          // Only annotate elevated roles; a plain agent needs no suffix.
          const suffix = role && role !== ROLES.ORG_AGENT ? ` (${ROLE_LABEL[role] || role})` : '';
          return (
            <option key={m.id} value={m.id}>
              {(m.name || m.email) + suffix}
            </option>
          );
        })}
      </select>
    </label>
  );
}
