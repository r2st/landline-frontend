import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Loader2, UserPlus, ShieldAlert, X, Trash2, Copy, Check, KeyRound } from 'lucide-react';
import { orgApi, canManageOrg } from '../api/org';
import { useAuth } from '../context/AuthContext';
import { usePlatform } from '../context/PlatformContext';
import PlatformOrgPrompt from '../components/PlatformOrgPrompt';
import { AdminOnlyBadge } from './OrganizationSettings';

export const ORG_ROLES = [
  { value: 'org_admin', label: 'Admin', desc: 'Full access — manage settings and team' },
  { value: 'org_manager', label: 'Manager', desc: 'View all org data, manage members’ work' },
  { value: 'org_agent', label: 'Agent', desc: 'Scoped to their own work' },
];

const ROLE_LABEL = Object.fromEntries(ORG_ROLES.map((r) => [r.value, r.label]));
// platform_admin can appear in the list but isn't org-assignable.
ROLE_LABEL.platform_admin = 'Platform';

const ROLE_BADGE = {
  platform_admin: 'bg-purple-50 text-purple-700 ring-purple-600/20',
  org_admin: 'bg-indigo-50 text-indigo-700 ring-indigo-600/20',
  org_manager: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  org_agent: 'bg-gray-100 text-gray-600 ring-gray-500/20',
};

function formatDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return '—';
  }
}

