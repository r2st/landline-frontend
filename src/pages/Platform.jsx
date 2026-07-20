import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Building2, Users, MailCheck, Plus, Loader2, ShieldCheck, X, Eye,
  CheckCircle2, XCircle, ChevronRight, ShieldPlus, ShieldMinus, UserCog,
} from 'lucide-react';
import EmptyState from '../components/EmptyState';
import {
  usePlatformStats, useOrganizations, useCreateOrganization,
  usePlatformAdmins, usePromoteAdmin, useDemoteAdmin,
} from '../hooks/usePlatform';
import { usePlatform } from '../context/PlatformContext';
import { cn } from '../lib/utils';

/**
 * Platform Admin dashboard (SaaS multi-tenancy, Phase 2) — the cross-org "god
 * view" restricted to platform_admin users. Rolls up platform-wide counts,
 * lists every tenant with its user / usage stats, and is the launch point for
 * provisioning a new organization or "viewing as" an existing one.
 */

const BILLING_PLANS = ['free', 'starter', 'growth', 'pro', 'enterprise'];

const PLAN_TONE = {
  free: 'bg-gray-100 text-gray-600 ring-gray-200',
  starter: 'bg-sky-50 text-sky-700 ring-sky-200',
  growth: 'bg-teal-50 text-teal-700 ring-teal-200',
  pro: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  enterprise: 'bg-amber-50 text-amber-700 ring-amber-200',
};

function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return isNaN(d) ? '—' : d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function StatTile({ icon: Icon, label, value, tone }) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className={cn('absolute inset-x-0 top-0 h-1 bg-gradient-to-r', tone)} />
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <p className="text-sm font-medium text-gray-500">{label}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );
}

function PlanBadge({ plan }) {
  return (
    <span className={cn('rounded-full px-2 py-0.5 text-xs font-medium capitalize ring-1 ring-inset', PLAN_TONE[plan] || PLAN_TONE.free)}>
      {plan}
    </span>
  );
}

