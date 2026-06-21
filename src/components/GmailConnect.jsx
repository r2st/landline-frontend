import { Mail, Check, Star, Plus, Trash2, AlertTriangle, ShieldCheck, ToggleLeft, ToggleRight, RefreshCw } from 'lucide-react';
import {
  useGmailStatus,
  useConnectGmail,
  useSetActiveGmail,
  useDisconnectGmail,
  useToggleSending,
} from '../hooks/useGmail';

function AccountRow({ account, onSetActive, onDisconnect, onToggleSending, busy }) {
  const errored = account.status === 'error';
  const lastUsed = account.last_used_at
    ? new Date(account.last_used_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })
    : 'Never';

  return (
    <div className="rounded-lg border border-gray-200 px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-blue-50">
            <Mail className="h-4 w-4 text-blue-600" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="truncate text-sm font-medium text-gray-900">{account.email}</span>
              {account.is_active && !errored && (
                <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                  <Star className="h-3 w-3 fill-green-500 text-green-500" />
                  Primary
                </span>
              )}
              {errored && (
                <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                  <AlertTriangle className="h-3 w-3" />
                  Reconnect
                </span>
              )}
            </div>
            {account.display_name && (
              <p className="truncate text-xs text-gray-500">{account.display_name}</p>
            )}
          </div>
        </div>
        <div className="flex flex-shrink-0 items-center gap-2">
          {!account.is_active && !errored && (
            <button
              type="button"
              disabled={busy}
              onClick={() => onSetActive(account.id)}
              className="rounded-md border border-gray-300 px-2.5 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Make primary
            </button>
          )}
          <button
            type="button"
            disabled={busy}
            aria-label={`Disconnect ${account.email}`}
            title={`Disconnect ${account.email}`}
            onClick={() => {
              if (window.confirm(`Disconnect ${account.email}? Outreach will no longer send from this address.`)) {
                onDisconnect(account.id);
              }
            }}
            className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Sending toggle + stats row */}
      <div className="mt-2 flex items-center justify-between border-t border-gray-100 pt-2">
        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={busy || errored}
            onClick={() => onToggleSending(account.id, !account.sending_enabled)}
            className="flex items-center gap-1.5 text-xs disabled:opacity-50"
            title={account.sending_enabled ? 'Disable sending from this account' : 'Enable sending from this account'}
          >
            {account.sending_enabled ? (
              <ToggleRight className="h-5 w-5 text-green-500" />
            ) : (
              <ToggleLeft className="h-5 w-5 text-gray-400" />
            )}
            <span className={account.sending_enabled ? 'font-medium text-green-700' : 'text-gray-500'}>
              {account.sending_enabled ? 'Sending enabled' : 'Sending disabled'}
            </span>
          </button>
        </div>
        <div className="flex items-center gap-4 text-xs text-gray-400">
          <span>Sent today: {account.daily_send_count || 0}</span>
          <span>Last used: {lastUsed}</span>
        </div>
      </div>
    </div>
  );
}

export default function GmailConnect() {
  const { data: status, isLoading } = useGmailStatus();
  const connect = useConnectGmail();
  const setActive = useSetActiveGmail();
  const disconnect = useDisconnectGmail();
  const toggleSending = useToggleSending();

  const accounts = status?.accounts || [];
  const connected = status?.connected;
  const configured = status?.configured;
  const sendingCount = status?.sending_enabled_count || 0;
  const busy = connect.isPending || setActive.isPending || disconnect.isPending || toggleSending.isPending;

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
            <Mail className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Email Accounts</h2>
            <p className="text-sm text-gray-500">
              Connect multiple Gmail accounts for outreach rotation
            </p>
          </div>
        </div>
        {!isLoading && (
          <div className="flex items-center gap-3">
            {sendingCount > 1 && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                <RefreshCw className="h-3 w-3" />
                Rotating {sendingCount} accounts
              </span>
            )}
            <span
              className={`inline-flex items-center gap-1.5 text-sm font-medium ${
                connected ? 'text-green-600' : 'text-gray-500'
              }`}
            >
              <span className={`h-2.5 w-2.5 rounded-full ${connected ? 'bg-green-500' : 'bg-gray-300'}`} />
              {connected ? `${accounts.length} connected` : 'Not connected'}
            </span>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-8">
          <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-blue-600" />
        </div>
      ) : (
        <div className="space-y-4">
          {/* Info banner */}
          <div className="flex items-start gap-2 rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-700">
            <ShieldCheck className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <p>
              {sendingCount > 1 ? (
                <>
                  Emails are automatically rotated across your {sendingCount} sending-enabled accounts
                  using round-robin to distribute volume and improve deliverability.
                </>
              ) : connected ? (
                <>
                  Sending through your connected Gmail uses Google's authentication (SPF/DKIM/DMARC).
                  Connect more accounts to enable automatic sender rotation.
                </>
              ) : (
                <>
                  Connect a Gmail account so outreach lands in the inbox.
                  Until connected, email is sent from{' '}
                  <span className="font-medium">{status?.fallback_sender}</span>.
                </>
              )}
            </p>
          </div>

          {!configured && (
            <div className="flex items-start gap-2 rounded-lg bg-yellow-50 px-4 py-3 text-sm text-yellow-700">
              <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <p>
                Google OAuth isn't configured on the server yet. Set <code>GOOGLE_CLIENT_ID</code> and{' '}
                <code>GOOGLE_CLIENT_SECRET</code>.
              </p>
            </div>
          )}

          {accounts.length > 0 && (
            <div className="space-y-2">
              {accounts.map((acct) => (
                <AccountRow
                  key={acct.id}
                  account={acct}
                  busy={busy}
                  onSetActive={setActive.mutate}
                  onDisconnect={disconnect.mutate}
                  onToggleSending={(id, enabled) => toggleSending.mutate({ id, enabled })}
                />
              ))}
            </div>
          )}

          <button
            type="button"
            disabled={busy || !configured}
            onClick={() => connect.mutate()}
            title={!configured ? 'Google OAuth not configured on the server' : undefined}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {connected ? <Plus className="h-4 w-4" /> : <Check className="h-4 w-4" />}
            {connect.isPending
              ? 'Connecting…'
              : connected
              ? 'Connect another account'
              : 'Connect Gmail'}
          </button>
        </div>
      )}
    </div>
  );
}
