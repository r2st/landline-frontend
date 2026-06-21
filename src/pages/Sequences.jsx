import { useState } from 'react';
import {
  Mail,
  Plus,
  Send,
  Eye,
  Users,
  ChevronDown,
  ChevronUp,
  X,
  Clock,
  Trash2,
  BarChart3,
} from 'lucide-react';
import EmptyState from '../components/EmptyState';
import { useSequences, useCreateSequence } from '../hooks/useOutreach';
import { formatNumber, cn } from '../lib/utils';

function SequenceStats({ stats = {} }) {
  return (
    <div className="grid grid-cols-4 gap-3">
      <div className="rounded-lg bg-blue-50 p-2.5 text-center">
        <div className="flex items-center justify-center gap-1 text-blue-600">
          <Users className="h-3.5 w-3.5" />
          <span className="text-lg font-bold">{formatNumber(stats.enrolled || 0)}</span>
        </div>
        <p className="text-xs text-blue-600/70">Enrolled</p>
      </div>
      <div className="rounded-lg bg-purple-50 p-2.5 text-center">
        <div className="flex items-center justify-center gap-1 text-purple-600">
          <Send className="h-3.5 w-3.5" />
          <span className="text-lg font-bold">{formatNumber(stats.sent || 0)}</span>
        </div>
        <p className="text-xs text-purple-600/70">Sent</p>
      </div>
      <div className="rounded-lg bg-indigo-50 p-2.5 text-center">
        <div className="flex items-center justify-center gap-1 text-indigo-600">
          <Eye className="h-3.5 w-3.5" />
          <span className="text-lg font-bold">{formatNumber(stats.opened || 0)}</span>
        </div>
        <p className="text-xs text-indigo-600/70">Opened</p>
      </div>
      <div className="rounded-lg bg-green-50 p-2.5 text-center">
        <div className="flex items-center justify-center gap-1 text-green-600">
          <Mail className="h-3.5 w-3.5" />
          <span className="text-lg font-bold">{formatNumber(stats.replied || 0)}</span>
        </div>
        <p className="text-xs text-green-600/70">Replied</p>
      </div>
    </div>
  );
}

