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
