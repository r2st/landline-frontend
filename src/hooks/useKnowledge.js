import { useQuery, useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { knowledgeApi, queryClient } from '../api/client';

// Backend list endpoints may return either an array or { items, total }.
function asList(data) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.items)) return data.items;
  if (data && Array.isArray(data.contacts)) return data.contacts;
  return [];
}

// ─── Industry contacts ────────────────────────────────────────────────────────
export function useKnowledgeContacts(params = {}) {
  return useQuery({
    queryKey: ['knowledge', 'contacts', params],
    queryFn: async () => {
      try {
        const data = await knowledgeApi.getContacts(params);
        return { items: asList(data), total: data?.total ?? asList(data).length };
      } catch {
        return { items: [], total: 0 };
      }
    },
    staleTime: 60000,
  });
}

export function useIndustryCounts() {
  return useQuery({
    queryKey: ['knowledge', 'industry-counts'],
    queryFn: async () => {
      try {
        const data = await knowledgeApi.getIndustryCounts();
        // Accept [{ industry, count }] or { industry: count }.
        if (Array.isArray(data)) return data;
        if (data && typeof data === 'object') {
          return Object.entries(data).map(([industry, count]) => ({ industry, count }));
        }
        return [];
      } catch {
        return [];
      }
    },
    staleTime: 60000,
  });
}

function invalidateKnowledgeContacts() {
  queryClient.invalidateQueries({ queryKey: ['knowledge', 'contacts'] });
  queryClient.invalidateQueries({ queryKey: ['knowledge', 'industry-counts'] });
}

export function useSaveKnowledgeContact() {
  return useMutation({
    mutationFn: async ({ id, data }) =>
      id ? knowledgeApi.updateContact(id, data) : knowledgeApi.createContact(data),
    onSuccess: (_r, vars) => {
      invalidateKnowledgeContacts();
      toast.success(vars?.id ? 'Contact updated' : 'Contact added');
    },
    onError: (e) => toast.error(e?.response?.data?.detail || e?.message || 'Failed to save contact'),
  });
}

export function useDeleteKnowledgeContact() {
  return useMutation({
    mutationFn: async (id) => knowledgeApi.deleteContact(id),
    onSuccess: () => {
      invalidateKnowledgeContacts();
      toast.success('Contact removed');
    },
    onError: (e) => toast.error(e?.response?.data?.detail || e?.message || 'Failed to remove contact'),
  });
}

// ─── Documents (guidelines / strategy) ────────────────────────────────────────
export function useKnowledgeDoc(kind) {
  // kind: 'guidelines' | 'strategy'
  return useQuery({
    queryKey: ['knowledge', 'doc', kind],
    queryFn: async () => {
      try {
        if (kind === 'guidelines') return await knowledgeApi.getGuidelines();
        if (kind === 'strategy') return await knowledgeApi.getStrategy();
        return await knowledgeApi.getDocument(kind);
      } catch {
        return null;
      }
    },
    staleTime: 300000,
  });
}

// ─── Industry verticals ───────────────────────────────────────────────────────
export function useIndustries() {
  return useQuery({
    queryKey: ['knowledge', 'industries'],
    queryFn: async () => {
      try {
        return asList(await knowledgeApi.getIndustries());
      } catch {
        return [];
      }
    },
    staleTime: 300000,
  });
}

// ─── AI sales-guidelines config ───────────────────────────────────────────────
export function useAiGuidelines() {
  return useQuery({
    queryKey: ['knowledge', 'ai-guidelines'],
    queryFn: async () => {
      try {
        return await knowledgeApi.getAiGuidelines();
      } catch {
        return null;
      }
    },
    staleTime: 300000,
  });
}
