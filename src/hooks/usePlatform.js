import { useMutation, useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { platformApi, queryClient } from '../api/client';

// Platform-wide stats for the platform-admin dashboard header. Degrades to a
// zeroed roll-up so the page always renders rather than blanking on a hiccup.
export function usePlatformStats() {
  return useQuery({
    queryKey: ['platform-stats'],
    queryFn: async () => {
      try {
        return await platformApi.stats();
      } catch {
        return {
          total_organizations: 0,
          active_organizations: 0,
          total_users: 0,
          total_emails_sent: 0,
        };
      }
    },
    retry: false,
  });
}

// Every organization with per-org user / usage counts. `activeOnly` narrows.
// `options.enabled` gates the fetch (e.g. platform admins only, and paused
// while impersonating so the scoped token doesn't 403 the platform endpoint).
export function useOrganizations(activeOnly = false, options = {}) {
  const { enabled = true } = options;
  return useQuery({
    queryKey: ['platform-orgs', activeOnly ? 'active' : 'all'],
    queryFn: async () => {
      const data = await platformApi.listOrganizations(
        activeOnly ? { active_only: true } : undefined
      );
      return Array.isArray(data) ? data : [];
    },
    enabled,
    retry: false,
  });
}

// One org's full detail (config, branding, users, usage). Only fires when set.
export function useOrganization(orgId) {
  return useQuery({
    queryKey: ['platform-org', orgId],
    queryFn: () => platformApi.getOrganization(orgId),
    enabled: Boolean(orgId),
    retry: false,
  });
}

export function useCreateOrganization() {
  return useMutation({
    mutationFn: (body) => platformApi.createOrganization(body),
    onSuccess: (org) => {
      queryClient.invalidateQueries({ queryKey: ['platform-orgs'] });
      queryClient.invalidateQueries({ queryKey: ['platform-stats'] });
      toast.success(`Organization "${org.name}" created`);
    },
    onError: (e) =>
      toast.error(e?.response?.data?.detail || e?.message || 'Could not create organization'),
  });
}

export function useUpdateOrganization(orgId) {
  return useMutation({
    mutationFn: (body) => platformApi.updateOrganization(orgId, body),
    onSuccess: (org) => {
      queryClient.setQueryData(['platform-org', orgId], org);
      queryClient.invalidateQueries({ queryKey: ['platform-orgs'] });
      queryClient.invalidateQueries({ queryKey: ['platform-stats'] });
      toast.success('Organization updated');
    },
    onError: (e) =>
      toast.error(e?.response?.data?.detail || e?.message || 'Could not update organization'),
  });
}

export function useDeactivateOrganization() {
  return useMutation({
    mutationFn: (orgId) => platformApi.deactivateOrganization(orgId),
    onSuccess: (_data, orgId) => {
      queryClient.invalidateQueries({ queryKey: ['platform-org', orgId] });
      queryClient.invalidateQueries({ queryKey: ['platform-orgs'] });
      queryClient.invalidateQueries({ queryKey: ['platform-stats'] });
      toast.success('Organization deactivated');
    },
    onError: (e) =>
      toast.error(e?.response?.data?.detail || e?.message || 'Could not deactivate organization'),
  });
}

// The roster of platform_admin accounts, for the dashboard's admin panel.
// `options.enabled` gates the fetch (platform admins only; paused while
// impersonating so a scoped token doesn't 403 the platform endpoint).
export function usePlatformAdmins(options = {}) {
  const { enabled = true } = options;
  return useQuery({
    queryKey: ['platform-admins'],
    queryFn: async () => {
      const data = await platformApi.listAdmins();
      return Array.isArray(data) ? data : [];
    },
    enabled,
    retry: false,
  });
}

// Elevate a user (by email) to platform_admin. Refreshes the admin roster,
// the org list, and the stats since org membership changed.
export function usePromoteAdmin() {
  return useMutation({
    mutationFn: (email) => platformApi.promoteAdmin(email),
    onSuccess: (user) => {
      queryClient.invalidateQueries({ queryKey: ['platform-admins'] });
      queryClient.invalidateQueries({ queryKey: ['platform-orgs'] });
      queryClient.invalidateQueries({ queryKey: ['platform-stats'] });
      toast.success(`${user.email} is now a platform admin`);
    },
    onError: (e) =>
      toast.error(e?.response?.data?.detail || e?.message || 'Could not promote user'),
  });
}

// Demote a platform_admin back to org_admin, reassigning to an org.
export function useDemoteAdmin() {
  return useMutation({
    mutationFn: ({ userId, orgId }) => platformApi.demoteAdmin(userId, orgId),
    onSuccess: (user) => {
      queryClient.invalidateQueries({ queryKey: ['platform-admins'] });
      queryClient.invalidateQueries({ queryKey: ['platform-orgs'] });
      queryClient.invalidateQueries({ queryKey: ['platform-stats'] });
      toast.success(`${user.email} demoted to org admin`);
    },
    onError: (e) =>
      toast.error(e?.response?.data?.detail || e?.message || 'Could not demote admin'),
  });
}

// --- API credentials ---------------------------------------------------------

// Every managed credential with its masked value and provenance. Gated on
// `enabled` like the other platform queries — an org admin hitting this 403s,
// and the page that renders it is platform-admin-only anyway.
export function useCredentials(options = {}) {
  const { enabled = true } = options;
  return useQuery({
    queryKey: ['platform-credentials'],
    queryFn: async () => {
      const data = await platformApi.listCredentials();
      return {
        credentials: Array.isArray(data?.credentials) ? data.credentials : [],
        applied_at: data?.applied_at || null,
      };
    },
    enabled,
    retry: false,
  });
}

// Store an override. The success copy names the propagation delay rather than
// implying the rotation is live everywhere: this call updates the worker that
// served it, and the rest follow on the 5-minute refresh beat.
export function useSetCredential() {
  return useMutation({
    mutationFn: ({ key, value }) => platformApi.setCredential(key, value),
    onSuccess: (cred) => {
      queryClient.invalidateQueries({ queryKey: ['platform-credentials'] });
      toast.success(`${cred.label} saved — live on all workers within 5 minutes`);
    },
    onError: (e) =>
      toast.error(e?.response?.data?.detail || e?.message || 'Could not save credential'),
  });
}

// Drop an override, falling back to the deployed environment value.
export function useClearCredential() {
  return useMutation({
    mutationFn: (key) => platformApi.clearCredential(key),
    onSuccess: (cred) => {
      queryClient.invalidateQueries({ queryKey: ['platform-credentials'] });
      toast.success(
        cred.source === 'environment'
          ? `${cred.label} reverted to the deployed value`
          : `${cred.label} cleared — nothing is configured for it now`
      );
    },
    onError: (e) =>
      toast.error(e?.response?.data?.detail || e?.message || 'Could not clear credential'),
  });
}