function SequenceCard({ sequence }) {
  const [expanded, setExpanded] = useState(false);

  // The API may omit stats for a brand-new sequence — default to zeros so the
  // card renders instead of crashing on `stats.sent`.
  const stats = sequence.stats || {};
  const openRate = stats.sent > 0
    ? ((stats.opened / stats.sent) * 100).toFixed(1)
    : 0;
  const replyRate = stats.sent > 0
    ? ((stats.replied / stats.sent) * 100).toFixed(1)
    : 0;

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md">
      <div
        className="cursor-pointer p-5"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
              <Mail className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900">{sequence.name}</h3>
              <div className="mt-0.5 flex items-center gap-3 text-sm text-gray-500">
                <span>{sequence.steps?.length || 0} steps</span>
                <span className="text-gray-300">|</span>
                <span>{openRate}% open rate</span>
                <span className="text-gray-300">|</span>
                <span>{replyRate}% reply rate</span>
              </div>
            </div>
          </div>
          <button
            type="button"
            className="rounded-md p-1 text-gray-400 hover:bg-gray-100"
          >
            {expanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
          </button>
        </div>
        <div className="mt-4">
          <SequenceStats stats={stats} />
        </div>
      </div>

      {expanded && sequence.steps && (
        <div className="border-t border-gray-100 px-5 py-4">
          <h4 className="mb-3 text-sm font-semibold text-gray-700">Sequence Steps</h4>
          <div className="relative ml-3 border-l-2 border-gray-200 pl-6">
            {sequence.steps.map((step, idx) => (
              <div key={idx} className="relative mb-4 last:mb-0">
                <div className="absolute -left-[29px] flex h-5 w-5 items-center justify-center rounded-full border-2 border-gray-200 bg-white text-xs font-bold text-gray-500">
                  {step.order}
                </div>
                <div className="rounded-lg border border-gray-100 bg-gray-50 p-3">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900">{step.subject}</p>
                    <div className="flex items-center gap-1 text-xs text-gray-500">
                      <Clock className="h-3 w-3" />
                      {step.delay_days === 0 ? 'Immediately' : `After ${step.delay_days} day${step.delay_days > 1 ? 's' : ''}`}
                    </div>
                  </div>
                  <p className="mt-1.5 whitespace-pre-wrap text-xs text-gray-600 line-clamp-3">{step.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const templateVariables = [
  { label: 'Company', value: '{{company_name}}' },
  { label: 'First Name', value: '{{contact_first_name}}' },
  { label: 'Title', value: '{{contact_title}}' },
  { label: 'Industry', value: '{{industry}}' },
];

function SequenceBuilder({ onSave, onCancel }) {
  const [name, setName] = useState('');
  const [steps, setSteps] = useState([
    { order: 1, type: 'email', subject: '', body: '', delay_days: 0 },
  ]);

  const addStep = () => {
    setSteps([
      ...steps,
      {
        order: steps.length + 1,
        type: 'email',
        subject: '',
        body: '',
        delay_days: 3,
      },
    ]);
  };

  const removeStep = (index) => {
    if (steps.length <= 1) return;
    const updated = steps.filter((_, i) => i !== index).map((s, i) => ({ ...s, order: i + 1 }));
    setSteps(updated);
  };

  const updateStep = (index, field, value) => {
    const updated = [...steps];
    updated[index] = { ...updated[index], [field]: value };
    setSteps(updated);
  };

  const insertVariable = (index, variable) => {
    const step = steps[index];
    const textarea = document.getElementById(`step-body-${index}`);
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newBody = step.body.substring(0, start) + variable + step.body.substring(end);
      updateStep(index, 'body', newBody);
    } else {
      updateStep(index, 'body', step.body + variable);
    }
  };

  const handleSave = () => {
    if (!name.trim()) return;
    if (steps.some((s) => !s.subject.trim())) return;
    onSave({ name, steps });
  };

  return (
    <div className="rounded-xl border border-blue-200 bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Create New Sequence</h2>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="space-y-5">
        {/* Sequence Name */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Sequence Name *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Cold Outreach - Q2 Campaign"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Steps */}
        <div className="space-y-4">
          {steps.map((step, idx) => (
            <div key={idx} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-600">
                    {step.order}
                  </span>
                  <span className="text-sm font-medium text-gray-700">Email Step</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5 text-gray-400" />
                    <input
                      type="number"
                      min="0"
                      max="30"
                      value={step.delay_days}
                      onChange={(e) => updateStep(idx, 'delay_days', Number(e.target.value))}
                      className="w-14 rounded border border-gray-300 px-2 py-1 text-xs focus:border-blue-500 focus:outline-none"
                    />
                    <span className="text-xs text-gray-500">day delay</span>
                  </div>
                  {steps.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeStep(idx)}
                      className="rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-red-500"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <input
                type="text"
                placeholder="Email subject line *"
                value={step.subject}
                onChange={(e) => updateStep(idx, 'subject', e.target.value)}
                className="mb-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />

              <textarea
                id={`step-body-${idx}`}
                placeholder="Email body text..."
                value={step.body}
                onChange={(e) => updateStep(idx, 'body', e.target.value)}
                rows={4}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />

              <div className="mt-2 flex flex-wrap gap-1.5">
                <span className="text-xs text-gray-500">Insert:</span>
                {templateVariables.map((v) => (
                  <button
                    key={v.value}
                    type="button"
                    onClick={() => insertVariable(idx, v.value)}
                    className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-600 hover:bg-blue-100"
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Add Step */}
        <button
          type="button"
          onClick={addStep}
          className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 py-2.5 text-sm font-medium text-gray-500 transition-colors hover:border-blue-400 hover:text-blue-500"
        >
          <Plus className="h-4 w-4" />
          Add Step
        </button>

        {/* Actions */}
        <div className="flex justify-end gap-3 border-t border-gray-200 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={!name.trim() || steps.some((s) => !s.subject.trim())}
            className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-600 disabled:opacity-50"
          >
            Save Sequence
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Sequences() {
  const { data: sequences, isLoading, isError } = useSequences();
  const createSequence = useCreateSequence();
  const [showBuilder, setShowBuilder] = useState(false);

  const handleSave = (data) => {
    createSequence.mutate(data);
    setShowBuilder(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">
            Manage your email outreach sequences and track performance.
          </p>
        </div>
        {!showBuilder && (
          <button
            type="button"
            onClick={() => setShowBuilder(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-600"
          >
            <Plus className="h-4 w-4" />
            Create Sequence
          </button>
        )}
      </div>

      {/* Builder */}
      {showBuilder && (
        <SequenceBuilder
          onSave={handleSave}
          onCancel={() => setShowBuilder(false)}
        />
      )}

      {/* Sequence List */}
      {isError ? (
        <EmptyState
          title="Failed to load sequences"
          description="There was an error loading your sequences. Please try again."
          icon={Mail}
        />
      ) : sequences && sequences.length === 0 ? (
        <EmptyState
          title="No sequences yet"
          description="Create your first outreach sequence to start engaging with leads."
          icon={Mail}
          action={{ label: 'Create Sequence', onClick: () => setShowBuilder(true) }}
        />
      ) : (
        <div className="space-y-4">
          {(sequences || []).map((sequence) => (
            <SequenceCard key={sequence.id} sequence={sequence} />
          ))}
        </div>
      )}

      {/* Aggregate Stats */}
      {sequences && sequences.length > 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-gray-400" />
            <h2 className="text-base font-semibold text-gray-900">Overall Performance</h2>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">
                {formatNumber(sequences.reduce((sum, s) => sum + (s.stats?.enrolled || 0), 0))}
              </p>
              <p className="text-sm text-gray-500">Total Enrolled</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-900">
                {formatNumber(sequences.reduce((sum, s) => sum + (s.stats?.sent || 0), 0))}
              </p>
              <p className="text-sm text-gray-500">Emails Sent</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">
                {(() => {
                  const totalSent = sequences.reduce((sum, s) => sum + (s.stats?.sent || 0), 0);
                  const totalOpened = sequences.reduce((sum, s) => sum + (s.stats?.opened || 0), 0);
                  return totalSent > 0 ? ((totalOpened / totalSent) * 100).toFixed(1) : 0;
                })()}%
              </p>
              <p className="text-sm text-gray-500">Open Rate</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                {(() => {
                  const totalSent = sequences.reduce((sum, s) => sum + (s.stats?.sent || 0), 0);
                  const totalReplied = sequences.reduce((sum, s) => sum + (s.stats?.replied || 0), 0);
                  return totalSent > 0 ? ((totalReplied / totalSent) * 100).toFixed(1) : 0;
                })()}%
              </p>
              <p className="text-sm text-gray-500">Reply Rate</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
