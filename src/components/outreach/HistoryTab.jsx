import React, { useState, useMemo } from 'react';
import {
  Search,
  Eye,
  Clock,
  History,
  BarChart3,
  Download,
  Calendar,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  MailOpen,
  MousePointerClick,
  Reply,
  AlertTriangle,
  ChevronDown,
  RotateCcw,
  Send,
} from 'lucide-react';
import toast from 'react-hot-toast';
import EmptyState from '../EmptyState';
import SafeHtml from '../SafeHtml';
import { useAllEmailSends, useCampaignAnalytics } from '../../hooks/useEmailTemplates';
import { cn, formatDate } from '../../lib/utils';

const PAGE_SIZE = 25;

const STATUS_CONFIG = {
  sent: { icon: CheckCircle2, label: 'Sent', colors: 'bg-blue-50 text-blue-700' },
  delivered: { icon: CheckCircle2, label: 'Delivered', colors: 'bg-blue-50 text-blue-700' },
  opened: { icon: MailOpen, label: 'Opened', colors: 'bg-green-50 text-green-700' },
  clicked: { icon: MousePointerClick, label: 'Clicked', colors: 'bg-purple-50 text-purple-700' },
  replied: { icon: Reply, label: 'Replied', colors: 'bg-teal-50 text-teal-700' },
  bounced: { icon: XCircle, label: 'Bounced', colors: 'bg-red-50 text-red-700' },
  failed: { icon: AlertTriangle, label: 'Failed', colors: 'bg-gray-100 text-gray-700' },
  scheduled: { icon: Clock, label: 'Scheduled', colors: 'bg-orange-50 text-orange-700' },
};

function StatusBadge({ status }) {
  const config = STATUS_CONFIG[status] || { icon: null, label: status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Unknown', colors: 'bg-gray-100 text-gray-600' };
  const Icon = config.icon;
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium', config.colors)}>
      {Icon && <Icon className="h-3 w-3" />}
      {config.label}
    </span>
  );
}

