import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart3, Download, TrendingUp, Filter as FilterIcon, Activity, Trophy,
} from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import EmptyState from '../components/EmptyState';
import {
  useRetentionReport, useRevenueFunnelReport, useActivityHeatmapReport, useTopClientsReport,
} from '../hooks/useReports';
import { STAGE_LABELS, STAGE_COLORS } from '../lib/constants';
import { formatCurrency, formatDate, cn } from '../lib/utils';

function ChartCard({ title, icon: Icon, children, className }) {
  return (
    <div className={cn('rounded-xl border border-gray-200 bg-white p-6 shadow-sm', className)}>
      <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-gray-900">
        {Icon && <Icon className="h-4 w-4 text-gray-400" />}
        {title}
      </h2>
      {children}
    </div>
  );
}

function shortDate(d) {
  const dt = new Date(d);
  if (isNaN(dt)) return String(d);
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Horizontal funnel: bars scaled to the largest stage value.
function RevenueFunnel({ data }) {
  const max = Math.max(...data.map((d) => d.value || 0), 1);
  return (
    <div className="space-y-2">
      {data.map((d) => {
        const pct = ((d.value || 0) / max) * 100;
        const color = STAGE_COLORS[d.stage]?.hex || '#3b82f6';
        return (
          <div key={d.stage} className="flex items-center gap-3">
            <div className="w-24 flex-shrink-0 text-right text-xs font-medium text-gray-600">
              {STAGE_LABELS[d.stage] || d.stage}
            </div>
            <div className="relative h-7 flex-1 overflow-hidden rounded-md bg-gray-100">
              <div
                className="flex h-full items-center justify-end rounded-md px-2 text-[11px] font-semibold text-white transition-all"
                style={{ width: `${Math.max(pct, 6)}%`, backgroundColor: color }}
              >
                {formatCurrency(d.value, { compact: true })}
              </div>
            </div>
            {d.count != null && <span className="w-10 flex-shrink-0 text-xs text-gray-400">{d.count}</span>}
          </div>
        );
      })}
    </div>
  );
}

// GitHub-style activity heatmap from daily { date, count } points.
function ActivityHeatmap({ data }) {
  const byDay = useMemo(() => {
    const map = {};
    let max = 0;
    for (const d of data) {
      const key = new Date(d.date).toDateString();
      const count = d.count ?? d.value ?? 0;
      map[key] = count;
      if (count > max) max = count;
    }
    return { map, max };
  }, [data]);

  // Build ~17 weeks back from today, aligned to weeks (columns) × 7 days (rows).
  const weeks = 17;
  const today = new Date();
  const end = new Date(today);
  end.setDate(end.getDate() + (6 - end.getDay())); // end of current week
  const columns = [];
  for (let w = weeks - 1; w >= 0; w--) {
    const col = [];
    for (let dow = 0; dow < 7; dow++) {
      const d = new Date(end);
      d.setDate(end.getDate() - w * 7 - (6 - dow));
      col.push(d);
    }
    columns.push(col);
  }

  const level = (count) => {
    if (!count) return 'bg-gray-100';
    const ratio = byDay.max ? count / byDay.max : 0;
    if (ratio > 0.66) return 'bg-emerald-600';
    if (ratio > 0.33) return 'bg-emerald-400';
    return 'bg-emerald-200';
  };

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-1">
        {columns.map((col, i) => (
          <div key={i} className="flex flex-col gap-1">
            {col.map((d) => {
              const count = byDay.map[d.toDateString()] || 0;
              const future = d > today;
              return (
                <div
                  key={d.toISOString()}
                  title={`${formatDate(d)}: ${count} ${count === 1 ? 'activity' : 'activities'}`}
                  className={cn('h-3 w-3 rounded-sm', future ? 'bg-transparent' : level(count))}
                />
              );
            })}
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center justify-end gap-1.5 text-[11px] text-gray-400">
        <span>Less</span>
        <span className="h-3 w-3 rounded-sm bg-gray-100" />
        <span className="h-3 w-3 rounded-sm bg-emerald-200" />
        <span className="h-3 w-3 rounded-sm bg-emerald-400" />
        <span className="h-3 w-3 rounded-sm bg-emerald-600" />
        <span>More</span>
      </div>
    </div>
  );
}

function downloadCsv(filename, headers, rows) {
  const escape = (val) => {
    const str = Array.isArray(val) ? val.join('; ') : val == null ? '' : String(val);
    return `"${str.replace(/"/g, '""')}"`;
  };
  const csv = [headers, ...rows].map((r) => r.map(escape).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Reports() {
  const navigate = useNavigate();
  const [range, setRange] = useState({ start: '', end: '' });

  const params = useMemo(() => {
    const p = {};
    if (range.start) p.start = range.start;
    if (range.end) p.end = range.end;
    return p;
  }, [range]);

  const { data: retention = [] } = useRetentionReport(params);
  const { data: funnel = [] } = useRevenueFunnelReport(params);
  const { data: heatmap = [] } = useActivityHeatmapReport(params);
  const { data: topClients = [] } = useTopClientsReport(params);

  const retentionData = retention.map((r) => ({ date: shortDate(r.date ?? r.period), rate: r.rate ?? r.value ?? 0 }));
  const funnelData = funnel.map((f) => ({ stage: f.stage, value: f.value ?? f.revenue ?? 0, count: f.count }));

  const handleExport = () => {
    if (topClients.length === 0) return;
    downloadCsv(
      'landline-top-clients.csv',
      ['Client', 'Revenue', 'Deals', 'Health'],
      topClients.map((c) => [c.name ?? c.company_name, c.revenue ?? c.total_revenue ?? '', c.deals ?? c.deal_count ?? '', c.health_score ?? '']),
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-gray-900">
            <BarChart3 className="h-5 w-5 text-indigo-500" />
            Reports
          </h1>
          <p className="mt-1 text-sm text-gray-500">Retention, revenue, and activity across your client base.</p>
        </div>
        <button
          type="button"
          onClick={handleExport}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </button>
      </div>

      {/* Date range picker */}
      <div className="flex flex-wrap items-end gap-3 rounded-lg border border-gray-200 bg-white p-4">
        <div className="flex items-center gap-1.5 text-sm font-medium text-gray-500">
          <FilterIcon className="h-4 w-4" />
          Date range
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">From</label>
          <input
            type="date"
            value={range.start}
            onChange={(e) => setRange((r) => ({ ...r, start: e.target.value }))}
            className="h-9 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-500">To</label>
          <input
            type="date"
            value={range.end}
            onChange={(e) => setRange((r) => ({ ...r, end: e.target.value }))}
            className="h-9 rounded-md border border-gray-300 bg-white px-3 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        {(range.start || range.end) && (
          <button type="button" onClick={() => setRange({ start: '', end: '' })} className="h-9 text-sm text-gray-500 hover:text-gray-700">
            Clear
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartCard title="Client Retention" icon={TrendingUp}>
          {retentionData.length === 0 ? (
            <EmptyState icon={TrendingUp} title="No retention data" description="Retention appears once client history accrues." />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={retentionData} margin={{ top: 8, right: 16, left: -8, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} tickFormatter={(v) => `${v}%`} width={44} />
                <Tooltip formatter={(v) => `${v}%`} contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }} />
                <Line type="monotone" dataKey="rate" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Revenue Pipeline Funnel" icon={BarChart3}>
          {funnelData.length === 0 ? (
            <EmptyState icon={BarChart3} title="No pipeline data" description="The funnel appears once deals are recorded by stage." />
          ) : (
            <div className="py-2">
              <RevenueFunnel data={funnelData} />
            </div>
          )}
        </ChartCard>
      </div>

      <ChartCard title="Activity Heatmap" icon={Activity}>
        {heatmap.length === 0 ? (
          <EmptyState icon={Activity} title="No activity data" description="Activity appears once interactions and outreach are logged." />
        ) : (
          <ActivityHeatmap data={heatmap} />
        )}
      </ChartCard>

      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="flex items-center gap-2 text-base font-semibold text-gray-900">
            <Trophy className="h-4 w-4 text-amber-500" />
            Top Clients by Revenue
          </h2>
        </div>
        {topClients.length === 0 ? (
          <EmptyState icon={Trophy} title="No client revenue yet" description="Top clients appear once revenue is recorded." />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Client</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Revenue</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Deals</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {topClients.map((c, i) => {
                  const cid = c.company_id ?? c.id;
                  return (
                    <tr
                      key={cid ?? i}
                      className={cn('transition-colors', cid && 'cursor-pointer hover:bg-gray-50')}
                      onClick={() => cid && navigate(`/companies/${cid}`)}
                    >
                      <td className="px-6 py-3 text-sm font-medium text-blue-600">{c.name ?? c.company_name}</td>
                      <td className="px-6 py-3 text-right text-sm font-semibold text-gray-900">
                        {formatCurrency(c.revenue ?? c.total_revenue)}
                      </td>
                      <td className="px-6 py-3 text-right text-sm text-gray-600">{c.deals ?? c.deal_count ?? '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
