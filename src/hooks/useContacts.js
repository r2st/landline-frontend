import { useQuery, useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { contactsApi, companiesApi, queryClient } from '../api/client';

// Normalize a list response (backend returns {items,total} for contacts, an array for companies).
function normalize(data) {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.items)) return data.items;
  return [];
}

/**
 * Fetch contacts enriched with their company's name, industry, and city so the
 * compose view can display and merge them.
 */
export function useContacts() {
  return useQuery({
    queryKey: ['contacts', 'all'],
    queryFn: async () => {
      const [contactsRaw, companiesRaw] = await Promise.all([
        contactsApi.getAll({ page_size: 200 }),
        companiesApi.getAll({}),
      ]);
      const contacts = normalize(contactsRaw);
      const companies = normalize(companiesRaw);
      const byId = Object.fromEntries(companies.map((c) => [String(c.id), c]));
      return contacts.map((ct) => {
        const co = byId[String(ct.company_id)] || {};
        return {
          ...ct,
          company: co.name || '',
          industry_segment: co.industry_segment || co.industry || '',
          city: co.city || '',
        };
      });
    },
  });
}

/** Fetch the contacts that belong to a single company. */
export function useCompanyContacts(companyId) {
  return useQuery({
    queryKey: ['contacts', 'company', companyId],
    queryFn: async () => normalize(await contactsApi.getByCompany(companyId)),
    enabled: !!companyId,
  });
}

function invalidateContacts(companyId) {
  queryClient.invalidateQueries({ queryKey: ['contacts'] });
  if (companyId) {
    queryClient.invalidateQueries({ queryKey: ['contacts', 'company', companyId] });
    queryClient.invalidateQueries({ queryKey: ['company', companyId] });
  }
  queryClient.invalidateQueries({ queryKey: ['companies'] });
}

export function useCreateContact() {
  return useMutation({
    mutationFn: async (data) => await contactsApi.create({ source: 'manual', ...data }),
    onSuccess: (result) => {
      invalidateContacts(result?.company_id);
      toast.success('Contact added');
    },
    onError: (e) => toast.error(e?.response?.data?.detail || e?.message || 'Failed to add contact'),
  });
}

export function useUpdateContact() {
  return useMutation({
    mutationFn: async ({ id, data }) => await contactsApi.update(id, data),
    onSuccess: (result) => {
      invalidateContacts(result?.company_id);
      toast.success('Contact updated');
    },
    onError: (e) => toast.error(e?.response?.data?.detail || e?.message || 'Failed to update contact'),
  });
}

export function useDeleteContact() {
  return useMutation({
    mutationFn: async ({ id }) => await contactsApi.remove(id),
    onSuccess: (_result, variables) => {
      invalidateContacts(variables?.companyId);
      toast.success('Contact removed');
    },
    onError: (e) => toast.error(e?.response?.data?.detail || e?.message || 'Failed to remove contact'),
  });
}

export function useQuickAddContact() {
  return useMutation({
    mutationFn: async (data) => await contactsApi.quickAdd(data),
    onSuccess: (result) => {
      invalidateContacts(result?.contact?.company_id);
      const name = [result?.contact?.first_name, result?.contact?.last_name].filter(Boolean).join(' ') || result?.contact?.email;
      toast.success(`Contact "${name}" added${result?.company_created ? ` (new company: ${result.company_name})` : ''}`);
    },
    onError: (e) => toast.error(e?.response?.data?.detail || e?.message || 'Failed to add contact'),
  });
}