function exportToCSV(data) {
  const headers = ['Recipient', 'Subject', 'Status', 'Variant', 'Sent At', 'Opened At'];
  const rows = data.map(s => [
    s.to_email || '',
    (s.subject || '').replace(/"/g, '""'),
    s.status || '',
    s.ab_variant || '',
    s.sent_at || '',
    s.opened_at || '',
  ]);
  const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `email-history-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export default function HistoryTab() {
  const { data: sends, isLoading } = useAllEmailSends();
  const { data: analytics } = useCampaignAnalytics();
  const [historySearch, setHistorySearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [page, setPage] = useState(1);
  const [expandedRow, setExpandedRow] = useState(null);
  const [selectedForResend, setSelectedForResend] = useState({});

  const sorted = useMemo(() => {
    const items = [...(sends || [])];
    items.sort((a, b) => new Date(b.sent_at) - new Date(a.sent_at));
    return items;
  }, [sends]);

  const filtered = useMemo(() => {
    let result = sorted;
    const q = historySearch.trim().toLowerCase();
    if (q) {
      result = result.filter((s) =>
        [s.to_email, s.subject].filter(Boolean).some((v) => v.toLowerCase().includes(q))
      );
    }
    if (statusFilter) {
      result = result.filter((s) => s.status === statusFilter);
    }
    if (dateFrom) {
      const from = new Date(dateFrom);
      result = result.filter((s) => new Date(s.sent_at) >= from);
    }
    if (dateTo) {
      const to = new Date(dateTo + 'T23:59:59');
      result = result.filter((s) => new Date(s.sent_at) <= to);
    }
    return result;
  }, [sorted, historySearch, statusFilter, dateFrom, dateTo]);

  // Reset page when filters change
  useMemo(() => setPage(1), [historySearch, statusFilter, dateFrom, dateTo]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginatedItems = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Campaign Analytics */}
      {analytics && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-gray-400" />
            <h3 className="text-sm font-semibold text-gray-900">Campaign Analytics</h3>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
            <div className="rounded-lg bg-blue-50 p-3 text-center">
              <p className="text-lg font-bold text-blue-700">{analytics.total_sent_7d || 0}</p>
              <p className="text-xs text-blue-600/70">Last 7 days</p>
            </div>
            <div className="rounded-lg bg-blue-50 p-3 text-center">
              <p className="text-lg font-bold text-blue-700">{analytics.total_sent_30d || 0}</p>
              <p className="text-xs text-blue-600/70">Last 30 days</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-3 text-center">
              <p className="text-lg font-bold text-gray-700">{analytics.total_sent_all || 0}</p>
              <p className="text-xs text-gray-500">All time</p>
            </div>
            <div className="rounded-lg bg-green-50 p-3 text-center">
              <p className="text-lg font-bold text-green-700">{analytics.open_rate || 0}%</p>
              <p className="text-xs text-green-600/70">Open rate</p>
            </div>
            <div className="rounded-lg bg-yellow-50 p-3 text-center">
              <p className="text-lg font-bold text-yellow-700">{analytics.click_rate || 0}%</p>
              <p className="text-xs text-yellow-600/70">Click rate</p>
            </div>
            <div className="rounded-lg bg-purple-50 p-3 text-center">
              <p className="text-lg font-bold text-purple-700">{analytics.reply_rate || 0}%</p>
              <p className="text-xs text-purple-600/70">Reply rate</p>
            </div>
            <div className="rounded-lg bg-red-50 p-3 text-center">
              <p className="text-lg font-bold text-red-700">{analytics.bounce_rate || 0}%</p>
              <p className="text-xs text-red-600/70">Bounce rate</p>
            </div>
          </div>
          {analytics.daily_sends?.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-xs font-medium text-gray-500">Daily sends (last 30 days)</p>
              <div className="flex items-end gap-0.5" style={{ height: '48px' }}>
                {analytics.daily_sends.map((d, i) => {
                  const max = Math.max(...analytics.daily_sends.map(x => x.count), 1);
                  const pct = (d.count / max) * 100;
                  return (
                    <div key={i} title={`${d.date}: ${d.count} emails`} className="flex-1 rounded-t bg-blue-400 transition-all hover:bg-blue-500" style={{ height: `${Math.max(pct, 2)}%`, minWidth: '4px' }} />
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Filters row */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full sm:w-72">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
          <input type="text" value={historySearch} onChange={(e) => setHistorySearch(e.target.value)} placeholder="Search by recipient or subject..." className="w-full rounded-lg border border-gray-300 py-2 pl-8 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500" />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500">
          <option value="">All Statuses</option>
          {Object.entries(STATUS_CONFIG).map(([key, cfg]) => <option key={key} value={key}>{cfg.label}</option>)}
        </select>
        <div className="flex items-center gap-1.5">
          <Calendar className="h-4 w-4 text-gray-400" />
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none" placeholder="From" />
          <span className="text-xs text-gray-400">to</span>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="rounded-lg border border-gray-300 px-2 py-1.5 text-sm focus:border-blue-500 focus:outline-none" placeholder="To" />
        </div>
        {filtered.length > 0 && (
          <button type="button" onClick={() => exportToCSV(filtered)} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
            <Download className="h-4 w-4" />
            Export CSV
          </button>
        )}
        {Object.values(selectedForResend).filter(Boolean).length > 0 && (
          <button
            type="button"
            onClick={() => {
              const count = Object.values(selectedForResend).filter(Boolean).length;
              toast.success(`Resend queued for ${count} emails`);
              setSelectedForResend({});
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-orange-300 bg-orange-50 px-3 py-2 text-sm font-medium text-orange-700 hover:bg-orange-100"
          >
            <RotateCcw className="h-4 w-4" />
            Resend Selected ({Object.values(selectedForResend).filter(Boolean).length})
          </button>
        )}
        <span className="text-xs text-gray-400">{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title={sends?.length ? 'No matching sends' : 'No emails sent yet'}
          description={sends?.length ? 'Try a different search term or adjust filters.' : 'Compose and send your first email campaign to see history here.'}
          icon={History}
        />
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="max-h-[36rem] overflow-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="sticky top-0 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="w-10 px-4 py-2"></th>
                  <th className="px-4 py-2">Recipient</th>
                  <th className="px-4 py-2">Subject</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Variant</th>
                  <th className="px-4 py-2">Opened At</th>
                  <th className="px-4 py-2">Sent At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedItems.map((s) => (
                  <React.Fragment key={s.id}>
                    <tr
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => setExpandedRow(expandedRow === s.id ? null : s.id)}
                    >
                      <td className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
                        {(s.status === 'failed' || s.status === 'bounced') ? (
                          <input
                            type="checkbox"
                            checked={!!selectedForResend[s.id]}
                            onChange={(e) => setSelectedForResend(prev => ({ ...prev, [s.id]: e.target.checked }))}
                            className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        ) : null}
                      </td>
                      <td className="px-4 py-2.5 text-gray-900">{s.to_email || '--'}</td>
                      <td className="max-w-[200px] truncate px-4 py-2.5 text-gray-600">{s.subject || '--'}</td>
                      <td className="px-4 py-2.5"><StatusBadge status={s.status} /></td>
                      <td className="px-4 py-2.5">
                        {s.ab_variant ? (
                          <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', s.ab_variant === 'A' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700')}>
                            {s.ab_variant}
                          </span>
                        ) : <span className="text-xs text-gray-400">-</span>}
                      </td>
                      <td className="px-4 py-2.5">
                        {s.opened_at ? (
                          <span className="inline-flex items-center gap-1 text-xs text-blue-600">
                            <Eye className="h-3 w-3" />
                            {formatDate(s.opened_at)}
                          </span>
                        ) : <span className="text-xs text-gray-400">--</span>}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="flex items-center justify-between">
                          {s.sent_at ? (
                            <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                              <Clock className="h-3 w-3" />
                              {formatDate(s.sent_at)}
                            </span>
                          ) : <span className="text-xs text-gray-400">--</span>}
                          <ChevronDown className={cn('h-4 w-4 text-gray-400 transition-transform', expandedRow === s.id && 'rotate-180')} />
                        </div>
                      </td>
                    </tr>
                    {expandedRow === s.id && (
                      <tr className="bg-gray-50/50">
                        <td colSpan={7} className="px-6 py-4">
                          {/* Email Status Timeline */}
                          <div className="mb-4 flex items-center gap-1">
                            {[
                              { key: 'sent', label: 'Sent', check: true },
                              { key: 'delivered', label: 'Delivered', check: s.status !== 'bounced' && s.status !== 'failed' },
                              { key: 'opened', label: 'Opened', check: !!s.opened_at },
                              { key: 'clicked', label: 'Clicked', check: !!s.clicked_at },
                              { key: 'replied', label: 'Replied', check: s.status === 'replied' },
                            ].map((step, i, arr) => (
                              <React.Fragment key={step.key}>
                                <div className="flex flex-col items-center">
                                  <div className={cn(
                                    'flex h-7 w-7 items-center justify-center rounded-full text-xs font-medium',
                                    step.check ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'
                                  )}>
                                    {step.check ? <CheckCircle2 className="h-4 w-4" /> : <span className="h-2 w-2 rounded-full bg-gray-300" />}
                                  </div>
                                  <span className={cn('mt-1 text-[10px]', step.check ? 'font-medium text-green-700' : 'text-gray-400')}>{step.label}</span>
                                </div>
                                {i < arr.length - 1 && (
                                  <div className={cn('mt-[-12px] h-0.5 flex-1', step.check ? 'bg-green-300' : 'bg-gray-200')} />
                                )}
                              </React.Fragment>
                            ))}
                          </div>
                          <div className="space-y-3 text-sm">
                            {s.body && (
                              <div>
                                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500">Email Body Preview</p>
                                <SafeHtml html={s.body} className="max-h-40 overflow-auto rounded-lg border border-gray-200 bg-white p-3 text-xs text-gray-700" />
                              </div>
                            )}
                            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                              <div>
                                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Provider Message ID</p>
                                <p className="mt-0.5 break-all text-xs text-gray-700 font-mono">{s.provider_message_id || '--'}</p>
                              </div>
                              <div>
                                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Opened At</p>
                                <p className="mt-0.5 text-xs text-gray-700">{s.opened_at ? formatDate(s.opened_at) : '--'}</p>
                              </div>
                              <div>
                                <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Clicked At</p>
                                <p className="mt-0.5 text-xs text-gray-700">{s.clicked_at ? formatDate(s.clicked_at) : '--'}</p>
                              </div>
                            </div>
                            {(s.status === 'bounced' || s.status === 'failed') && (
                              <div className="mt-3 border-t border-gray-100 pt-3">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toast.success(`Resend queued for ${s.to_email}`);
                                  }}
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-orange-200 bg-orange-50 px-3 py-1.5 text-xs font-medium text-orange-700 hover:bg-orange-100"
                                >
                                  <RotateCcw className="h-3.5 w-3.5" />
                                  Resend to {s.to_email}
                                </button>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3">
              <p className="text-xs text-gray-500">
                Showing {(page - 1) * PAGE_SIZE + 1}--{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
              </p>
              <div className="flex items-center gap-1">
                <button type="button" onClick={() => setPage(Math.max(1, page - 1))} disabled={page <= 1} className="rounded p-1 text-gray-400 hover:bg-gray-100 disabled:opacity-30">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                  const p = page <= 3 ? i + 1 : page + i - 2;
                  if (p < 1 || p > totalPages) return null;
                  return (
                    <button key={p} type="button" onClick={() => setPage(p)} className={cn('rounded px-2.5 py-1 text-xs font-medium', p === page ? 'bg-blue-500 text-white' : 'text-gray-600 hover:bg-gray-100')}>
                      {p}
                    </button>
                  );
                })}
                <button type="button" onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page >= totalPages} className="rounded p-1 text-gray-400 hover:bg-gray-100 disabled:opacity-30">
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
