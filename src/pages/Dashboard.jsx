import { useNavigate } from 'react-router-dom';
import {
  Building2,
  Users,
  Target,
  Mail,
  ArrowRight,
  Plus,
  Send,
  Eye,
  UserPlus,
  Activity,
  Factory,
} from 'lucide-react';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid,
} from 'recharts';
import MetricCard from '../components/MetricCard';
import ScoreBadge from '../components/ScoreBadge';
import EmptyState from '../components/EmptyState';
import { useDashboardMetrics, useRecentActivity, useTopLeads, useEmailTrends } from '../hooks/useDashboard';
import { STAGES, STAGE_LABELS, STAGE_COLORS } from '../lib/constants';
import { formatNumber, timeAgo } from '../lib/utils';

const activityIcons = {
  lead_scored: Target,
  stage_changed: ArrowRight,
  company_added: Plus,
  email_sent: Send,
  email_opened: Eye,
  contact_added: UserPlus,
};

const activityColors = {
  lead_scored: 'text-yellow-500 bg-yellow-50',
  stage_changed: 'text-blue-500 bg-blue-50',
  company_added: 'text-green-500 bg-green-50',
  email_sent: 'text-purple-500 bg-purple-50',
  email_opened: 'text-indigo-500 bg-indigo-50',
  contact_added: 'text-teal-500 bg-teal-50',
};

function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="h-4 w-24 rounded bg-gray-200" />
          <div className="h-7 w-16 rounded bg-gray-200" />
        </div>
        <div className="h-12 w-12 rounded-full bg-gray-200" />
      </div>
    </div>
  );
}

function ChartCard({ title, action, children }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900">{title}</h2>
        {action}
      </div>
      {children}
    </div>
  );
}

