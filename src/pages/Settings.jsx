import { useState, useEffect, useCallback } from 'react';
import {
  Settings as SettingsIcon,
  Globe,
  Target,
  Download,
  AlertCircle,
  Flame,
  Bot,
  Zap,
  BarChart3,
  Calendar,
  Activity,
  RotateCcw,
  Save,
  Building2,
  Users,
} from 'lucide-react';
import GmailConnect from '../components/GmailConnect';
import EmailSignatureEditor from '../components/EmailSignatureEditor';
import { api } from '../api/client';
import { API_BASE_URL } from '../lib/constants';
import toast from 'react-hot-toast';

// Automation flags are controlled by backend environment variables and shown
// read-only. The scheduling link is a UI-side preference persisted locally.
const SCHEDULING_LINK_KEY = 'landline.scheduling_link';
const SCORING_WEIGHTS_KEY = 'landline.scoring_weights';

const DEFAULT_WEIGHTS = {
  company_size: 25,
  industry_match: 30,
  contact_quality: 25,
  engagement_level: 20,
};

function ConnectionStatus({ connected }) {
  return (
    <span className={`inline-flex items-center gap-1.5 text-sm font-medium ${connected ? 'text-green-600' : 'text-red-600'}`}>
      <span className={`h-2.5 w-2.5 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`} />
      {connected ? 'Connected' : 'Unavailable'}
    </span>
  );
}

function WeightSlider({ label, value, description, onChange }) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-700">{label}</label>
        <span className="text-sm font-semibold text-gray-900">{value}%</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-gray-200 accent-blue-500"
      />
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

export default function Settings() {
  const [apiConnected, setApiConnected] = useState(false);
  const [checking, setChecking] = useState(true);
  const [healthData, setHealthData] = useState(null);
  const [automation, setAutomation] = useState({
    auto_reply: true,
    auto_followups: false,
    auto_scoring: false,
    scheduling_link: '',
  });
  const [weights, setWeights] = useState(() => {
    try {
      const saved = localStorage.getItem(SCORING_WEIGHTS_KEY);
      return saved ? JSON.parse(saved) : { ...DEFAULT_WEIGHTS };
    } catch {
      return { ...DEFAULT_WEIGHTS };
    }
  });
  const [weightsDirty, setWeightsDirty] = useState(false);

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
        const response = await api.get('/health');
        setApiConnected(true);
        setHealthData(response.data);
      } catch {
        setApiConnected(false);
        setHealthData(null);
      }
      setChecking(false);
    };
    checkConnection();
  }, []);

  const handleExportCompanies = useCallback(() => {
    const baseURL = import.meta.env.VITE_API_URL
      ? `${import.meta.env.VITE_API_URL}/api/v1`
      : '/api/v1';
    window.open(`${baseURL}/import-export/export/companies/csv`, '_blank');
    toast.success('Companies CSV export started');
  }, []);

  const handleExportContacts = useCallback(() => {
    const baseURL = import.meta.env.VITE_API_URL
      ? `${import.meta.env.VITE_API_URL}/api/v1`
      : '/api/v1';
    window.open(`${baseURL}/import-export/export/contacts/csv`, '_blank');
    toast.success('Contacts CSV export started');
  }, []);

  const handleWeightChange = useCallback((key, value) => {
    setWeights((prev) => ({ ...prev, [key]: value }));
    setWeightsDirty(true);
  }, []);

  const handleWeightsSave = useCallback(() => {
    try {
      localStorage.setItem(SCORING_WEIGHTS_KEY, JSON.stringify(weights));
      setWeightsDirty(false);
      toast.success('Scoring weights saved');
    } catch {
      toast.error('Could not save scoring weights');
    }
  }, [weights]);

  const handleWeightsReset = useCallback(() => {
    setWeights({ ...DEFAULT_WEIGHTS });
    setWeightsDirty(true);
  }, []);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Email Sending — Gmail OAuth connection */}
      <GmailConnect />

      {/* Email Signatures */}
      <EmailSignatureEditor />

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

      {/* System Status */}
      {!checking && apiConnected && healthData && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
              <Activity className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">System Status</h2>
              <p className="text-sm text-gray-500">Backend service information</p>
            </div>
          </div>

          <div className="space-y-2">
            {healthData.status && (
              <div className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3">
                <span className="text-sm text-gray-700">Status</span>
                <span className="text-sm font-medium text-green-600">{healthData.status}</span>
              </div>
            )}
            {healthData.version && (
              <div className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3">
                <span className="text-sm text-gray-700">Version</span>
                <span className="text-sm font-medium text-gray-900">{healthData.version}</span>
              </div>
            )}
            {healthData.environment && (
              <div className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3">
                <span className="text-sm text-gray-700">Environment</span>
                <span className="text-sm font-medium text-gray-900">{healthData.environment}</span>
              </div>
            )}
            {healthData.database && (
              <div className="flex items-center justify-between rounded-lg bg-gray-50 px-4 py-3">
                <span className="text-sm text-gray-700">Database</span>
                <span className={`text-sm font-medium ${healthData.database === 'connected' ? 'text-green-600' : 'text-red-600'}`}>
                  {healthData.database}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

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
          <WeightSlider
            label="Company Size"
            value={weights.company_size}
            description="Weight based on number of employees and revenue indicators"
            onChange={(v) => handleWeightChange('company_size', v)}
          />
          <WeightSlider
            label="Industry Match"
            value={weights.industry_match}
            description="How well the company fits your target industry profile"
            onChange={(v) => handleWeightChange('industry_match', v)}
          />
          <WeightSlider
            label="Contact Quality"
            value={weights.contact_quality}
            description="Decision-maker contacts found and engagement quality"
            onChange={(v) => handleWeightChange('contact_quality', v)}
          />
          <WeightSlider
            label="Engagement Level"
            value={weights.engagement_level}
            description="Email opens, replies, website visits, and other signals"
            onChange={(v) => handleWeightChange('engagement_level', v)}
          />
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            onClick={handleWeightsSave}
            disabled={!weightsDirty}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            Save Weights
          </button>
          <button
            type="button"
            onClick={handleWeightsReset}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          >
            <RotateCcw className="h-4 w-4" />
            Reset to Defaults
          </button>
        </div>

        <div className="mt-4 rounded-lg bg-blue-50 px-4 py-3 text-xs text-blue-600">
          These weights are visual indicators only. Actual scoring is performed by the backend ML model.
        </div>
      </div>

      {/* Data Export */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100">
            <Download className="h-5 w-5 text-indigo-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Data Export</h2>
            <p className="text-sm text-gray-500">Download your data as CSV files</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleExportCompanies}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          >
            <Building2 className="h-4 w-4" />
            Export Companies
          </button>
          <button
            type="button"
            onClick={handleExportContacts}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
          >
            <Users className="h-4 w-4" />
            Export Contacts
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
    </div>
  );
}
