import React from 'react';
import { Link } from 'react-router-dom';
import { Building2, Layers } from 'lucide-react';

/**
 * Empty state shown on the org self-service pages (Organization / Team / Usage)
 * when a **platform admin** views them without an org in context.
 *
 * A platform_admin has no organization of their own (`org_id` is NULL), so the
 * `/org/*` endpoints intentionally 400 for them. Rather than surface that as a
 * scary "Could not load…" error, we tell them to pick an org — either via the
 * org switcher in the top bar or from the Platform dashboard — which puts them
 * in an org's scope (impersonation) so these pages resolve normally.
 */
export default function PlatformOrgPrompt({ noun = 'organization settings' }) {
  return (
    <div className="mx-auto max-w-lg py-20 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
        <Building2 className="h-6 w-6" />
      </div>
      <h2 className="mt-4 text-lg font-semibold text-gray-900">No organization selected</h2>
      <p className="mt-2 text-sm text-gray-500">
        You're signed in as a platform admin, which isn't tied to any single organization.
        To view {noun}, pick an organization from the switcher in the top bar, or open the
        Platform dashboard to manage organizations.
      </p>
      <Link
        to="/platform"
        className="mt-6 inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
      >
        <Layers className="h-4 w-4" /> Go to Platform dashboard
      </Link>
    </div>
  );
}