function shortDate(d) {
  // 'YYYY-MM-DD' → 'Mon D'
  const parts = String(d).split('-');
  if (parts.length !== 3) return d;
  const dt = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { data: metrics, isLoading: metricsLoading } = useDashboardMetrics();
  const { data: activity, isLoading: activityLoading } = useRecentActivity();
  const { data: topLeads, isLoading: topLeadsLoading } = useTopLeads();
  const { data: trends } = useEmailTrends(30);

  const stageCounts = Object.fromEntries(
    (metrics?.pipeline || []).map((p) => [p.stage, p.count])
  );
  const pipelineChartData = STAGES.map((stage) => ({
    stage: STAGE_LABELS[stage],
    count: stageCounts[stage] || 0,
    fill: STAGE_COLORS[stage]?.hex || '#6b7280',
  }));

  const industryData = (metrics?.industry_breakdown || []).map((i) => ({
    name: i.industry,
    count: i.count,
  }));

  const trendData = (trends || []).map((t) => ({ date: shortDate(t.date), sent: t.sent }));

  const recentItems = (activity || []).slice(0, 10);

  return (
    <div className="space-y-6">
      {/* Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {metricsLoading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          <>
            <MetricCard
              title="Total Leads"
              value={formatNumber(metrics?.total_leads || 0)}
              icon={Building2}
              color="blue"
              subtitle={`${metrics?.leads_this_week || 0} added this week`}
            />
            <MetricCard
              title="Total Contacts"
              value={formatNumber(metrics?.total_contacts || 0)}
              icon={Users}
              color="teal"
            />
            <MetricCard
              title="Emails Sent"
              value={formatNumber(metrics?.emails_sent || 0)}
              icon={Mail}
              color="purple"
              subtitle={`${metrics?.open_rate || 0}% open rate`}
            />
            <MetricCard
              title="Avg Lead Score"
              value={metrics?.avg_score || 0}
              icon={Target}
              color="yellow"
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Pipeline Funnel Chart */}
        <div className="lg:col-span-2">
          <ChartCard
            title="Pipeline Overview"
            action={
              <button
                onClick={() => navigate('/pipeline')}
                className="text-sm font-medium text-blue-600 hover:text-blue-700"
              >
                View Pipeline
              </button>
            }
          >
            {metricsLoading ? (
              <div className="flex h-[280px] items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={pipelineChartData} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                  <XAxis type="number" tick={{ fontSize: 12 }} allowDecimals={false} />
                  <YAxis type="category" dataKey="stage" tick={{ fontSize: 12 }} width={90} />
                  <Tooltip
                    contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={24}>
                    {pipelineChartData.map((entry, index) => (
                      <Cell key={index} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>

        {/* Recent Activity Feed */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
            <h2 className="text-base font-semibold text-gray-900">Recent Activity</h2>
            <Activity className="h-4 w-4 text-gray-400" />
          </div>
          <div className="max-h-[340px] overflow-y-auto">
            {activityLoading ? (
              <div className="space-y-3 p-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex animate-pulse items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-gray-200" />
                    <div className="flex-1 space-y-1">
                      <div className="h-3 w-3/4 rounded bg-gray-200" />
                      <div className="h-2.5 w-1/4 rounded bg-gray-200" />
                    </div>
                  </div>
                ))}
              </div>
            ) : recentItems.length === 0 ? (
              <div className="px-6 py-8 text-center text-sm text-gray-500">No recent activity</div>
            ) : (
              <ul className="divide-y divide-gray-50">
                {recentItems.map((item) => {
                  const IconComp = activityIcons[item.type] || Activity;
                  const colorClass = activityColors[item.type] || 'text-gray-500 bg-gray-50';
                  return (
                    <li
                      key={item.id}
                      className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-gray-50 cursor-pointer"
                      onClick={() => item.company_id && navigate(`/companies/${item.company_id}`)}
                    >
                      <div className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full ${colorClass}`}>
                        <IconComp className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-gray-700 line-clamp-2">{item.description}</p>
                        <p className="mt-0.5 text-xs text-gray-400">{timeAgo(item.created_at)}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Industry breakdown + email trends */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartCard title="Leads by Industry">
          {industryData.length === 0 ? (
            <EmptyState icon={Factory} title="No industry data" description="Add companies with an industry segment to see this breakdown." />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={industryData} layout="vertical" margin={{ top: 0, right: 20, left: 0, bottom: 0 }}>
                <XAxis type="number" tick={{ fontSize: 12 }} allowDecimals={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={120} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }} />
                <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={18} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        <ChartCard title="Email Activity (last 30 days)">
          {trendData.length === 0 ? (
            <EmptyState icon={Mail} title="No emails sent yet" description="Compose outreach from the Email Campaigns page to see activity here." />
          ) : (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={trendData} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }} />
                <Line type="monotone" dataKey="sent" stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartCard>
      </div>

      {/* Top 5 Scored Leads */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900">Top Scored Leads</h2>
          <button
            onClick={() => navigate('/companies')}
            className="text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            View All Companies
          </button>
        </div>
        {topLeadsLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
          </div>
        ) : (topLeads || []).length === 0 ? (
          <EmptyState icon={Target} title="No scored leads yet" description="Score companies to surface your best opportunities." />
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Company</th>
                  <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Score</th>
                  <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Stage</th>
                  <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Industry</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(topLeads || []).map((lead) => (
                  <tr
                    key={lead.id}
                    className="cursor-pointer transition-colors hover:bg-gray-50"
                    onClick={() => navigate(`/companies/${lead.id}`)}
                  >
                    <td className="py-3 pr-4">
                      <span className="font-medium text-blue-600 hover:text-blue-700">{lead.name}</span>
                    </td>
                    <td className="py-3 pr-4">
                      {lead.score != null ? <ScoreBadge score={lead.score} size="sm" /> : <span className="text-sm text-gray-400">—</span>}
                    </td>
                    <td className="py-3 pr-4">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STAGE_COLORS[lead.stage]?.bg || ''} ${STAGE_COLORS[lead.stage]?.text || ''}`}>
                        {STAGE_LABELS[lead.stage] || lead.stage}
                      </span>
                    </td>
                    <td className="py-3 text-sm text-gray-600">{lead.industry || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
