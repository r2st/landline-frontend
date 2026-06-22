import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { DEAL_STATUSES, DEAL_STATUS_LABELS } from '../lib/constants';

// Add/edit deal modal. Pass `deal` to edit, omit to create.
export default function DealModal({ open, onClose, onSubmit, deal, companyId, saving }) {
  const [form, setForm] = useState({ title: '', value: '', status: 'pending', close_date: '' });

  useEffect(() => {
    if (open) {
      setForm({
        title: deal?.title || '',
        value: deal?.value ?? '',
        status: deal?.status || 'pending',
        close_date: deal?.close_date ? String(deal.close_date).slice(0, 10) : '',
      });
    }
  }, [open, deal]);

  if (!open) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    const payload = {
      title: form.title.trim(),
      value: form.value === '' ? null : Number(form.value),
      status: form.status,
      close_date: form.close_date || null,
    };
    if (companyId != null) payload.company_id = companyId;
    onSubmit(payload);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative flex max-h-[92vh] w-full max-w-md flex-col overflow-y-auto rounded-t-2xl bg-white p-6 shadow-xl sm:max-h-[90vh] sm:rounded-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">{deal ? 'Edit Deal' : 'Add Deal'}</h3>
          <button type="button" onClick={onClose} className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <X className="h-5 w-5" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Title *</label>
            <input
              type="text"
              required
              autoFocus
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Annual contract renewal"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Value (USD)</label>
              <input
                type="number"
                min="0"
                step="any"
                value={form.value}
                onChange={(e) => setForm({ ...form, value: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                placeholder="25000"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Status</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                {DEAL_STATUSES.map((s) => (
                  <option key={s} value={s}>{DEAL_STATUS_LABELS[s]}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Close date</label>
            <input
              type="date"
              value={form.close_date}
              onChange={(e) => setForm({ ...form, close_date: e.target.value })}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={onClose} className="rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="rounded-lg bg-blue-500 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-600 disabled:opacity-50">
              {deal ? 'Save Changes' : 'Add Deal'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
