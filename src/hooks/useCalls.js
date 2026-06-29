import { useQuery, useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { callsApi, queryClient } from '../api/client';

function asList(data) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.items)) return data.items;
  if (data && Array.isArray(data.tasks)) return data.tasks;
  return [];
}

// ─── Call tasks ───────────────────────────────────────────────────────────────
export function useCallTasks(params = {}) {
  return useQuery({
    queryKey: ['calls', 'tasks', params],
    queryFn: async () => {
      try {
        return asList(await callsApi.getTasks(params));
      } catch {
        return [];
      }
    },
    staleTime: 30000,
  });
}

export function useTodaysCalls() {
  return useQuery({
    queryKey: ['calls', 'today'],
    queryFn: async () => {
      try {
        return asList(await callsApi.getToday());
      } catch {
        return [];
      }
    },
    staleTime: 30000,
  });
}

export function useCallBriefing(taskId) {
  return useQuery({
    queryKey: ['calls', 'briefing', taskId],
    queryFn: async () => {
      try {
        return await callsApi.getBriefing(taskId);
      } catch {
        return null;
      }
    },
    enabled: !!taskId,
    staleTime: 60000,
  });
}

function invalidateCallTasks() {
  queryClient.invalidateQueries({ queryKey: ['calls', 'tasks'] });
  queryClient.invalidateQueries({ queryKey: ['calls', 'today'] });
}

export function useSaveCallTask() {
  return useMutation({
    mutationFn: async ({ id, data }) =>
      id ? callsApi.updateTask(id, data) : callsApi.createTask(data),
    onSuccess: (_r, vars) => {
      invalidateCallTasks();
      toast.success(vars?.id ? 'Call updated' : 'Call task created');
    },
    onError: (e) => toast.error(e?.response?.data?.detail || e?.message || 'Failed to save call task'),
  });
}

// Log a call outcome without a success toast spam — used after a live call.
export function useLogCallOutcome() {
  return useMutation({
    mutationFn: async ({ id, data }) => callsApi.updateTask(id, data),
    onSuccess: () => {
      invalidateCallTasks();
      toast.success('Outcome logged');
    },
    onError: (e) => toast.error(e?.response?.data?.detail || e?.message || 'Failed to log outcome'),
  });
}

export function useGenerateQueue() {
  return useMutation({
    mutationFn: async () => callsApi.generateQueue(),
    onSuccess: (res) => {
      invalidateCallTasks();
      const n = res?.count ?? res?.generated ?? (Array.isArray(res) ? res.length : null);
      toast.success(n != null ? `Generated ${n} calls for today` : 'Call queue generated');
    },
    onError: (e) => toast.error(e?.response?.data?.detail || e?.message || 'Failed to generate queue'),
  });
}

// ─── Scripts ──────────────────────────────────────────────────────────────────
export function useCallScripts() {
  return useQuery({
    queryKey: ['calls', 'scripts'],
    queryFn: async () => {
      try {
        return asList(await callsApi.getScripts());
      } catch {
        return [];
      }
    },
    staleTime: 300000,
  });
}

export function useSaveScript() {
  return useMutation({
    mutationFn: async (data) => callsApi.saveScript(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calls', 'scripts'] });
      toast.success('Script saved');
    },
    onError: (e) => toast.error(e?.response?.data?.detail || e?.message || 'Failed to save script'),
  });
}

// ─── Notifications ────────────────────────────────────────────────────────────
export function useCallNotifications() {
  return useQuery({
    queryKey: ['calls', 'notifications'],
    queryFn: async () => {
      try {
        return asList(await callsApi.getNotifications());
      } catch {
        return [];
      }
    },
    staleTime: 30000,
    refetchInterval: 60000,
    retry: false,
  });
}

export function useMarkNotificationRead() {
  return useMutation({
    mutationFn: async (id) => callsApi.markNotificationRead(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['calls', 'notifications'] }),
    onError: () => {},
  });
}
