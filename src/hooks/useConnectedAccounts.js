import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { gmailApi, smtpApi } from '../api/client';
import { mergeAccounts } from '../lib/inboxAccounts';

// The user's connected sending identities (Gmail + SMTP), merged into one
// address-sorted list for the inbox account filter. Each source fails soft:
// if one endpoint 404s or errors, the other still populates the dropdown.
export function useConnectedAccounts() {
  const gmail = useQuery({
    queryKey: ['gmail-accounts'],
    queryFn: () => gmailApi.accounts(),
    staleTime: 30000,
  });
  const smtp = useQuery({
    queryKey: ['smtp-accounts'],
    queryFn: () => smtpApi.accounts(),
    staleTime: 30000,
  });

  const accounts = useMemo(
    () => mergeAccounts({ gmail: gmail.data, smtp: smtp.data }),
    [gmail.data, smtp.data]
  );

  return {
    accounts,
    isLoading: gmail.isLoading || smtp.isLoading,
    // Only a hard failure of *both* sources is worth surfacing; a single
    // missing provider still leaves a usable filter.
    isError: gmail.isError && smtp.isError,
  };
}
