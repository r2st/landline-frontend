import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import { Loader2, ShieldAlert, Users, Mail, Sparkles, Contact2 } from 'lucide-react';
import { orgApi } from '../api/org';

const PLAN_LABEL = {
  free: 'Free', starter: 'Starter', growth: 'Growth', pro: 'Pro', enterprise: 'Enterprise',
};

function monthLabel(ym) {
  // "2026-07" → "Jul". Parse as UTC to avoid TZ drift on the 1st.
  const [y, m] = (ym || '').split('-').map(Number);
  if (!y || !m) return ym;
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString(undefined, { month: 'short' });
}

export default function UsageDashboard() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['org-usage'],
    queryFn: orgApi.getUsage,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-24 text-sm text-gray-500">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading usage…
      </div>
    );
  }
  if (isError || !data) {
    return (
      <div className="flex items-center justify-center gap-2 py-24 text-sm text-red-600">
        <ShieldAlert className="h-4 w-4" /> Could not load usage.
      </div>
    );
  }

  const chartData = (data.trend || []).map((p) => ({
    ...p,
    label: monthLabel(p.month),
  }));

  const limit = data.ai_call_limit;
  const pct = limit ? Math.min(100, Math.round((data.ai_calls / limit) * 100)) : null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Usage</h1>
        <p className="mt-1 text-sm text-gray-500">
          Current billing period on the{' '}
          <span className="font-medium text-gray-700">{PLAN_LABEL[data.billing_plan] || data.billing_plan}</span> plan.
        </p>
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile icon={Contact2} label="Contacts" value={data.contacts} tone="indigo" />
        <StatTile icon={Users} label="Team members" value={data.members} tone="blue" />
        <StatTile
          icon={Mail} label="Emails sent (this month)" value={data.emails_sent_this_month}
          sub={`${data.emails_sent_total.toLocaleString()} all time`} tone="emerald"
        />
        <StatTile
          icon={Sparkles} label="AI calls (this month)" value={data.ai_calls}
          sub={limit == null ? 'Unlimited' : `of ${limit.toLocaleString()}`} tone="violet"
        />
      </div>

      {/* AI usage vs limit */}
      {limit != null && (
        <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-900">AI call allowance</h2>
            <span className={`text-xs font-medium ${data.over_limit ? 'text-red-600' : 'text-gray-500'}`}>
              {data.ai_calls.toLocaleString()} / {limit.toLocaleString()}
              {data.ai_calls_remaining != null && !data.over_limit && ` · ${data.ai_calls_remaining.toLocaleString()} left`}
            </span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-gray-100" role="progressbar" aria-valuenow={pct ?? 0} aria-valuemin={0} aria-valuemax={100}>
            <div
              className={`h-full rounded-full transition-all ${data.over_limit ? 'bg-red-500' : pct >= 80 ? 'bg-amber-500' : 'bg-indigo-500'}`}
              style={{ width: `${pct}%` }}
            />
          </div>
          {data.over_limit && (
            <p className="mt-2 text-xs text-red-600">You’ve exceeded this period’s AI call allowance.</p>
          )}
        </section>
      )}

      {/* Trends */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartCard title="Emails sent" subtitle="Last 6 months">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#6b7280' }} tickLine={false} axisLine={{ stroke: '#e5e7eb' }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#6b7280' }} tickLine={false} axisLine={false} width={40} />
              <Tooltip cursor={{ fill: '#f9fafb' }} contentStyle={tooltipStyle} />
              <Bar dataKey="emails_sent" name="Emails" fill="#10b981" radius={[3, 3, 0, 0]} maxBarSize={44} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="AI calls" subtitle="Last 6 months">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#6b7280' }} tickLine={false} axisLine={{ stroke: '#e5e7eb' }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#6b7280' }} tickLine={false} axisLine={false} width={40} />
              <Tooltip contentStyle={tooltipStyle} />
              <Line type="monotone" dataKey="ai_calls" name="AI calls" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      {/* Per-feature AI breakdown */}
      {data.by_feature && Object.keys(data.by_feature).length > 0 && (
        <section className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-5 py-3">
            <h2 className="text-sm font-semibold text-gray-900">AI usage by feature</h2>
            <p className="text-xs text-gray-400">Current period · estimated cost</p>
          </div>
          <table className="min-w-full divide-y divide-gray-100 text-sm">
            <tbody className="divide-y divide-gray-100">
              {Object.entries(data.by_feature)
                .sort((a, b) => b[1].calls - a[1].calls)
                .map(([feature, stats]) => (
                  <tr key={feature} className="hover:bg-gray-50">
                    <td className="px-5 py-2.5 font-medium capitalize text-gray-700">{feature.replace(/_/g, ' ')}</td>
                    <td className="px-5 py-2.5 text-right text-gray-600">{stats.calls.toLocaleString()} calls</td>
                    <td className="px-5 py-2.5 text-right tabular-nums text-gray-500">${Number(stats.cost_usd).toFixed(2)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}

const TONES = {
  indigo: 'bg-indigo-50 text-indigo-600',
  blue: 'bg-blue-50 text-blue-600',
  emerald: 'bg-emerald-50 text-emerald-600',
  violet: 'bg-violet-50 text-violet-600',
};

function StatTile({ icon: Icon, label, value, sub, tone }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${TONES[tone] || TONES.indigo}`}>
          <Icon className="h-4 w-4" />
        </span>
        <span className="text-xs font-medium text-gray-500">{label}</span>
      </div>
      <div className="mt-3 text-2xl font-bold tabular-nums text-gray-900">{Number(value ?? 0).toLocaleString()}</div>
      {sub && <div className="mt-0.5 text-xs text-gray-400">{sub}</div>}
    </div>
  );
}

function ChartCard({ title, subtitle, children }) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-3">
        <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
        <p className="text-xs text-gray-400">{subtitle}</p>
      </div>
      <div className="h-56">{children}</div>
    </section>
  );
}

const tooltipStyle = {
  borderRadius: 8,
  border: '1px solid #e5e7eb',
  fontSize: 12,
  boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
};
