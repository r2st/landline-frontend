import { useQuery, useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { groupsApi, queryClient } from '../api/client';

export function useGroups() {
  return useQuery({
    queryKey: ['groups'],
    queryFn: () => groupsApi.getAll(),
  });
}

export function useCreateGroup() {
  return useMutation({
    mutationFn: (data) => groupsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      toast.success('Group created');
    },
    onError: (e) => toast.error(e?.response?.data?.detail || 'Failed to create group'),
  });
}

export function useUpdateGroup() {
  return useMutation({
    mutationFn: ({ id, data }) => groupsApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      toast.success('Group updated');
    },
    onError: (e) => toast.error(e?.response?.data?.detail || 'Failed to update group'),
  });
}

export function useDeleteGroup() {
  return useMutation({
    mutationFn: (id) => groupsApi.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      toast.success('Group deleted');
    },
    onError: (e) => toast.error(e?.response?.data?.detail || 'Failed to delete group'),
  });
}

export function useAddGroupMembers() {
  return useMutation({
    mutationFn: ({ groupId, companyIds }) => groupsApi.addMembers(groupId, companyIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      toast.success('Companies added to group');
    },
    onError: (e) => toast.error(e?.response?.data?.detail || 'Failed to add companies'),
  });
}

export function useRemoveGroupMembers() {
  return useMutation({
    mutationFn: ({ groupId, companyIds }) => groupsApi.removeMembers(groupId, companyIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      toast.success('Companies removed from group');
    },
    onError: (e) => toast.error(e?.response?.data?.detail || 'Failed to remove companies'),
  });
}

export function useAutoGroupByIndustry() {
  return useMutation({
    mutationFn: () => groupsApi.autoGroupByIndustry(),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      toast.success(`Created ${data.groups_created} groups from ${data.industries_found} industries`);
    },
    onError: (e) => toast.error(e?.response?.data?.detail || 'Failed to auto-group'),
  });
}

export function useAutoGroupByCountry() {
  return useMutation({
    mutationFn: () => groupsApi.autoGroupByCountry(),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      toast.success(`Created ${data.groups_created} groups from ${data.countries_found} countries`);
    },
    onError: (e) => toast.error(e?.response?.data?.detail || 'Failed to auto-group'),
  });
}
