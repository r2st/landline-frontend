import { useMutation, useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { orchestrationApi, queryClient } from '../api/client';

// The channels and human-review triggers the backend understands. Kept in the
// frontend as the single source of truth for the form controls — they mirror
// ORCHESTRATION_CHANNELS and DEFAULT_HUMAN_REVIEW_TRIGGERS in the API. The
// backend validates channels, so an unknown value would 422; the known set here
// keeps the UI in step.
export const ORCHESTRATION_CHANNELS = ['email', 'linkedin', 'phone'];
export const HUMAN_REVIEW_TRIGGERS = [
  'pricing_request',
  'complex_objection',
  'referral',
  'legal',
];
// Per-enrollment orchestration modes (POST /enrollments/{id}/mode).
export const ORCHESTRATION_MODES = ['manual', 'assisted', 'autonomous'];

// List every orchestration policy. The endpoint returns a bare array; we
// normalise to one and degrade to an empty list so the page always renders
// rather than blanking on a backend hiccup. `activeOnly` narrows to live ones.
export function usePolicies(activeOnly = false) {
  return useQuery({
    queryKey: ['orchestration-policies', activeOnly ? 'active' : 'all'],
    queryFn: async () => {
      try {
        const data = await orchestrationApi.listPolicies(
          activeOnly ? { active_only: true } : undefined
        );
        return Array.isArray(data) ? data : [];
      } catch {
        return [];
      }
    },
    refetchInterval: 30000,
    keepPreviousData: true,
    retry: false,
  });
}

// Full detail for one policy. Only fires when a policy is selected.
export function usePolicy(policyId) {
  return useQuery({
    queryKey: ['orchestration-policy', policyId],
    queryFn: () => orchestrationApi.getPolicy(policyId),
    enabled: Boolean(policyId),
    retry: false,
  });
}

function invalidatePolicies() {
  queryClient.invalidateQueries({ queryKey: ['orchestration-policies'] });
}

export function useCreatePolicy() {
  return useMutation({
    mutationFn: (data) => orchestrationApi.createPolicy(data),
    onSuccess: (policy) => {
      invalidatePolicies();
      toast.success(`Created “${policy?.name || 'policy'}”`);
    },
    onError: (e) =>
      toast.error(e?.response?.data?.detail || e?.message || 'Could not create the policy'),
  });
}

export function useUpdatePolicy() {
  return useMutation({
    mutationFn: ({ id, data }) => orchestrationApi.updatePolicy(id, data),
    onSuccess: (policy) => {
      queryClient.setQueryData(['orchestration-policy', policy?.id], policy);
      invalidatePolicies();
      toast.success(`Saved “${policy?.name || 'policy'}”`);
    },
    onError: (e) =>
      toast.error(e?.response?.data?.detail || e?.message || 'Could not save the policy'),
  });
}

// Toggle active/paused. Shares the update endpoint but keeps its own toast so
// the message reads as a state change rather than a save.
export function useTogglePolicy() {
  return useMutation({
    mutationFn: ({ id, isActive }) =>
      orchestrationApi.updatePolicy(id, { is_active: isActive }),
    onSuccess: (policy) => {
      queryClient.setQueryData(['orchestration-policy', policy?.id], policy);
      invalidatePolicies();
      toast.success(policy?.is_active ? 'Policy activated' : 'Policy paused');
    },
    onError: (e) =>
      toast.error(e?.response?.data?.detail || e?.message || 'Could not change the policy state'),
  });
}

export function useDeletePolicy() {
  return useMutation({
    mutationFn: (id) => orchestrationApi.deletePolicy(id),
    onSuccess: () => {
      invalidatePolicies();
      toast.success('Policy deleted');
    },
    onError: (e) =>
      toast.error(e?.response?.data?.detail || e?.message || 'Could not delete the policy'),
  });
}

// Switch one enrollment between manual / assisted / autonomous.
export function useSetEnrollmentMode() {
  return useMutation({
    mutationFn: ({ enrollmentId, mode }) =>
      orchestrationApi.setEnrollmentMode(enrollmentId, mode),
    onSuccess: (data) =>
      toast.success(`Enrollment set to ${data?.orchestration_mode || 'the new mode'}`),
    onError: (e) =>
      toast.error(e?.response?.data?.detail || e?.message || 'Could not change the enrollment mode'),
  });
}
