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

const OAUTH_SOURCE = 'landline-gmail-oauth';
const STATUS_POLL_MS = 2000;
const STATUS_POLL_TIMEOUT_MS = 5 * 60 * 1000;

// Origins the callback page can be served from: the SPA's own (prod, where
// /api is proxied same-origin) or a separate API host (VITE_API_URL in dev).
function allowedOrigins() {
  const origins = [window.location.origin];
  try {
    if (import.meta.env.VITE_API_URL) origins.push(new URL(import.meta.env.VITE_API_URL).origin);
  } catch {
    // ignore a malformed VITE_API_URL
  }
  return origins;
}

// A fingerprint of the connected accounts, so we can tell when a connect
// (or reconnect) has landed without the popup telling us.
function accountsSignature(status) {
  return (status?.accounts || [])
    .map((a) => `${a.id}:${a.status}:${a.connected_at}`)
    .sort()
    .join('|');
}

// Open the Google consent screen in a popup and resolve once the connection
// lands. Returns the result message (or null if we only saw it via polling).
//
// The SPA is served with `Cross-Origin-Opener-Policy: same-origin`, so as soon
// as the popup navigates to accounts.google.com the opener link is severed:
// the callback page's `window.opener` is null and `popup.closed` reads true
// here right away. So we listen on three channels — window.postMessage (when
// the opener survives), a same-origin BroadcastChannel, and a localStorage
// `storage` event (the callback page is served same-origin under /api) — and
// also poll gmail/status until the account list changes.
function openOAuthPopup(authorizationUrl) {
  return new Promise((resolve, reject) => {
    const w = 520;
    const h = 640;
    const left = window.screenX + Math.max(0, (window.outerWidth - w) / 2);
    const top = window.screenY + Math.max(0, (window.outerHeight - h) / 2);
    const popup = window.open(
      authorizationUrl,
      OAUTH_SOURCE,
      `width=${w},height=${h},left=${left},top=${top}`,
    );
    if (!popup) {
      reject(new Error('Popup blocked — allow popups for this site and try again.'));
      return;
    }

    // If status isn't cached yet, the first poll establishes the baseline.
    const cached = queryClient.getQueryData(['gmail-status']);
    let baseline = cached ? accountsSignature(cached) : null;
    const startedAt = Date.now();
    let settled = false;
    let channel = null;
    let pollTimer = null;
    let polling = false;
    // Without COOP severing the handle, `popup.closed` is trustworthy: if we
    // ever saw it open and it later reads closed, the user closed it (or the
    // callback did) — check status once more and stop waiting.
    let sawOpen = false;

    const cleanup = () => {
      window.removeEventListener('message', onMessage);
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('focus', checkStatus);
      if (channel) channel.close();
      clearTimeout(pollTimer);
    };
    const finish = (fn, arg) => {
      if (settled) return;
      settled = true;
      cleanup();
      fn(arg);
    };

    const handlePayload = (data) => {
      if (!data || data.source !== OAUTH_SOURCE) return;
      if (data.status === 'connected') {
        finish(resolve, data.message || 'Gmail connected');
      } else {
        finish(reject, new Error(data.message || 'Connection failed'));
      }
    };

    const onMessage = (event) => {
      if (!allowedOrigins().includes(event.origin)) return;
      handlePayload(event.data);
    };
    const onStorage = (event) => {
      if (event.key !== OAUTH_SOURCE || !event.newValue) return;
      try {
        handlePayload(JSON.parse(event.newValue));
      } catch {
        // ignore malformed values
      }
    };

    // Fallback: poll status until the account list changes or we time out.
    async function checkStatus() {
      if (settled || polling) return;
      polling = true;
      try {
        const status = await gmailApi.status();
        queryClient.setQueryData(['gmail-status'], status);
        if (baseline === null) {
          baseline = accountsSignature(status);
        } else if (accountsSignature(status) !== baseline) {
          finish(resolve, 'Gmail connected');
          return;
        }
      } catch {
        // transient — keep polling
      } finally {
        polling = false;
      }
      const closedByUser = sawOpen && popup.closed;
      if (!popup.closed) sawOpen = true;
      if (closedByUser || Date.now() - startedAt > STATUS_POLL_TIMEOUT_MS) {
        finish(resolve, null);
      }
    }
    const schedulePoll = () => {
      if (settled) return;
      pollTimer = setTimeout(async () => {
        await checkStatus();
        schedulePoll();
      }, STATUS_POLL_MS);
    };

    window.addEventListener('message', onMessage);
    window.addEventListener('storage', onStorage);
    window.addEventListener('focus', checkStatus);
    if (typeof BroadcastChannel !== 'undefined') {
      channel = new BroadcastChannel(OAUTH_SOURCE);
      channel.onmessage = (event) => handlePayload(event.data);
    }
    schedulePoll();
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
