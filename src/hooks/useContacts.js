import { useQuery } from '@tanstack/react-query';
import { contactsApi, companiesApi } from '../api/client';

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
