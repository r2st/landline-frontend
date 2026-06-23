import { useQuery, useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { companiesApi, queryClient } from '../api/client';
import { normalizeCompanies, normalizeCompany, companyFormToApi } from '../lib/normalize';

// Translate UI filter keys to the backend's company list query params.
// Score/source filtering happens client-side (the list endpoint doesn't support them).
function toServerParams(filters = {}) {
  const params = {};
  if (filters.search) params.q = filters.search;
  if (filters.stage) params.stage = filters.stage;
  if (filters.country) params.country = filters.country;
  if (filters.industry_segment) params.industry_segment = filters.industry_segment;
  if (filters.enriched) params.enriched = filters.enriched;
  if (filters.has_contacts) params.has_contacts = true;
  params.page = filters.page || 1;
  params.page_size = filters.page_size || 50;
  return params;
}

export function useCompanies(filters = {}) {
  return useQuery({
    queryKey: ['companies', filters],
    queryFn: async () => {
      const data = await companiesApi.getAll(toServerParams(filters));
      const items = data.items || data;
      return { items: normalizeCompanies(items), total: data.total || items.length, page: data.page || 1, pageSize: data.page_size || 50 };
    },
  });
}

export function useCompany(id) {
  return useQuery({
    queryKey: ['company', id],
    queryFn: async () => normalizeCompany(await companiesApi.getById(id)),
    enabled: !!id,
  });
}

export function useCompanyScores(id) {
  return useQuery({
    queryKey: ['company-scores', id],
    queryFn: async () => {
      const data = await companiesApi.getScores(id);
      return Array.isArray(data) ? data : [];
    },
    enabled: !!id,
  });
}

export function useCreateCompany() {
  return useMutation({
    mutationFn: async (data) => {
      return await companiesApi.create(companyFormToApi(data));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      queryClient.invalidateQueries({ queryKey: ['pipeline'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
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
      queryClient.invalidateQueries({ queryKey: ['pipeline'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      queryClient.invalidateQueries({ queryKey: ['deals'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
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
      queryClient.invalidateQueries({ queryKey: ['dashboard-metrics'] });
      const companies = result.imported_companies ?? 0;
      const contacts = result.imported_contacts ?? 0;
      toast.success(
        `Import complete: ${companies} compan${companies === 1 ? 'y' : 'ies'}, ${contacts} contact${contacts === 1 ? '' : 's'}, ${result.skipped ?? 0} skipped`
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
      queryClient.invalidateQueries({ queryKey: ['pipeline'] });
      queryClient.invalidateQueries({ queryKey: ['top-leads'] });
      toast.success(`Company scored: ${result.fit_score ?? result.score}`);
    },
    onError: (error) => {
      toast.error(error?.response?.data?.detail || error?.message || 'Failed to score company');
    },
  });
}
