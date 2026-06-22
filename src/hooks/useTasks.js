import { useQuery, useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { tasksApi, queryClient } from '../api/client';

function errMsg(e, fallback) {
  return e?.response?.data?.detail || e?.message || fallback;
}

function asArray(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.items)) return data.items;
  return [];
}

// Tasks, optionally scoped (by company, status, priority). Graceful empty list.
export function useTasks(params = {}) {
  return useQuery({
    queryKey: ['tasks', params],
    queryFn: async () => {
      try {
        return asArray(await tasksApi.list(params));
      } catch {
        return [];
      }
    },
    retry: false,
  });
}

function invalidate() {
  queryClient.invalidateQueries({ queryKey: ['tasks'] });
  queryClient.invalidateQueries({ queryKey: ['clients'] });
}

export function useCreateTask() {
  return useMutation({
    mutationFn: async (data) => await tasksApi.create(data),
    onSuccess: () => { invalidate(); toast.success('Task added'); },
    onError: (e) => toast.error(errMsg(e, 'Failed to add task')),
  });
}

export function useUpdateTask() {
  return useMutation({
    mutationFn: async ({ id, data }) => await tasksApi.update(id, data),
    onSuccess: (_r, variables) => {
      invalidate();
      const status = variables?.data?.status;
      toast.success(status === 'completed' ? 'Task completed' : 'Task updated');
    },
    onError: (e) => toast.error(errMsg(e, 'Failed to update task')),
  });
}

export function useDeleteTask() {
  return useMutation({
    mutationFn: async (id) => await tasksApi.remove(id),
    onSuccess: () => { invalidate(); toast.success('Task deleted'); },
    onError: (e) => toast.error(errMsg(e, 'Failed to delete task')),
  });
}
