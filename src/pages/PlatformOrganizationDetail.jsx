import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft, Building2, Loader2, Save, Eye, Power, Users, MailCheck, Sparkles,
  CheckCircle2, XCircle,
} from 'lucide-react';
import {
  useOrganization, useUpdateOrganization, useDeactivateOrganization,
} from '../hooks/usePlatform';
import { usePlatform } from '../context/PlatformContext';
import { cn } from '../lib/utils';

/**
 * Platform Admin — organization detail (SaaS multi-tenancy, Phase 2).
 *
 * Edit an org's name / slug / plan / config (as JSON) and toggle active state,
 * see its user roster and usage stats, and jump into "view as" for debugging.
 * platform_admin only (gated at the route).
 */

const BILLING_PLANS = ['free', 'starter', 'growth', 'pro', 'enterprise'];

const ROLE_LABEL = {
  platform_admin: 'Platform Admin',
  org_admin: 'Org Admin',
  org_manager: 'Org Manager',
  org_agent: 'Agent',
};

function Stat({ icon: Icon, label, value }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <Icon className="h-4 w-4 text-indigo-500" />
        {label}
      </div>
      <p className="mt-1 text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

export default function PlatformOrganizationDetail() {
  const { id } = useParams();
  const { data: org, isLoading, isError } = useOrganization(id);
  const update = useUpdateOrganization(id);
  const deactivate = useDeactivateOrganization();
  const { startImpersonation, isPlatformAdmin } = usePlatform();

  const [form, setForm] = useState(null);
  const [configText, setConfigText] = useState('{}');
  const [configError, setConfigError] = useState(null);

  // Seed the editable form once the org loads (and after a save refresh).
  useEffect(() => {
    if (org) {
      setForm({
        name: org.name,
        slug: org.slug,
        billing_plan: org.billing_plan,
        industry: org.industry || '',
        is_active: org.is_active,
      });
      setConfigText(JSON.stringify(org.config || {}, null, 2));
      setConfigError(null);
    }
  }, [org]);

  if (isLoading || !form) {
    return (
      <div className="flex items-center justify-center py-24 text-gray-400">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (isError || !org) {
    return (
      <div className="space-y-4">
        <BackLink />
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">
          Couldn't load this organization.
        </div>
      </div>
    );
  }

  const save = () => {
    let config;
    try {
      config = configText.trim() ? JSON.parse(configText) : {};
    } catch {
      setConfigError('Config must be valid JSON.');
      return;
    }
    setConfigError(null);
    update.mutate({
      name: form.name,
      slug: form.slug,
      billing_plan: form.billing_plan,
      industry: form.industry || null,
      is_active: form.is_active,
      config,
    });
  };

  const toggleActive = () => {
    if (form.is_active) {
      deactivate.mutate(org.id);
    } else {
      update.mutate({ is_active: true });
    }
  };

  const viewAs = async () => {
    try {
      await startImpersonation(org);
    } catch (e) {
      import('react-hot-toast').then(({ default: toast }) =>
        toast.error(e?.message || 'Could not view as this organization')
      );
    }
  };

  return (
    <div className="space-y-6">
      <BackLink />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-gray-900">
            <Building2 className="h-6 w-6 text-indigo-500" />
            {org.name}
          </h1>
          <div className="mt-1 flex items-center gap-2 text-sm text-gray-500">
            <span>{org.slug}</span>
            {org.is_active ? (
              <span className="inline-flex items-center gap-1 text-green-600"><CheckCircle2 className="h-3.5 w-3.5" /> Active</span>
            ) : (
              <span className="inline-flex items-center gap-1 text-gray-400"><XCircle className="h-3.5 w-3.5" /> Inactive</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isPlatformAdmin && (
            <button
              type="button"
              onClick={viewAs}
              disabled={!org.impersonatable_user_id}
              title={org.impersonatable_user_id ? 'View as this org' : 'No users to view as yet'}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Eye className="h-4 w-4" /> View as
            </button>
          )}
          <button
            type="button"
            onClick={toggleActive}
            disabled={deactivate.isPending || update.isPending}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium disabled:opacity-50',
              form.is_active
                ? 'border border-red-200 bg-white text-red-600 hover:bg-red-50'
                : 'border border-green-200 bg-white text-green-700 hover:bg-green-50'
            )}
          >
            <Power className="h-4 w-4" />
            {form.is_active ? 'Deactivate' : 'Reactivate'}
          </button>
        </div>
      </div>

      {/* Usage stats */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat icon={Users} label="Users" value={org.usage?.user_count ?? 0} />
        <Stat icon={MailCheck} label="Emails sent" value={(org.usage?.emails_sent ?? 0).toLocaleString()} />
        <Stat icon={Sparkles} label="AI calls" value={(org.usage?.ai_calls ?? 0).toLocaleString()} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Edit form */}
        <div className="space-y-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm lg:col-span-2">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-gray-500">Settings</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name">
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </Field>
            <Field label="Slug">
              <input
                type="text"
                value={form.slug}
                onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </Field>
            <Field label="Billing plan">
              <select
                value={form.billing_plan}
                onChange={(e) => setForm((f) => ({ ...f, billing_plan: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500 capitalize"
              >
                {BILLING_PLANS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </Field>
            <Field label="Industry">
              <input
                type="text"
                value={form.industry}
                onChange={(e) => setForm((f) => ({ ...f, industry: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                placeholder="—"
              />
            </Field>
          </div>
          <Field label="Config (JSON)">
            <textarea
              value={configText}
              onChange={(e) => setConfigText(e.target.value)}
              rows={8}
              spellCheck={false}
              className={cn('mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500 font-mono text-xs', configError && 'border-red-400')}
            />
            {configError && <p className="mt-1 text-xs text-red-600">{configError}</p>}
          </Field>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={save}
              disabled={update.isPending}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {update.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save changes
            </button>
          </div>
        </div>

        {/* Users */}
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-gray-500">
            Users ({org.users?.length ?? 0})
          </h2>
          {(!org.users || org.users.length === 0) ? (
            <p className="text-sm text-gray-400">No users in this organization yet.</p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {org.users.map((u) => (
                <li key={u.id} className="flex items-center gap-3 py-2.5">
                  <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-semibold uppercase text-indigo-700">
                    {(u.name || u.email || '?').trim().charAt(0)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-gray-900">{u.name}</div>
                    <div className="truncate text-xs text-gray-400">{u.email}</div>
                  </div>
                  <span className="flex-shrink-0 text-xs text-gray-500">
                    {ROLE_LABEL[u.role] || u.role}
                    {!u.is_active && <span className="ml-1 text-gray-300">(inactive)</span>}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function BackLink() {
  return (
    <Link to="/platform" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800">
      <ArrowLeft className="h-4 w-4" /> All organizations
    </Link>
  );
}

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-gray-700">{label}</span>
      {children}
    </label>
  );
}
