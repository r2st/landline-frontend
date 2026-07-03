import { useQuery, useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { investorsApi, queryClient } from '../api/client';

// Backend list endpoints may return either an array or { items, total }.
function asList(data) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.items)) return data.items;
  if (data && Array.isArray(data.investors)) return data.investors;
  if (data && Array.isArray(data.interactions)) return data.interactions;
  if (data && Array.isArray(data.documents)) return data.documents;
  return [];
}

// ─── Investors list ───────────────────────────────────────────────────────────
export function useInvestors(params = {}) {
  return useQuery({
    queryKey: ['investors', 'list', params],
    queryFn: async () => {
      try {
        const data = await investorsApi.getAll(params);
        return { items: asList(data), total: data?.total ?? asList(data).length };
      } catch {
        return { items: [], total: 0 };
      }
    },
    staleTime: 30000,
  });
}

export function useInvestor(id) {
  return useQuery({
    queryKey: ['investors', 'detail', id],
    queryFn: async () => {
      try {
        return await investorsApi.getById(id);
      } catch {
        return null;
      }
    },
    enabled: !!id,
    staleTime: 30000,
  });
}

// ─── Pipeline funnel ──────────────────────────────────────────────────────────
export function useInvestorPipeline(params = {}) {
  return useQuery({
    queryKey: ['investors', 'pipeline', params],
    queryFn: async () => {
      try {
        return await investorsApi.getPipeline(params);
      } catch {
        return null;
      }
    },
    staleTime: 30000,
  });
}

// ─── Interaction timeline ─────────────────────────────────────────────────────
export function useInvestorInteractions(id) {
  return useQuery({
    queryKey: ['investors', 'interactions', id],
    queryFn: async () => {
      try {
        return asList(await investorsApi.getInteractions(id));
      } catch {
        return [];
      }
    },
    enabled: !!id,
    staleTime: 30000,
  });
}

// ─── Documents ────────────────────────────────────────────────────────────────
export function useInvestorDocuments(id) {
  return useQuery({
    queryKey: ['investors', 'documents', id],
    queryFn: async () => {
      try {
        return asList(await investorsApi.getDocuments(id));
      } catch {
        return [];
      }
    },
    enabled: !!id,
    staleTime: 30000,
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────
function invalidateInvestors(id) {
  queryClient.invalidateQueries({ queryKey: ['investors', 'list'] });
  queryClient.invalidateQueries({ queryKey: ['investors', 'pipeline'] });
  if (id) queryClient.invalidateQueries({ queryKey: ['investors', 'detail', id] });
}

export function useSaveInvestor() {
  return useMutation({
    mutationFn: async ({ id, data }) =>
      id ? investorsApi.update(id, data) : investorsApi.create(data),
    onSuccess: (_r, vars) => {
      invalidateInvestors(vars?.id);
      toast.success(vars?.id ? 'Investor updated' : 'Investor added');
    },
    onError: (e) => toast.error(e?.response?.data?.detail || e?.message || 'Failed to save investor'),
  });
}

export function useDeleteInvestor() {
  return useMutation({
    mutationFn: async (id) => investorsApi.remove(id),
    onSuccess: () => {
      invalidateInvestors();
      toast.success('Investor removed');
    },
    onError: (e) => toast.error(e?.response?.data?.detail || e?.message || 'Failed to remove investor'),
  });
}

export function useUpdateInvestorStatus() {
  return useMutation({
    mutationFn: async ({ id, status }) => investorsApi.updateStatus(id, status),
    onSuccess: (_r, vars) => {
      invalidateInvestors(vars?.id);
      toast.success('Status updated');
    },
    onError: (e) => toast.error(e?.response?.data?.detail || e?.message || 'Failed to update status'),
  });
}

export function useLogInteraction() {
  return useMutation({
    mutationFn: async ({ id, data }) => investorsApi.createInteraction(id, data),
    onSuccess: (_r, vars) => {
      queryClient.invalidateQueries({ queryKey: ['investors', 'interactions', vars?.id] });
      queryClient.invalidateQueries({ queryKey: ['investors', 'detail', vars?.id] });
      toast.success('Interaction logged');
    },
    onError: (e) => toast.error(e?.response?.data?.detail || e?.message || 'Failed to log interaction'),
  });
}

export function useDeleteInteraction() {
  return useMutation({
    mutationFn: async ({ id, interactionId }) => investorsApi.removeInteraction(id, interactionId),
    onSuccess: (_r, vars) => {
      queryClient.invalidateQueries({ queryKey: ['investors', 'interactions', vars?.id] });
    },
    onError: (e) => toast.error(e?.response?.data?.detail || e?.message || 'Failed to remove interaction'),
  });
}

export function useSaveDocument() {
  return useMutation({
    mutationFn: async ({ id, data }) => investorsApi.createDocument(id, data),
    onSuccess: (_r, vars) => {
      queryClient.invalidateQueries({ queryKey: ['investors', 'documents', vars?.id] });
      toast.success('Document added');
    },
    onError: (e) => toast.error(e?.response?.data?.detail || e?.message || 'Failed to add document'),
  });
}

export function useDeleteDocument() {
  return useMutation({
    mutationFn: async ({ id, documentId }) => investorsApi.removeDocument(id, documentId),
    onSuccess: (_r, vars) => {
      queryClient.invalidateQueries({ queryKey: ['investors', 'documents', vars?.id] });
      toast.success('Document removed');
    },
    onError: (e) => toast.error(e?.response?.data?.detail || e?.message || 'Failed to remove document'),
  });
}

// AI-drafted outreach email. Not cached — each call produces a fresh draft.
export function useGenerateInvestorEmail() {
  return useMutation({
    mutationFn: async ({ id, data }) => investorsApi.generateEmail(id, data),
    onError: (e) => toast.error(e?.response?.data?.detail || e?.message || 'Failed to generate email'),
  });
}
