import { useQuery, useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { smtpApi, queryClient } from '../api/client';

function errMsg(error, fallback) {
  return error?.response?.data?.detail || error?.message || fallback;
}

const invalidate = () => {
  queryClient.invalidateQueries({ queryKey: ['smtp-accounts'] });
  // SMTP shares the primary-sender flag with Gmail, so refresh that view too.
  queryClient.invalidateQueries({ queryKey: ['gmail-status'] });
};

// All configured SMTP sender accounts.
export function useSmtpAccounts() {
  return useQuery({
    queryKey: ['smtp-accounts'],
    queryFn: async () => await smtpApi.accounts(),
    staleTime: 10000,
  });
}

export function useAddSmtp() {
  return useMutation({
    mutationFn: async (payload) => await smtpApi.add(payload),
    onSuccess: (acct) => {
      invalidate();
      toast.success(`${acct.email} connected`);
    },
    onError: (e) => toast.error(errMsg(e, 'Could not add SMTP account')),
  });
}

export function useUpdateSmtp() {
  return useMutation({
    mutationFn: async ({ id, payload }) => await smtpApi.update(id, payload),
    onSuccess: (acct) => {
      invalidate();
      toast.success(`${acct.email} updated`);
    },
    onError: (e) => toast.error(errMsg(e, 'Could not update SMTP account')),
  });
}

export function useDeleteSmtp() {
  return useMutation({
    mutationFn: async (id) => await smtpApi.remove(id),
    onSuccess: () => {
      invalidate();
      toast.success('SMTP account removed');
    },
    onError: (e) => toast.error(errMsg(e, 'Could not remove account')),
  });
}

export function useSetActiveSmtp() {
  return useMutation({
    mutationFn: async (id) => await smtpApi.setActive(id),
    onSuccess: (acct) => {
      invalidate();
      toast.success(`Now sending as ${acct.email}`);
    },
    onError: (e) => toast.error(errMsg(e, 'Failed to set primary account')),
  });
}

export function useToggleSmtpSending() {
  return useMutation({
    mutationFn: async ({ id, enabled }) => await smtpApi.toggleSending(id, enabled),
    onSuccess: (acct) => {
      invalidate();
      toast.success(
        acct.sending_enabled
          ? `${acct.email} added to sending rotation`
          : `${acct.email} removed from rotation`
      );
    },
    onError: (e) => toast.error(errMsg(e, 'Failed to toggle sending')),
  });
}

// Send a test email. `kind` is 'smtp' or 'gmail' so the same hook serves both.
export function useTestSend() {
  return useMutation({
    mutationFn: async ({ kind, id, toEmail }) => {
      const api = kind === 'gmail'
        ? (await import('../api/client')).gmailApi
        : smtpApi;
      return await api.testSend(id, toEmail);
    },
    onSuccess: (res) => {
      invalidate();
      if (res?.status === 'sent') {
        toast.success(`Test email sent from ${res.sender}`);
      } else {
        toast.error(res?.detail || 'Test send failed');
      }
    },
    onError: (e) => toast.error(errMsg(e, 'Test send failed')),
  });
}