export default function Platform() {
  const [showCreate, setShowCreate] = useState(false);
  const [showPromote, setShowPromote] = useState(false);
  const { data: stats, isLoading: statsLoading } = usePlatformStats();
  const { data: orgs = [], isLoading, isError } = useOrganizations();
  const { startImpersonation, isPlatformAdmin } = usePlatform();

  const onViewAs = async (org) => {
    try {
      await startImpersonation(org);
    } catch (e) {
      // Surface the no-user case (startImpersonation throws before any request).
      const msg = e?.message || 'Could not view as this organization';
      import('react-hot-toast').then(({ default: toast }) => toast.error(msg));
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-gray-900">
            <ShieldCheck className="h-6 w-6 text-indigo-500" />
            Platform Admin
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Every organization on the platform — provision new tenants, inspect usage, and
            view as any org for debugging.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowPromote(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-white px-3.5 py-2 text-sm font-medium text-indigo-700 shadow-sm hover:bg-indigo-50"
          >
            <ShieldPlus className="h-4 w-4" />
            Promote to Platform Admin
          </button>
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" />
            New organization
          </button>
        </div>
      </div>

      {/* Platform-wide roll-up */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          icon={Building2}
          label="Organizations"
          value={statsLoading ? '—' : `${stats?.active_organizations ?? 0}/${stats?.total_organizations ?? 0}`}
          tone="from-indigo-500 to-indigo-600"
        />
        <StatTile icon={CheckCircle2} label="Active orgs" value={statsLoading ? '—' : (stats?.active_organizations ?? 0)} tone="from-teal-500 to-teal-600" />
        <StatTile icon={Users} label="Total users" value={statsLoading ? '—' : (stats?.total_users ?? 0)} tone="from-sky-500 to-sky-600" />
        <StatTile icon={MailCheck} label="Emails sent" value={statsLoading ? '—' : (stats?.total_emails_sent ?? 0).toLocaleString()} tone="from-amber-400 to-amber-500" />
      </div>

      {/* Organization list */}
      {isLoading ? (
        <div className="flex items-center justify-center py-24 text-gray-400">
          <Loader2 className="h-5 w-5 animate-spin" />
        </div>
      ) : isError ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-800">
          Couldn't load organizations. The platform endpoint did not respond — you may not have
          platform admin access.
        </div>
      ) : orgs.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No organizations yet"
          description="Provision the first tenant to get started."
          action={{ label: 'New organization', onClick: () => setShowCreate(true) }}
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr className="text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                <th className="px-4 py-3">Organization</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3 text-right">Users</th>
                <th className="px-4 py-3 text-right">Emails</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {orgs.map((org) => (
                <tr key={org.id} className="text-sm hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <Link to={`/platform/organizations/${org.id}`} className="group flex flex-col">
                      <span className="font-medium text-gray-900 group-hover:text-indigo-600">{org.name}</span>
                      <span className="text-xs text-gray-400">{org.slug}</span>
                    </Link>
                  </td>
                  <td className="px-4 py-3"><PlanBadge plan={org.billing_plan} /></td>
                  <td className="px-4 py-3 text-right tabular-nums text-gray-700">{org.usage?.user_count ?? 0}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-gray-700">{(org.usage?.emails_sent ?? 0).toLocaleString()}</td>
                  <td className="px-4 py-3">
                    {org.is_active ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-400">
                        <XCircle className="h-3.5 w-3.5" /> Inactive
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{fmtDate(org.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {isPlatformAdmin && (
                        <button
                          type="button"
                          onClick={() => onViewAs(org)}
                          disabled={!org.impersonatable_user_id}
                          title={org.impersonatable_user_id ? `View as ${org.name}` : 'No users to view as yet'}
                          className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          <Eye className="h-3.5 w-3.5" /> View as
                        </button>
                      )}
                      <Link
                        to={`/platform/organizations/${org.id}`}
                        className="inline-flex items-center rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                        aria-label={`Open ${org.name}`}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Platform administrators roster */}
      <PlatformAdminsPanel orgs={orgs} />

      <CreateOrgModal open={showCreate} onClose={() => setShowCreate(false)} />
      <PromoteAdminModal open={showPromote} onClose={() => setShowPromote(false)} />
    </div>
  );
}

function PlatformAdminsPanel({ orgs }) {
  const { data: admins = [], isLoading } = usePlatformAdmins();
  const [demoteTarget, setDemoteTarget] = useState(null);

  return (
    <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center gap-2 border-b border-gray-100 px-4 py-3">
        <UserCog className="h-4 w-4 text-indigo-500" />
        <h2 className="text-sm font-semibold text-gray-900">Platform administrators</h2>
        <span className="text-xs text-gray-400">({admins.length})</span>
      </div>
      {isLoading ? (
        <div className="flex items-center justify-center py-10 text-gray-400">
          <Loader2 className="h-4 w-4 animate-spin" />
        </div>
      ) : admins.length === 0 ? (
        <p className="px-4 py-6 text-sm text-gray-400">No platform admins.</p>
      ) : (
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr className="text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
              <th className="px-4 py-2.5">Name</th>
              <th className="px-4 py-2.5">Email</th>
              <th className="px-4 py-2.5">Status</th>
              <th className="px-4 py-2.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {admins.map((a) => (
              <tr key={a.id} className="text-sm hover:bg-gray-50">
                <td className="px-4 py-2.5 font-medium text-gray-900">{a.name}</td>
                <td className="px-4 py-2.5 text-gray-600">{a.email}</td>
                <td className="px-4 py-2.5">
                  {a.is_active ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-green-600">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Active
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-400">
                      <XCircle className="h-3.5 w-3.5" /> Inactive
                    </span>
                  )}
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => setDemoteTarget(a)}
                      className="inline-flex items-center gap-1 rounded-md border border-gray-200 px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100"
                    >
                      <ShieldMinus className="h-3.5 w-3.5" /> Demote
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <DemoteAdminModal
        admin={demoteTarget}
        orgs={orgs}
        onClose={() => setDemoteTarget(null)}
      />
    </section>
  );
}

function PromoteAdminModal({ open, onClose }) {
  const [email, setEmail] = useState('');
  const promote = usePromoteAdmin();

  if (!open) return null;

  const submit = (e) => {
    e.preventDefault();
    const value = email.trim();
    if (!value) return;
    promote.mutate(value, {
      onSuccess: () => {
        setEmail('');
        onClose();
      },
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
            <ShieldPlus className="h-5 w-5 text-indigo-500" /> Promote to Platform Admin
          </h2>
          <button type="button" onClick={onClose} className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="mb-4 text-sm text-gray-500">
          Enter the email of an existing user. They'll gain full platform access and be
          detached from their current organization.
        </p>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label htmlFor="promote-email" className="block text-sm font-medium text-gray-700">Email</label>
            <input
              id="promote-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
              placeholder="person@company.com"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">
              Cancel
            </button>
            <button
              type="submit"
              disabled={promote.isPending || !email.trim()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {promote.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Promote
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function DemoteAdminModal({ admin, orgs, onClose }) {
  const [orgId, setOrgId] = useState('');
  const demote = useDemoteAdmin();

  // Reset the org selection whenever a different admin is targeted.
  useEffect(() => {
    setOrgId('');
  }, [admin?.id]);

  if (!admin) return null;

  const submit = (e) => {
    e.preventDefault();
    if (!orgId) return;
    demote.mutate(
      { userId: admin.id, orgId },
      { onSuccess: () => onClose() }
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-gray-900">
            <ShieldMinus className="h-5 w-5 text-amber-500" /> Demote platform admin
          </h2>
          <button type="button" onClick={onClose} className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <p className="mb-4 text-sm text-gray-500">
          <span className="font-medium text-gray-700">{admin.email}</span> will become an
          org admin. Pick the organization to assign them to.
        </p>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label htmlFor="demote-org" className="block text-sm font-medium text-gray-700">Organization</label>
            <select
              id="demote-org"
              value={orgId}
              onChange={(e) => setOrgId(e.target.value)}
              required
              autoFocus
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
            >
              <option value="" disabled>Select an organization…</option>
              {orgs.map((o) => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">
              Cancel
            </button>
            <button
              type="submit"
              disabled={demote.isPending || !orgId}
              className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50"
            >
              {demote.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Demote
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CreateOrgModal({ open, onClose }) {
  const [form, setForm] = useState({ name: '', slug: '', billing_plan: 'free', industry: '' });
  const create = useCreateOrganization();

  if (!open) return null;

  const submit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    const payload = {
      name: form.name.trim(),
      billing_plan: form.billing_plan,
    };
    if (form.slug.trim()) payload.slug = form.slug.trim();
    if (form.industry.trim()) payload.industry = form.industry.trim();
    create.mutate(payload, {
      onSuccess: () => {
        setForm({ name: '', slug: '', billing_plan: 'free', industry: '' });
        onClose();
      },
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">New organization</h2>
          <button type="button" onClick={onClose} className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label htmlFor="org-name" className="block text-sm font-medium text-gray-700">Name</label>
            <input
              id="org-name"
              type="text"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              required
              autoFocus
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
              placeholder="Acme Corp"
            />
          </div>
          <div>
            <label htmlFor="org-slug" className="block text-sm font-medium text-gray-700">
              Slug <span className="font-normal text-gray-400">(optional — derived from name)</span>
            </label>
            <input
              id="org-slug"
              type="text"
              value={form.slug}
              onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
              className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
              placeholder="acme"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="org-plan" className="block text-sm font-medium text-gray-700">Billing plan</label>
              <select
                id="org-plan"
                value={form.billing_plan}
                onChange={(e) => setForm((f) => ({ ...f, billing_plan: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm capitalize focus:border-indigo-500 focus:ring-indigo-500"
              >
                {BILLING_PLANS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label htmlFor="org-industry" className="block text-sm font-medium text-gray-700">
                Industry <span className="font-normal text-gray-400">(opt.)</span>
              </label>
              <input
                id="org-industry"
                type="text"
                value={form.industry}
                onChange={(e) => setForm((f) => ({ ...f, industry: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:ring-indigo-500"
                placeholder="Manufacturing"
              />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50">
              Cancel
            </button>
            <button
              type="submit"
              disabled={create.isPending || !form.name.trim()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
