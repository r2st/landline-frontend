import { useQuery, useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { gmailApi, queryClient } from '../api/client';

function errMsg(error, fallback) {
  return error?.response?.data?.detail || error?.message || fallback;
}

// Connection status: configured / connected / active account / all accounts.
export function useGmailStatus() {
  return useQuery({
    queryKey: ['gmail-status'],
    queryFn: async () => await gmailApi.status(),
    staleTime: 10000,
  });
}

// Open the Google consent screen in a popup and resolve once the backend
// callback posts back (or the popup closes). Returns the result message.
function openOAuthPopup(authorizationUrl) {
  return new Promise((resolve, reject) => {
    const w = 520;
    const h = 640;
    const left = window.screenX + Math.max(0, (window.outerWidth - w) / 2);
    const top = window.screenY + Math.max(0, (window.outerHeight - h) / 2);
    const popup = window.open(
      authorizationUrl,
      'landline-gmail-oauth',
      `width=${w},height=${h},left=${left},top=${top}`,
    );
    if (!popup) {
      reject(new Error('Popup blocked — allow popups for this site and try again.'));
      return;
    }

    let settled = false;
    const finish = (fn, arg) => {
      if (settled) return;
      settled = true;
      window.removeEventListener('message', onMessage);
      clearInterval(poll);
      fn(arg);
    };

    const onMessage = (event) => {
      const data = event.data;
      if (!data || data.source !== 'landline-gmail-oauth') return;
      if (data.status === 'connected') {
        finish(resolve, data.message || 'Gmail connected');
      } else {
        finish(reject, new Error(data.message || 'Connection failed'));
      }
    };
    window.addEventListener('message', onMessage);

    // Fallback: if the user closes the popup without completing, resolve so we
    // refetch status (the connection may still have succeeded).
    const poll = setInterval(() => {
      if (popup.closed) finish(resolve, null);
    }, 600);
  });
}

export function useConnectGmail() {
  return useMutation({
    mutationFn: async () => {
      const { authorization_url } = await gmailApi.authorize();
      return await openOAuthPopup(authorization_url);
    },
    onSuccess: (message) => {
      queryClient.invalidateQueries({ queryKey: ['gmail-status'] });
      if (message) toast.success(message);
    },
    onError: (e) => toast.error(errMsg(e, 'Could not connect Gmail')),
  });
}

export function useSetActiveGmail() {
  return useMutation({
    mutationFn: async (id) => await gmailApi.setActive(id),
    onSuccess: (acct) => {
      queryClient.invalidateQueries({ queryKey: ['gmail-status'] });
      toast.success(`Now sending as ${acct.email}`);
    },
    onError: (e) => toast.error(errMsg(e, 'Failed to set active account')),
  });
}

export function useDisconnectGmail() {
  return useMutation({
    mutationFn: async (id) => await gmailApi.disconnect(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['gmail-status'] });
      toast.success('Gmail account disconnected');
    },
    onError: (e) => toast.error(errMsg(e, 'Failed to disconnect')),
  });
}

export function useToggleSending() {
  return useMutation({
    mutationFn: async ({ id, enabled }) => await gmailApi.toggleSending(id, enabled),
    onSuccess: (acct) => {
      queryClient.invalidateQueries({ queryKey: ['gmail-status'] });
      toast.success(
        acct.sending_enabled
          ? `${acct.email} added to sending rotation`
          : `${acct.email} removed from rotation`
      );
    },
    onError: (e) => toast.error(errMsg(e, 'Failed to toggle sending')),
  });
}
