import { useState, useEffect, useCallback } from 'react';
import { Key, Eye, EyeOff, Plus, Copy, XCircle, Trash2 } from 'lucide-react';
import ConfirmDialog from './ConfirmDialog';
import { settingsApi, apiKeysApi } from '../api/client';
import toast from 'react-hot-toast';

// Read scopes are pre-selected so a key does something useful out of the box.
// The backend grants nothing beyond a key's scopes, so a key minted with an
// empty list authenticates and then gets 403 on every public endpoint.
const DEFAULT_SCOPES = ['contacts:read', 'companies:read', 'deals:read', 'sequences:read'];

function LoadingRows({ rows = 2 }) {
  return (
    <div className="animate-pulse space-y-3">
      <div className="h-4 w-48 rounded bg-gray-200" />
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="h-10 rounded bg-gray-200" />
      ))}
    </div>
  );
}

function LlmKeySection() {
  const [llmKey, setLlmKey] = useState({ provider: 'gemini', key_hint: '', has_key: false });
  const [newKey, setNewKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [removeConfirm, setRemoveConfirm] = useState(false);

  useEffect(() => {
    settingsApi.getLlmKey()
      .then(setLlmKey)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    if (!newKey.trim()) return;
    setSaving(true);
    try {
      setLlmKey(await settingsApi.setLlmKey(newKey.trim()));
      setNewKey('');
      setShowKey(false);
      toast.success('Gemini API key saved');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to save key');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async () => {
    setRemoveConfirm(false);
    try {
      await settingsApi.deleteLlmKey();
      setLlmKey({ provider: 'gemini', key_hint: '', has_key: false });
      toast.success('Gemini API key removed — using platform default');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to remove key');
    }
  };

  if (loading) return <LoadingRows rows={1} />;

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        Provide your own Gemini API key so AI features (tactics, scoring, news analysis, call scripts) use your key instead of the platform default.
      </p>

      {llmKey.has_key && (
        <div className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3">
          <div>
            <p className="text-sm font-medium text-gray-700">Current key</p>
            <p className="font-mono text-sm text-gray-500">{llmKey.key_hint}</p>
          </div>
          <button
            type="button"
            onClick={() => setRemoveConfirm(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Remove
          </button>
        </div>
      )}

      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type={showKey ? 'text' : 'password'}
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            placeholder={llmKey.has_key ? 'Replace with a new key...' : 'Enter your Gemini API key'}
            autoComplete="off"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 pr-10 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            type="button"
            onClick={() => setShowKey(!showKey)}
            aria-label={showKey ? 'Hide key' : 'Show key'}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !newKey.trim()}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>

      <ConfirmDialog
        open={removeConfirm}
        title="Remove Gemini API Key"
        message="AI features will fall back to the platform default key."
        confirmLabel="Remove Key"
        variant="danger"
        onConfirm={handleRemove}
        onCancel={() => setRemoveConfirm(false)}
      />
    </div>
  );
}

function ProgrammaticKeysSection() {
  const [keys, setKeys] = useState([]);
  const [allScopes, setAllScopes] = useState([]);
  const [selectedScopes, setSelectedScopes] = useState(DEFAULT_SCOPES);
  const [loading, setLoading] = useState(true);
  const [newKeyName, setNewKeyName] = useState('');
  const [creating, setCreating] = useState(false);
  const [createdKey, setCreatedKey] = useState(null);
  const [revokeTarget, setRevokeTarget] = useState(null);

  const loadKeys = useCallback(
    () => apiKeysApi.list()
      .then(setKeys)
      .catch(() => {})
      .finally(() => setLoading(false)),
    []
  );

  useEffect(() => {
    loadKeys();
    apiKeysApi.scopes()
      .then((data) => setAllScopes(data.scopes || []))
      .catch(() => {});
  }, [loadKeys]);

  const toggleScope = (scope) => {
    setSelectedScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]
    );
  };

  const canCreate = newKeyName.trim() && selectedScopes.length > 0 && !creating;

  const handleCreate = async () => {
    if (!canCreate) return;
    setCreating(true);
    try {
      const data = await apiKeysApi.create({ name: newKeyName.trim(), scopes: selectedScopes });
      setCreatedKey(data.api_key);
      setNewKeyName('');
      await loadKeys();
      toast.success("API key created — copy it now, it won't be shown again");
    } catch (err) {
      const detail = err.response?.data?.detail;
      toast.error(typeof detail === 'string' ? detail : 'Failed to create key');
    } finally {
      setCreating(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(createdKey);
      toast.success('Copied to clipboard');
    } catch {
      toast.error('Could not copy — select the key and copy it manually');
    }
  };

  const handleRevoke = async () => {
    const id = revokeTarget;
    setRevokeTarget(null);
    if (!id) return;
    try {
      await apiKeysApi.revoke(id);
      await loadKeys();
      toast.success('API key revoked');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to revoke key');
    }
  };

  if (loading) return <LoadingRows rows={2} />;

  const activeKeys = keys.filter((k) => !k.revoked_at);
  const revokedKeys = keys.filter((k) => k.revoked_at);

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        Generate API keys to access Prospect programmatically. Keys authenticate requests to the public API at{' '}
        <code className="rounded bg-gray-100 px-1 py-0.5 text-xs">/api/v1/public/*</code>.
      </p>

      <div className="space-y-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={newKeyName}
            onChange={(e) => setNewKeyName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            placeholder="Key name (e.g. Zapier integration)"
            maxLength={120}
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            type="button"
            onClick={handleCreate}
            disabled={!canCreate}
            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            {creating ? 'Creating...' : 'Create Key'}
          </button>
        </div>

        {allScopes.length > 0 && (
          <fieldset>
            <legend className="mb-1.5 text-xs font-medium text-gray-700">Scopes</legend>
            <div className="flex flex-wrap gap-x-4 gap-y-1.5">
              {allScopes.map((scope) => (
                <label key={scope} className="inline-flex items-center gap-1.5 text-xs text-gray-700">
                  <input
                    type="checkbox"
                    checked={selectedScopes.includes(scope)}
                    onChange={() => toggleScope(scope)}
                    className="h-3.5 w-3.5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="font-mono">{scope}</span>
                </label>
              ))}
            </div>
            {selectedScopes.length === 0 && (
              <p className="mt-1 text-xs text-amber-600">Select at least one scope — a key without scopes can&apos;t call anything.</p>
            )}
          </fieldset>
        )}
      </div>

      {createdKey && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <p className="mb-2 text-sm font-medium text-green-800">
            New API key created — copy it now. It won&apos;t be shown again.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 break-all rounded border border-green-200 bg-white px-3 py-2 font-mono text-sm text-gray-900">
              {createdKey}
            </code>
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1 rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700"
            >
              <Copy className="h-4 w-4" />
              Copy
            </button>
          </div>
          <button
            type="button"
            onClick={() => setCreatedKey(null)}
            className="mt-2 text-xs text-green-700 underline hover:text-green-900"
          >
            Dismiss
          </button>
        </div>
      )}

      {activeKeys.length > 0 ? (
        <div className="divide-y divide-gray-100 rounded-lg border border-gray-200">
          {activeKeys.map((k) => (
            <div key={k.id} className="flex items-center justify-between px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-gray-900">{k.name}</p>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                  <span className="font-mono text-xs text-gray-500">{k.key_prefix}•••</span>
                  <span className="text-xs text-gray-400">
                    Created {new Date(k.created_at).toLocaleDateString()}
                  </span>
                  {k.last_used_at && (
                    <span className="text-xs text-gray-400">
                      Last used {new Date(k.last_used_at).toLocaleDateString()}
                    </span>
                  )}
                  <span className="text-xs text-gray-400">
                    {k.scopes?.length ? k.scopes.join(', ') : 'no scopes'}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRevokeTarget(k.id)}
                className="ml-3 inline-flex items-center gap-1 rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
              >
                <XCircle className="h-3.5 w-3.5" />
                Revoke
              </button>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-lg bg-gray-50 px-4 py-6 text-center text-sm text-gray-500">
          No active API keys. Create one above to get started.
        </div>
      )}

      {revokedKeys.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer text-gray-500 hover:text-gray-700">
            {revokedKeys.length} revoked key{revokedKeys.length !== 1 ? 's' : ''}
          </summary>
          <div className="mt-2 divide-y divide-gray-100 rounded-lg border border-gray-200 opacity-60">
            {revokedKeys.map((k) => (
              <div key={k.id} className="flex items-center justify-between px-4 py-2">
                <div>
                  <p className="text-sm text-gray-500 line-through">{k.name}</p>
                  <span className="font-mono text-xs text-gray-400">{k.key_prefix}•••</span>
                </div>
                <span className="text-xs text-red-500">
                  Revoked {new Date(k.revoked_at).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </details>
      )}

      <ConfirmDialog
        open={!!revokeTarget}
        title="Revoke API Key"
        message="This key will immediately stop working. Any integrations using it will lose access. This cannot be undone."
        confirmLabel="Revoke Key"
        variant="danger"
        onConfirm={handleRevoke}
        onCancel={() => setRevokeTarget(null)}
      />
    </div>
  );
}

export default function ApiKeysSettings() {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100">
          <Key className="h-5 w-5 text-indigo-600" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">API Keys</h2>
          <p className="text-sm text-gray-500">Manage your AI provider key and programmatic API keys</p>
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-800">AI Provider Key</h3>
          <LlmKeySection />
        </div>

        <hr className="border-gray-200" />

        <div>
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-800">Programmatic API Keys</h3>
          <ProgrammaticKeysSection />
        </div>
      </div>
    </div>
  );
}
