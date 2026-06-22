import { useQuery } from '@tanstack/react-query';
import { emailApi } from '../api/client';

function toArray(data) {
  const items = data?.items || data;
  return Array.isArray(items) ? items : [];
}

/**
 * Fetch a wide window of email-send history. The endpoint only filters by a
 * single contact_id, so for company-level views we pull recent sends once and
 * filter client-side against the company's contacts.
 */
export function useEmailSends(limit = 500) {
  return useQuery({
    queryKey: ['email-sends', limit],
    queryFn: async () => toArray(await emailApi.getSends({ limit })),
    staleTime: 60000,
    retry: false,
  });
}
