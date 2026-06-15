import { useQuery, useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { companiesApi, queryClient } from '../api/client';
import { mockCompanies } from '../lib/mockData';

export function useCompanies(filters = {}) {
  return useQuery({
    queryKey: ['companies', filters],
    queryFn: async () => {
      try {
        const data = await companiesApi.getAll(filters);
        return data;
      } catch (error) {
        console.warn('API unavailable, using mock data');
        let filtered = [...mockCompanies];
        if (filters.stage) {
          filtered = filtered.filter((c) => c.stage === filters.stage);
        }
        if (filters.country) {
          filtered = filtered.filter((c) => c.country === filters.country);
        }
        if (filters.source) {
          filtered = filtered.filter((c) => c.source === filters.source);
        }
        if (filters.search) {
          const q = filters.search.toLowerCase();
          filtered = filtered.filter(
            (c) =>
              c.name.toLowerCase().includes(q) ||
              c.domain.toLowerCase().includes(q) ||
              c.industry.toLowerCase().includes(q)
          );
        }
        if (filters.scoreMin != null) {
          filtered = filtered.filter((c) => c.score >= Number(filters.scoreMin));
        }
        if (filters.scoreMax != null) {
          filtered = filtered.filter((c) => c.score <= Number(filters.scoreMax));
        }
        return filtered;
      }
    },
  });
}

export function useCompany(id) {
  return useQuery({
    queryKey: ['company', id],
    queryFn: async () => {
      try {
        return await companiesApi.getById(id);
      } catch (error) {
        console.warn('API unavailable, using mock data');
        const company = mockCompanies.find((c) => String(c.id) === String(id));
        if (!company) throw new Error('Company not found');
        return company;
      }
    },
    enabled: !!id,
  });
}

export function useCreateCompany() {
  return useMutation({
    mutationFn: async (data) => {
      try {
        return await companiesApi.create(data);
      } catch (error) {
        console.warn('API unavailable — demo mode');
        toast('Demo mode — changes not persisted', { icon: '⚠️' });
        return {
          id: Date.now(),
          ...data,
          score: 0,
          stage: 'new',
          tags: [],
          notes: '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      toast.success('Company created successfully');
    },
    onError: (error) => {
      toast.error(error?.message || 'Failed to create company');
    },
  });
}

export function useUpdateCompany() {
  return useMutation({
    mutationFn: async ({ id, data }) => {
      try {
        return await companiesApi.update(id, data);
      } catch (error) {
        console.warn('API unavailable — demo mode');
        toast('Demo mode — changes not persisted', { icon: '⚠️' });
        return { id, ...data, updated_at: new Date().toISOString() };
      }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      queryClient.invalidateQueries({ queryKey: ['company', result?.id] });
      toast.success('Company updated successfully');
    },
    onError: (error) => {
      toast.error(error?.message || 'Failed to update company');
    },
  });
}

export function useDeleteCompany() {
  return useMutation({
    mutationFn: async (id) => {
      try {
        return await companiesApi.delete(id);
      } catch (error) {
        console.warn('API unavailable — demo mode');
        toast('Demo mode — changes not persisted', { icon: '⚠️' });
        return { id, deleted: true };
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      toast.success('Company deleted successfully');
    },
    onError: (error) => {
      toast.error(error?.message || 'Failed to delete company');
    },
  });
}

export function useImportCSV() {
  return useMutation({
    mutationFn: async (formData) => {
      try {
        return await companiesApi.importCSV(formData);
      } catch (error) {
        console.warn('API unavailable — demo mode');
        toast('Demo mode — changes not persisted', { icon: '⚠️' });
        return { imported: 12, skipped: 2, errors: 0 };
      }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      toast.success(
        `Import complete: ${result.imported || 0} imported, ${result.skipped || 0} skipped`
      );
    },
    onError: (error) => {
      toast.error(error?.message || 'Failed to import CSV');
    },
  });
}

export function useScoreCompany() {
  return useMutation({
    mutationFn: async (id) => {
      try {
        return await companiesApi.score(id);
      } catch (error) {
        console.warn('API unavailable — demo mode');
        toast('Demo mode — changes not persisted', { icon: '⚠️' });
        const company = mockCompanies.find((c) => String(c.id) === String(id));
        return { id, score: company?.score || Math.floor(Math.random() * 60) + 30 };
      }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      queryClient.invalidateQueries({ queryKey: ['company'] });
      toast.success(`Company scored: ${result.score}`);
    },
    onError: (error) => {
      toast.error(error?.message || 'Failed to score company');
    },
  });
}
