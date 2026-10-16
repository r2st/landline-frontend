import { useState, useEffect, useCallback } from 'react';
import {
  Settings as SettingsIcon,
  Globe,
  Target,
  Trash2,
  Download,
  AlertCircle,
  Flame,
  Bot,
  Zap,
  BarChart3,
  Calendar,
  Key,
  Eye,
  EyeOff,
  Plus,
  Copy,
  XCircle,
} from 'lucide-react';
import ConfirmDialog from '../components/ConfirmDialog';
import GmailConnect from '../components/GmailConnect';
import { API_BASE_URL } from '../lib/constants';
import { settingsApi, apiKeysApi } from '../api/client';
import toast from 'react-hot-toast';

const SCHEDULING_LINK_KEY = 'landline.scheduling_link';

function ConnectionStatus({ connected }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-sm font-medium ${connected ? 'text-green-600' : 'text-red-600'}`}>
      <span className={`h-2.5 w-2.5 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
      {connected ? 'Connected' : 'Unavailable'}
    </span>
  );
}

function WeightSlider({ label, value, description }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">{label}</label>
        <span className="text-sm font-semibold text-gray-900">{value}%</span>
      </div>
      <div className="relative h-2 rounded-full bg-gray-200">
        <div
          className="absolute left-0 top-0 h-2 rounded-full bg-blue-500"
          style={{ width: `${value}%` }}
        />
      </div>
      <p className="text-xs text-gray-500">{description}</p>
    </div>
  );
}

function AutomationStatusRow({ icon: Icon, label, enabled, description }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3">
      <div className="flex items-center gap-3">
        <Icon className="h-4 w-4 text-gray-500" />
        <div>
          <span className="text-sm font-medium text-gray-700">{label}</span>
          <p className="text-xs text-gray-400">{description}</p>
        </div>
      </div>
      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${enabled ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'}`}>
        <span className={`h-1.5 w-1.5 rounded-full ${enabled ? 'bg-green-500' : 'bg-gray-400'}`} />
        {enabled ? 'ON' : 'OFF'}
      </span>
    </div>
  );
}

