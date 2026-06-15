import { useNavigate } from 'react-router-dom';
import {
  Building2,
  TrendingUp,
  Target,
  Mail,
  ArrowRight,
  Plus,
  Send,
  Eye,
  UserPlus,
  Activity,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import MetricCard from '../components/MetricCard';
import ScoreBadge from '../components/ScoreBadge';
import { useDashboardMetrics, useRecentActivity, useTopLeads } from '../hooks/useDashboard';
import { useCompanies } from '../hooks/useCompanies';
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

export default function Dashboard() {
  const navigate = useNavigate();
  const { data: metrics, isLoading: metricsLoading } = useDashboardMetrics();
  const { data: activity, isLoading: activityLoading } = useRecentActivity();
  const { data: topLeads, isLoading: topLeadsLoading } = useTopLeads();
  const { data: companies } = useCompanies();

  const pipelineChartData = STAGES.map((stage) => {
    const count = companies
      ? companies.filter((c) => c.stage === stage).length
      : 0;
    return {
      stage: STAGE_LABELS[stage],
      count,
      fill: STAGE_COLORS[stage]?.hex || '#6b7280',
    };
  });

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
              change={8}
            />
            <MetricCard
              title="Leads This Week"
              value={formatNumber(metrics?.leads_this_week || 0)}
              icon={TrendingUp}
              color="green"
              change={12}
            />
            <MetricCard
              title="Avg Score"
              value={metrics?.avg_score || 0}
              icon={Target}
              color="yellow"
              change={3}
            />
            <MetricCard
              title="Emails Sent"
              value={formatNumber(metrics?.emails_sent || 0)}
              icon={Mail}
              color="purple"
              change={15}
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Pipeline Funnel Chart */}
        <div className="lg:col-span-2 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-semibold text-gray-900">Pipeline Overview</h2>
            <button
              onClick={() => navigate('/pipeline')}
              className="text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              View Pipeline
            </button>
          </div>
          {companies ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={pipelineChartData}
                layout="vertical"
                margin={{ top: 0, right: 20, left: 0, bottom: 0 }}
              >
                <XAxis type="number" tick={{ fontSize: 12 }} />
                <YAxis
                  type="category"
                  dataKey="stage"
                  tick={{ fontSize: 12 }}
                  width={90}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: '8px',
                    border: '1px solid #e5e7eb',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  }}
                />
                <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={28}>
                  {pipelineChartData.map((entry, index) => (
                    <Cell key={index} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[280px] items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          )}
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
              <div className="px-6 py-8 text-center text-sm text-gray-500">
                No recent activity
              </div>
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
                        <p className="text-sm text-gray-700 line-clamp-2">
                          {item.description}
                        </p>
                        <p className="mt-0.5 text-xs text-gray-400">
                          {timeAgo(item.created_at)}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
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
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Company
                  </th>
                  <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Score
                  </th>
                  <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Stage
                  </th>
                  <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                    Industry
                  </th>
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
                      <span className="font-medium text-blue-600 hover:text-blue-700">
                        {lead.name}
                      </span>
                    </td>
                    <td className="py-3 pr-4">
                      <ScoreBadge score={lead.score} size="sm" />
                    </td>
                    <td className="py-3 pr-4">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STAGE_COLORS[lead.stage]?.bg || ''} ${STAGE_COLORS[lead.stage]?.text || ''}`}
                      >
                        {STAGE_LABELS[lead.stage] || lead.stage}
                      </span>
                    </td>
                    <td className="py-3 text-sm text-gray-600">{lead.industry}</td>
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