export default function TeamManagement() {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();
  const { isPlatformAdmin, isImpersonating } = usePlatform();
  const canWrite = canManageOrg(currentUser);
  const [showInvite, setShowInvite] = useState(false);
  const [removeTarget, setRemoveTarget] = useState(null);
  const [invited, setInvited] = useState(null); // { email, temporary_password }

  // Platform admins have no org of their own — skip the doomed /org/members call.
  const needsOrgContext = isPlatformAdmin && !isImpersonating;

  const { data: members = [], isLoading, isError } = useQuery({
    queryKey: ['org-members'],
    queryFn: orgApi.listMembers,
    enabled: !needsOrgContext,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['org-members'] });

  const inviteMutation = useMutation({
    mutationFn: orgApi.invite,
    onSuccess: (data) => {
      setShowInvite(false);
      setInvited({ email: data.email, temporary_password: data.temporary_password });
      invalidate();
    },
    onError: (err) => {
      const status = err?.response?.status;
      toast.error(
        status === 409 ? 'A user with that email already exists'
          : status === 403 ? 'Only an organization admin can invite members'
          : status === 422 ? 'Check the form — a valid email and role are required'
          : 'Could not invite member'
      );
    },
  });

  const roleMutation = useMutation({
    mutationFn: ({ id, role }) => orgApi.changeRole(id, role),
    onSuccess: () => { toast.success('Role updated'); invalidate(); },
    onError: (err) => toast.error(err?.response?.data?.detail || 'Could not change role'),
  });

  const removeMutation = useMutation({
    mutationFn: (id) => orgApi.remove(id),
    onSuccess: () => { toast.success('Member removed'); setRemoveTarget(null); invalidate(); },
    onError: (err) => {
      setRemoveTarget(null);
      toast.error(err?.response?.data?.detail || 'Could not remove member');
    },
  });

  const activeCount = members.filter((m) => m.is_active).length;

  if (needsOrgContext) {
    return <PlatformOrgPrompt noun="team members" />;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Team</h1>
          <p className="mt-1 text-sm text-gray-500">
            {activeCount} active {activeCount === 1 ? 'member' : 'members'} in your organization.
          </p>
        </div>
        <div className="flex items-center gap-3">
          {!canWrite && <AdminOnlyBadge />}
          {canWrite && (
            <button
              type="button"
              onClick={() => setShowInvite(true)}
              className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700"
            >
              <UserPlus className="h-4 w-4" /> Invite member
            </button>
          )}
        </div>
      </div>

      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading team…
          </div>
        ) : isError ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-red-600">
            <ShieldAlert className="h-4 w-4" /> Could not load team members.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                <tr>
                  <th className="px-5 py-3">Name</th>
                  <th className="px-5 py-3">Email</th>
                  <th className="px-5 py-3">Role</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">Joined</th>
                  {canWrite && <th className="px-5 py-3 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {members.map((m) => {
                  const isSelf = currentUser?.id === m.id;
                  const isPlatform = m.role === 'platform_admin';
                  // Self can't be demoted out of admin; platform admins aren't editable here.
                  const roleLocked = !canWrite || isPlatform || (isSelf);
                  return (
                    <tr key={m.id} className={m.is_active ? 'hover:bg-gray-50' : 'bg-gray-50/50 hover:bg-gray-50'}>
                      <td className="px-5 py-3 font-medium text-gray-900">
                        {m.name}
                        {isSelf && <span className="ml-2 text-xs text-gray-400">(you)</span>}
                        {m.must_change_password && (
                          <span className="ml-2 rounded bg-amber-50 px-1.5 py-0.5 text-[11px] font-medium text-amber-700 ring-1 ring-amber-600/20">
                            pending password
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-gray-600">{m.email}</td>
                      <td className="px-5 py-3">
                        {roleLocked ? (
                          <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${ROLE_BADGE[m.role] || ROLE_BADGE.org_agent}`}>
                            {ROLE_LABEL[m.role] || m.role}
                          </span>
                        ) : (
                          <select
                            aria-label={`Role for ${m.name}`}
                            value={m.role}
                            disabled={roleMutation.isPending}
                            onChange={(e) => roleMutation.mutate({ id: m.id, role: e.target.value })}
                            className={`rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset disabled:opacity-70 ${ROLE_BADGE[m.role] || ROLE_BADGE.org_agent}`}
                          >
                            {ORG_ROLES.map((r) => (
                              <option key={r.value} value={r.value}>{r.label}</option>
                            ))}
                          </select>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        {m.is_active ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-700">
                            <span className="h-1.5 w-1.5 rounded-full bg-green-500" /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-400">
                            <span className="h-1.5 w-1.5 rounded-full bg-gray-400" /> Removed
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-gray-500">{formatDate(m.created_at)}</td>
                      {canWrite && (
                        <td className="px-5 py-3">
                          <div className="flex items-center justify-end">
                            <button
                              type="button"
                              disabled={isSelf || isPlatform || !m.is_active || removeMutation.isPending}
                              onClick={() => setRemoveTarget(m)}
                              title={isSelf ? 'You cannot remove your own account' : isPlatform ? 'Platform admins cannot be removed here' : 'Remove member'}
                              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:text-gray-300 disabled:hover:bg-transparent"
                            >
                              <Trash2 className="h-3.5 w-3.5" /> Remove
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {showInvite && (
        <InviteModal
          isPending={inviteMutation.isPending}
          onClose={() => setShowInvite(false)}
          onSubmit={(payload) => inviteMutation.mutate(payload)}
        />
      )}

      {invited && <InvitedModal invited={invited} onClose={() => setInvited(null)} />}

      {removeTarget && (
        <ConfirmRemoveModal
          member={removeTarget}
          isPending={removeMutation.isPending}
          onClose={() => setRemoveTarget(null)}
          onConfirm={() => removeMutation.mutate(removeTarget.id)}
        />
      )}
    </div>
  );
}

function InviteModal({ isPending, onClose, onSubmit }) {
  const [form, setForm] = useState({ email: '', name: '', role: 'org_agent' });
  const canSubmit = form.email.trim() && form.name.trim() && !isPending;

  const submit = (e) => {
    e.preventDefault();
    if (!canSubmit) return;
    onSubmit({ email: form.email.trim(), name: form.name.trim(), role: form.role });
  };

  return (
    <ModalShell title="Invite a member" icon={UserPlus} onClose={onClose}>
      <p className="mb-4 text-sm text-gray-500">
        We’ll create the account with a temporary password. Share it with the invitee — they’ll set their own on first login.
      </p>
      <form onSubmit={submit} className="space-y-3">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-gray-600">Email</span>
          <input
            type="email" required autoFocus value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="person@company.com" className={modalInput}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-gray-600">Full name</span>
          <input
            type="text" required value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Jane Doe" className={modalInput}
          />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-gray-600">Role</span>
          <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} className={modalInput}>
            {ORG_ROLES.map((r) => (
              <option key={r.value} value={r.value}>{r.label} — {r.desc}</option>
            ))}
          </select>
        </label>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onClose} className={btnSecondary}>Cancel</button>
          <button type="submit" disabled={!canSubmit} className={btnPrimary}>
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />} Send invite
          </button>
        </div>
      </form>
    </ModalShell>
  );
}

function InvitedModal({ invited, onClose }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(invited.temporary_password);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('Could not copy — select and copy manually');
    }
  };
  return (
    <ModalShell title="Member invited" icon={KeyRound} onClose={onClose}>
      <p className="mb-4 text-sm text-gray-500">
        <span className="font-medium text-gray-900">{invited.email}</span> has been added. Share this one-time
        password — it won’t be shown again.
      </p>
      <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2.5">
        <code className="flex-1 select-all break-all font-mono text-sm text-gray-900">{invited.temporary_password}</code>
        <button
          type="button" onClick={copy}
          className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-2.5 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-100"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-green-600" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <div className="flex justify-end pt-4">
        <button type="button" onClick={onClose} className={btnPrimary}>Done</button>
      </div>
    </ModalShell>
  );
}

function ConfirmRemoveModal({ member, isPending, onClose, onConfirm }) {
  return (
    <ModalShell title="Remove member" icon={Trash2} onClose={onClose} danger>
      <p className="mb-4 text-sm text-gray-500">
        Remove <span className="font-medium text-gray-900">{member.name}</span>{' '}
        <span className="text-gray-400">({member.email})</span>? Their account is deactivated and can no longer
        sign in. History is preserved.
      </p>
      <div className="flex justify-end gap-2 pt-2">
        <button type="button" onClick={onClose} className={btnSecondary}>Cancel</button>
        <button
          type="button" onClick={onConfirm} disabled={isPending}
          className="flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-700 disabled:opacity-60"
        >
          {isPending && <Loader2 className="h-4 w-4 animate-spin" />} Remove
        </button>
      </div>
    </ModalShell>
  );
}

function ModalShell({ title, icon: Icon, onClose, danger, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/40 p-4" onMouseDown={onClose}>
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl" onMouseDown={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Icon className={`h-5 w-5 ${danger ? 'text-red-600' : 'text-indigo-600'}`} />
            <h2 className="text-base font-semibold text-gray-900">{title}</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600">
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

const modalInput = 'w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500';
const btnPrimary = 'flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:opacity-60';
const btnSecondary = 'rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100';