function LlmKeySection() {
  const [llmKey, setLlmKey] = useState({ provider: 'gemini', key_hint: '', has_key: false });
  const [newKey, setNewKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadKey = useCallback(async () => {
    try {
      const data = await settingsApi.getLlmKey();
      setLlmKey(data);
    } catch {
      // API not available — leave defaults
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadKey(); }, [loadKey]);

  const handleSave = async () => {
    if (!newKey.trim()) return;
    setSaving(true);
    try {
      const data = await settingsApi.setLlmKey(newKey.trim());
      setLlmKey(data);
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
    try {
      await settingsApi.deleteLlmKey();
      setLlmKey({ provider: 'gemini', key_hint: '', has_key: false });
      toast.success('Gemini API key removed — using platform default');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to remove key');
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-3">
        <div className="h-4 w-48 rounded bg-gray-200" />
        <div className="h-10 rounded bg-gray-200" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        Provide your own Gemini API key so AI features (tactics, scoring, news analysis, call scripts) use your key instead of the platform default.
      </p>

      {llmKey.has_key ? (
        <div className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3">
          <div>
            <p className="text-sm font-medium text-gray-700">Current key</p>
            <p className="text-sm font-mono text-gray-500">{llmKey.key_hint}</p>
          </div>
          <button
            type="button"
            onClick={handleRemove}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-50"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Remove
          </button>
        </div>
      ) : null}

      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type={showKey ? 'text' : 'password'}
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            placeholder={llmKey.has_key ? 'Replace with a new key...' : 'Enter your Gemini API key'}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 pr-10 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
          <button
            type="button"
            onClick={() => setShowKey(!showKey)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving || !newKey.trim()}
          className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  );
}

function ApiKeysSection() {
  const [keys, setKeys] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newKeyName, setNewKeyName] = useState('');
  const [creating, setCreating] = useState(false);
  const [createdKey, setCreatedKey] = useState(null);
  const [revokeTarget, setRevokeTarget] = useState(null);

  const loadKeys = useCallback(async () => {
    try {
      const data = await apiKeysApi.list();
      setKeys(data);
    } catch {
      // API not available
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadKeys(); }, [loadKeys]);

  const handleCreate = async () => {
    if (!newKeyName.trim()) return;
    setCreating(true);
    try {
      const data = await apiKeysApi.create({ name: newKeyName.trim(), scopes: [] });
      setCreatedKey(data.api_key);
      setNewKeyName('');
      await loadKeys();
      toast.success('API key created — copy it now, it won\'t be shown again');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create key');
    } finally {
      setCreating(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(createdKey);
    toast.success('Copied to clipboard');
  };

  const handleRevoke = async () => {
    if (!revokeTarget) return;
    try {
      await apiKeysApi.revoke(revokeTarget);
      setRevokeTarget(null);
      await loadKeys();
      toast.success('API key revoked');
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to revoke key');
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-3">
        <div className="h-4 w-48 rounded bg-gray-200" />
        <div className="h-10 rounded bg-gray-200" />
        <div className="h-10 rounded bg-gray-200" />
      </div>
    );
  }

  const activeKeys = keys.filter(k => !k.revoked_at);
  const revokedKeys = keys.filter(k => k.revoked_at);

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        Generate API keys to access Prospect programmatically. Keys authenticate requests to the public API at <code className="text-xs bg-gray-100 px-1 py-0.5 rounded">/api/v1/public/*</code>.
      </p>

      {/* Create new key */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newKeyName}
          onChange={(e) => setNewKeyName(e.target.value)}
          placeholder="Key name (e.g. Zapier integration)"
          className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
        />
        <button
          type="button"
          onClick={handleCreate}
          disabled={creating || !newKeyName.trim()}
          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600 disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          {creating ? 'Creating...' : 'Create Key'}
        </button>
      </div>

      {/* Newly created key (show once) */}
      {createdKey && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <p className="mb-2 text-sm font-medium text-green-800">
            New API key created — copy it now. It won't be shown again.
          </p>
          <div className="flex items-center gap-2">
            <code className="flex-1 rounded bg-white px-3 py-2 text-sm font-mono text-gray-900 border border-green-200 break-all">
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

      {/* Active keys list */}
      {activeKeys.length > 0 ? (
        <div className="divide-y divide-gray-100 rounded-lg border border-gray-200">
          {activeKeys.map((k) => (
            <div key={k.id} className="flex items-center justify-between px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-900 truncate">{k.name}</p>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="text-xs font-mono text-gray-500">{k.key_prefix}•••</span>
                  <span className="text-xs text-gray-400">
                    Created {new Date(k.created_at).toLocaleDateString()}
                  </span>
                  {k.last_used_at && (
                    <span className="text-xs text-gray-400">
                      Last used {new Date(k.last_used_at).toLocaleDateString()}
                    </span>
                  )}
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

      {/* Revoked keys (collapsed) */}
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
                  <span className="text-xs font-mono text-gray-400">{k.key_prefix}•••</span>
                </div>
                <span className="text-xs text-red-500">
                  Revoked {new Date(k.revoked_at).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </details>
      )}

      {/* Revoke confirm dialog */}
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

export default function Settings() {
  const [apiConnected, setApiConnected] = useState(false);
  const [checking, setChecking] = useState(true);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [automation, setAutomation] = useState({
    auto_reply: true,
    auto_followups: false,
    auto_scoring: false,
    scheduling_link: '',
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem(SCHEDULING_LINK_KEY);
      if (saved) {
        setAutomation((prev) => ({ ...prev, scheduling_link: saved }));
      }
    } catch {
      // localStorage unavailable — keep defaults
    }
  }, []);

  const handleSchedulingLinkSave = () => {
    try {
      localStorage.setItem(SCHEDULING_LINK_KEY, automation.scheduling_link.trim());
      toast.success('Scheduling link saved');
    } catch {
      toast.error('Could not save scheduling link');
    }
  };

  useEffect(() => {
    const checkConnection = async () => {
      setChecking(true);
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/health`, {
          method: 'GET',
          signal: AbortSignal.timeout(5000),
        });
        setApiConnected(response.ok);
      } catch {
        setApiConnected(false);
      }
      setChecking(false);
    };
    checkConnection();
  }, []);

  const handleExportAll = () => {
    toast.success('Export started — this would download all data as JSON');
  };

  const handleClearData = () => {
    setShowClearDialog(false);
    toast.success('Demo mode — data clear simulated');
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Email Sending — Gmail OAuth connection */}
      <GmailConnect />

      {/* API Keys */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100">
            <Key className="h-5 w-5 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">API Keys</h2>
            <p className="text-sm text-gray-500">Manage your LLM and programmatic API keys</p>
          </div>
        </div>

        <div className="space-y-6">
          {/* LLM Key subsection */}
          <div>
            <h3 className="mb-3 text-sm font-semibold text-gray-800 uppercase tracking-wide">AI Provider Key</h3>
            <LlmKeySection />
          </div>

          <hr className="border-gray-200" />

          {/* Programmatic API Keys subsection */}
          <div>
            <h3 className="mb-3 text-sm font-semibold text-gray-800 uppercase tracking-wide">Programmatic API Keys</h3>
            <ApiKeysSection />
          </div>
        </div>
      </div>

      {/* Automation */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100">
            <Bot className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Automation</h2>
            <p className="text-sm text-gray-500">Autonomous outreach and follow-up features</p>
          </div>
        </div>

        <div className="space-y-3">
          <AutomationStatusRow
            icon={Zap}
            label="Auto-Reply"
            enabled={automation.auto_reply}
            description="Automatically respond to incoming replies using AI-generated messages"
          />
          <AutomationStatusRow
            icon={Bot}
            label="Auto Follow-ups"
            enabled={automation.auto_followups}
            description="Send follow-up emails automatically when leads do not reply within a set window"
          />
          <AutomationStatusRow
            icon={BarChart3}
            label="Auto Scoring"
            enabled={automation.auto_scoring}
            description="Automatically score new companies when they are imported or discovered"
          />

          <div className="rounded-lg bg-gray-50 px-4 py-3">
            <div className="flex items-center gap-3 mb-2">
              <Calendar className="h-4 w-4 text-gray-500" />
              <label className="text-sm font-medium text-gray-700">Scheduling Link</label>
            </div>
            <p className="mb-2 text-xs text-gray-400">
              Calendly or scheduling URL included in outreach emails when a lead is qualified
            </p>
            <div className="flex gap-2">
              <input
                type="url"
                value={automation.scheduling_link}
                onChange={(e) => setAutomation((prev) => ({ ...prev, scheduling_link: e.target.value }))}
                placeholder="https://calendly.com/your-link"
                className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
              <button
                type="button"
                onClick={handleSchedulingLinkSave}
                className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white hover:bg-blue-600"
              >
                Save
              </button>
            </div>
          </div>
        </div>

        <div className="mt-4 rounded-lg bg-blue-50 px-4 py-3 text-xs text-blue-600">
          These features are controlled by backend environment variables. Contact your administrator to change automation settings.
        </div>
      </div>

      {/* API Configuration */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
            <Globe className="h-5 w-5 text-gray-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">API Configuration</h2>
            <p className="text-sm text-gray-500">Backend API connection settings</p>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Base URL</label>
            <input
              type="text"
              readOnly
              value={API_BASE_URL}
              className="w-full rounded-lg border border-gray-300 bg-gray-50 px-3 py-2 text-sm text-gray-600"
            />
          </div>
          <div className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3">
            <span className="text-sm text-gray-700">Connection Status</span>
            {checking ? (
              <span className="inline-flex items-center gap-1.5 text-sm text-gray-500">
                <div className="h-2.5 w-2.5 animate-spin rounded-full border-2 border-gray-300 border-t-gray-600" />
                Checking...
              </span>
            ) : (
              <ConnectionStatus connected={apiConnected} />
            )}
          </div>
          {!checking && !apiConnected && (
            <div className="flex items-start gap-2 rounded-lg bg-yellow-50 px-4 py-3 text-sm text-yellow-700">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <div>
                <p className="font-medium">API not reachable</p>
                <p className="mt-0.5 text-yellow-600">
                  The app is running in demo mode with mock data. Start the backend server at {API_BASE_URL} to connect to live data.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Scoring Weights */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-yellow-100">
            <Target className="h-5 w-5 text-yellow-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Scoring Weights</h2>
            <p className="text-sm text-gray-500">Configure how lead scores are calculated</p>
          </div>
        </div>

        <div className="space-y-5">
          <WeightSlider label="Company Size" value={25} description="Weight based on number of employees and revenue indicators" />
          <WeightSlider label="Industry Match" value={30} description="How well the company fits your target industry profile" />
          <WeightSlider label="Contact Quality" value={25} description="Decision-maker contacts found and engagement quality" />
          <WeightSlider label="Engagement Level" value={20} description="Email opens, replies, website visits, and other signals" />
        </div>

        <div className="mt-4 rounded-lg bg-blue-50 px-4 py-3 text-xs text-blue-600">
          These weights are visual indicators only. Actual scoring is performed by the backend ML model.
        </div>
      </div>

      {/* Data Management */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
            <SettingsIcon className="h-5 w-5 text-red-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Data Management</h2>
            <p className="text-sm text-gray-500">Export or clear your data</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleExportAll}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          >
            <Download className="h-4 w-4" />
            Export All Data
          </button>
          <button
            type="button"
            onClick={() => setShowClearDialog(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-700 shadow-sm hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" />
            Clear All Data
          </button>
        </div>
      </div>

      {/* About */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
            <Flame className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">About</h2>
            <p className="text-sm text-gray-500">Landline v1.0 by Apprend Technologies</p>
          </div>
        </div>
        <div className="mt-4 space-y-2 text-sm text-gray-600">
          <p>Landline is a B2B lead generation and management platform designed to help sales teams discover, qualify, and engage with potential customers.</p>
          <p className="text-xs text-gray-400">
            Built with React, Tailwind CSS, and FastAPI.
          </p>
        </div>
      </div>

      {/* Confirm Dialog */}
      <ConfirmDialog
        open={showClearDialog}
        title="Clear All Data"
        message="This will permanently remove all companies, contacts, and outreach data. This action cannot be undone."
        confirmLabel="Clear Everything"
        variant="danger"
        onConfirm={handleClearData}
        onCancel={() => setShowClearDialog(false)}
      />
    </div>
  );
}
