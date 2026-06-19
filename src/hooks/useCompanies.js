import { useQuery, useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { companiesApi, queryClient } from '../api/client';

export function useCompanies(filters = {}) {
  return useQuery({
    queryKey: ['companies', filters],
    queryFn: async () => {
      const data = await companiesApi.getAll(filters);
      // API returns { items, total, page, page_size } — unwrap to flat array
      return data.items || data;
    },
  });
}

export function useCompany(id) {
  return useQuery({
    queryKey: ['company', id],
    queryFn: async () => {
      return await companiesApi.getById(id);
    },
    enabled: !!id,
  });
}

export function useCreateCompany() {
  return useMutation({
    mutationFn: async (data) => {
      return await companiesApi.create(data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      toast.success('Company created successfully');
    },
    onError: (error) => {
      toast.error(error?.response?.data?.detail || error?.message || 'Failed to create company');
    },
  });
}

export function useUpdateCompany() {
  return useMutation({
    mutationFn: async ({ id, data }) => {
      return await companiesApi.update(id, data);
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      queryClient.invalidateQueries({ queryKey: ['company', result?.id] });
      toast.success('Company updated successfully');
    },
    onError: (error) => {
      toast.error(error?.response?.data?.detail || error?.message || 'Failed to update company');
    },
  });
}

export function useDeleteCompany() {
  return useMutation({
    mutationFn: async (id) => {
      return await companiesApi.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      toast.success('Company deleted successfully');
    },
    onError: (error) => {
      toast.error(error?.response?.data?.detail || error?.message || 'Failed to delete company');
    },
  });
}

export function useImportCSV() {
  return useMutation({
    mutationFn: async (formData) => {
      return await companiesApi.importCSV(formData);
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      toast.success(
        `Import complete: ${result.imported || 0} imported, ${result.skipped || 0} skipped`
      );
    },
    onError: (error) => {
      toast.error(error?.response?.data?.detail || error?.message || 'Failed to import CSV');
    },
  });
}

export function useScoreCompany() {
  return useMutation({
    mutationFn: async (id) => {
      return await companiesApi.score(id);
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      queryClient.invalidateQueries({ queryKey: ['company'] });
      toast.success(`Company scored: ${result.fit_score || result.score}`);
    },
    onError: (error) => {
      toast.error(error?.response?.data?.detail || error?.message || 'Failed to score company');
    },
  });
}
