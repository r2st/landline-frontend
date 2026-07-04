import React, { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Loader2, UserPlus, ShieldAlert } from 'lucide-react';
import { adminUsersApi } from '../api/auth';
import { useAuth } from '../context/AuthContext';

const ROLES = ['admin', 'manager', 'agent'];

const ROLE_BADGE = {
  admin: 'bg-indigo-50 text-indigo-700 ring-indigo-600/20',
  manager: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  agent: 'bg-gray-100 text-gray-600 ring-gray-500/20',
};

const EMPTY_FORM = { email: '', name: '', role: 'agent', password: '' };

export default function AdminUsers() {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();
  const [form, setForm] = useState(EMPTY_FORM);

  const { data: users = [], isLoading, isError } = useQuery({
    queryKey: ['admin-users'],
    queryFn: adminUsersApi.list,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['admin-users'] });

  const createMutation = useMutation({
    mutationFn: adminUsersApi.create,
    onSuccess: () => {
      toast.success('User created');
      setForm(EMPTY_FORM);
      invalidate();
    },
    onError: (err) => {
      const status = err?.response?.status;
      toast.error(
        status === 409
          ? 'A user with that email already exists'
          : status === 422
          ? 'Check the form — password must be at least 8 characters'
          : 'Could not create user'
      );
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }) => adminUsersApi.update(id, payload),
    onSuccess: () => {
      toast.success('User updated');
      invalidate();
    },
    onError: (err) => {
      toast.error(err?.response?.data?.detail || 'Could not update user');
    },
  });

  const onCreate = (e) => {
    e.preventDefault();
    createMutation.mutate({
      email: form.email.trim(),
      name: form.name.trim(),
      role: form.role,
      password: form.password,
    });
  };

  const toggleActive = (u) =>
    updateMutation.mutate({ id: u.id, payload: { is_active: !u.is_active } });

  const changeRole = (u, role) =>
    updateMutation.mutate({ id: u.id, payload: { role } });

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Users</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage who can access Landline and what they can do.
        </p>
      </div>

      {/* Create user */}
      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <UserPlus className="h-5 w-5 text-indigo-600" />
          <h2 className="text-sm font-semibold text-gray-900">Add a new user</h2>
        </div>
        <form onSubmit={onCreate} className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <input
            type="email"
            required
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <input
            type="text"
            required
            placeholder="Full name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <select
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm capitalize focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          >
            {ROLES.map((r) => (
              <option key={r} value={r} className="capitalize">
                {r}
              </option>
            ))}
          </select>
          <input
            type="text"
            required
            minLength={8}
            placeholder="Initial password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:opacity-60"
          >
            {createMutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            Create
          </button>
        </form>
        <p className="mt-2 text-xs text-gray-400">
          New users are required to change this password on first login.
        </p>
      </section>

      {/* Users table */}
      <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-gray-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading users…
          </div>
        ) : isError ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-red-600">
            <ShieldAlert className="h-4 w-4" /> Could not load users.
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
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {users.map((u) => {
                  const isSelf = currentUser?.id === u.id;
                  return (
                    <tr key={u.id} className="hover:bg-gray-50">
                      <td className="px-5 py-3 font-medium text-gray-900">
                        {u.name}
                        {isSelf && <span className="ml-2 text-xs text-gray-400">(you)</span>}
                        {u.must_change_password && (
                          <span className="ml-2 rounded bg-amber-50 px-1.5 py-0.5 text-[11px] font-medium text-amber-700 ring-1 ring-amber-600/20">
                            pending password
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-gray-600">{u.email}</td>
                      <td className="px-5 py-3">
                        <select
                          value={u.role}
                          disabled={isSelf || updateMutation.isPending}
                          onChange={(e) => changeRole(u, e.target.value)}
                          className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ring-1 ring-inset disabled:opacity-70 ${
                            ROLE_BADGE[u.role] || ROLE_BADGE.agent
                          }`}
                        >
                          {ROLES.map((r) => (
                            <option key={r} value={r} className="capitalize">
                              {r}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-5 py-3">
                        {u.is_active ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-green-700">
                            <span className="h-1.5 w-1.5 rounded-full bg-green-500" /> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-400">
                            <span className="h-1.5 w-1.5 rounded-full bg-gray-400" /> Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button
                          type="button"
                          disabled={isSelf || updateMutation.isPending}
                          onClick={() => toggleActive(u)}
                          className="rounded-lg border border-gray-300 px-3 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
                          title={isSelf ? 'You cannot change your own status' : ''}
                        >
                          {u.is_active ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
