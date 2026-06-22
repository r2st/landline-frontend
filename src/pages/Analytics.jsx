import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Mail,
  Eye,
  MessageSquare,
  MousePointerClick,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  Activity,
  Send,
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
  Legend,
} from 'recharts';
import ScoreBadge from '../components/ScoreBadge';
import EmptyState from '../components/EmptyState';
import {
  useAnalyticsMetrics,
  useEmailTrendsAnalytics,
  useTopEngagedLeads,
  useRecentEmailActivity,
  useEmailSends,
} from '../hooks/useAnalytics';
import { STAGES, STAGE_LABELS, STAGE_COLORS } from '../lib/constants';
import { formatNumber, timeAgo, cn } from '../lib/utils';

/* ---------- helpers ---------- */

function shortDate(d) {
  const parts = String(d).split('-');
  if (parts.length !== 3) return d;
  const dt = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  return dt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function pctChange(current, previous) {
  if (!previous) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

/* ---------- skeleton / card components ---------- */

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

function ChartCard({ title, children, className }) {
  return (
    <div className={cn('rounded-xl border border-gray-200 bg-white p-6 shadow-sm', className)}>
      <h2 className="mb-4 text-base font-semibold text-gray-900">{title}</h2>
      {children}
    </div>
  );
}

function RateCard({ title, value, icon: Icon, color, subtitle, colorCode }) {
  const colorMap = {
    blue: { bg: 'bg-blue-100', text: 'text-blue-600' },
    green: { bg: 'bg-green-100', text: 'text-green-600' },
    purple: { bg: 'bg-purple-100', text: 'text-purple-600' },
    teal: { bg: 'bg-teal-100', text: 'text-teal-600' },
    yellow: { bg: 'bg-yellow-100', text: 'text-yellow-600' },
    red: { bg: 'bg-red-100', text: 'text-red-600' },
  };
  const palette = colorMap[color] || colorMap.blue;

  return (
    <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="space-y-1">
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <p className={cn('text-2xl font-bold', colorCode || 'text-gray-900')}>{value}</p>
        {subtitle && (
          <div className="flex items-center gap-1">
            {subtitle.trend >= 0 ? (
              <TrendingUp className="h-3.5 w-3.5 text-green-500" />
            ) : (
              <TrendingDown className="h-3.5 w-3.5 text-red-500" />
            )}
            <span
              className={cn(
                'text-xs font-medium',
                subtitle.trend >= 0 ? 'text-green-600' : 'text-red-600'
              )}
            >
              {subtitle.trend >= 0 ? '+' : ''}
              {subtitle.trend}% {subtitle.label}
            </span>
          </div>
        )}
      </div>
      {Icon && (
        <div className={cn('flex h-12 w-12 items-center justify-center rounded-full', palette.bg)}>
          <Icon className={cn('h-6 w-6', palette.text)} />
        </div>
      )}
    </div>
  );
}

/* ---------- send timing heatmap ---------- */

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const HOURS = ['6a', '8a', '10a', '12p', '2p', '4p', '6p', '8p'];

function SendTimingHeatmap({ emailSends }) {
  // Compute heatmap from real email send timestamps.
  // Groups sends by day-of-week (Mon=0) and hour bucket.
  const { heatData, maxVal } = useMemo(() => {
    const hourBuckets = [6, 8, 10, 12, 14, 16, 18, 20]; // start of each 2-hour window
    // 7 days x 8 hour-buckets, initialised to 0
    const grid = Array.from({ length: 7 }, () => Array(hourBuckets.length).fill(0));

    const items = Array.isArray(emailSends) ? emailSends : [];
    items.forEach((send) => {
      const ts = send.sent_at || send.created_at;
      if (!ts) return;
      const dt = new Date(ts);
      if (isNaN(dt)) return;
      const dow = (dt.getDay() + 6) % 7; // Mon=0 ... Sun=6
      const hour = dt.getHours();
      // Find which bucket this hour falls into
      let bucketIdx = -1;
      for (let i = hourBuckets.length - 1; i >= 0; i--) {
        if (hour >= hourBuckets[i]) { bucketIdx = i; break; }
      }
      if (bucketIdx >= 0) grid[dow][bucketIdx]++;
    });

    let peak = 0;
    grid.forEach((row) => row.forEach((v) => { if (v > peak) peak = v; }));

    return { heatData: grid, maxVal: peak || 1 };
  }, [emailSends]);

  function cellColor(val) {
    if (val === 0) return 'bg-gray-50';
    const intensity = val / maxVal;
    if (intensity > 0.75) return 'bg-blue-600 text-white';
    if (intensity > 0.5) return 'bg-blue-400 text-white';
    if (intensity > 0.25) return 'bg-blue-200 text-blue-800';
    return 'bg-blue-100 text-blue-700';
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr>
            <th className="p-1 text-xs text-gray-400" />
            {HOURS.map((h) => (
              <th key={h} className="p-1 text-center text-xs font-medium text-gray-500">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {DAYS.map((day, di) => (
            <tr key={day}>
              <td className="p-1 text-xs font-medium text-gray-500">{day}</td>
              {HOURS.map((_, hi) => (
                <td key={hi} className="p-1">
                  <div
                    className={cn(
                      'flex h-8 items-center justify-center rounded text-xs font-medium',
                      cellColor(heatData[di][hi])
                    )}
                  >
                    {heatData[di][hi] > 0 ? heatData[di][hi] : ''}
                  </div>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="mt-2 flex items-center justify-end gap-2 text-xs text-gray-400">
        <span>Low</span>
        <div className="flex gap-0.5">
          <div className="h-3 w-6 rounded-sm bg-blue-100" />
          <div className="h-3 w-6 rounded-sm bg-blue-200" />
          <div className="h-3 w-6 rounded-sm bg-blue-400" />
          <div className="h-3 w-6 rounded-sm bg-blue-600" />
        </div>
        <span>High</span>
      </div>
    </div>
  );
}

/* ---------- email status badge ---------- */

function EmailStatusBadge({ status }) {
  const statusConfig = {
    email_sent: { label: 'Sent', bg: 'bg-blue-100', text: 'text-blue-700' },
    email_opened: { label: 'Opened', bg: 'bg-green-100', text: 'text-green-700' },
    email_replied: { label: 'Replied', bg: 'bg-purple-100', text: 'text-purple-700' },
    email_clicked: { label: 'Clicked', bg: 'bg-teal-100', text: 'text-teal-700' },
    sent: { label: 'Sent', bg: 'bg-blue-100', text: 'text-blue-700' },
    delivered: { label: 'Delivered', bg: 'bg-blue-100', text: 'text-blue-700' },
    opened: { label: 'Opened', bg: 'bg-green-100', text: 'text-green-700' },
    replied: { label: 'Replied', bg: 'bg-purple-100', text: 'text-purple-700' },
    clicked: { label: 'Clicked', bg: 'bg-teal-100', text: 'text-teal-700' },
    bounced: { label: 'Bounced', bg: 'bg-red-100', text: 'text-red-700' },
    failed: { label: 'Failed', bg: 'bg-red-100', text: 'text-red-700' },
  };
  const config = statusConfig[status] || { label: status || 'Unknown', bg: 'bg-gray-100', text: 'text-gray-700' };
  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', config.bg, config.text)}>
      {config.label}
    </span>
  );
}

/* ---------- custom tooltip ---------- */

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 shadow-md">
      <p className="mb-1 text-xs font-medium text-gray-500">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} className="text-sm" style={{ color: entry.color }}>
          {entry.name}: {formatNumber(entry.value)}
        </p>
      ))}
    </div>
  );
}

/* ========== MAIN COMPONENT ========== */

export default function Analytics() {
  const navigate = useNavigate();
  const { data: metrics, isLoading: metricsLoading } = useAnalyticsMetrics();
  const { data: trends, isLoading: trendsLoading } = useEmailTrendsAnalytics(30);
  const { data: topLeads, isLoading: leadsLoading } = useTopEngagedLeads(10);
  const { data: recentEmails, isLoading: emailsLoading } = useRecentEmailActivity(20);
  const { data: emailSends, isLoading: sendsLoading } = useEmailSends(20);
  const { data: allEmailSends } = useEmailSends(500); // larger set for heatmap

  // --- Derived data ---

  const emailTrend = pctChange(
    metrics?.emails_sent_last_week || 0,
    metrics?.emails_sent_prev_week || 0
  );

  const openRateColor = useMemo(() => {
    const rate = metrics?.open_rate || 0;
    if (rate >= 25) return 'text-green-600';
    if (rate >= 15) return 'text-yellow-600';
    return 'text-red-600';
  }, [metrics?.open_rate]);

  // Email activity over time (line chart data)
  const trendData = useMemo(() => {
    return (trends || []).map((t) => ({
      date: shortDate(t.date),
      Sent: t.sent || 0,
      Opened: t.opened || t.opens || 0,
      Replied: t.replied || t.replies || 0,
    }));
  }, [trends]);

  // Pipeline conversion funnel
  const funnelData = useMemo(() => {
    const stageCounts = Object.fromEntries(
      (metrics?.pipeline || []).map((p) => [p.stage, p.count])
    );
    const funnelStages = ['new', 'scored', 'contacted', 'engaged', 'qualified', 'opportunity'];
    return funnelStages.map((stage) => ({
      stage: STAGE_LABELS[stage] || stage,
      count: stageCounts[stage] || 0,
      fill: STAGE_COLORS[stage]?.hex || '#6b7280',
    }));
  }, [metrics?.pipeline]);

  // Top performing industries (horizontal bar)
  const industryData = useMemo(() => {
    return (metrics?.industry_breakdown || [])
      .slice(0, 8)
      .map((i) => ({
        name: i.industry || 'Unknown',
        count: i.count || 0,
      }));
  }, [metrics?.industry_breakdown]);

  // Combine recent email activity + email sends for the activity log
  const emailActivityLog = useMemo(() => {
    const activityItems = (recentEmails || []).map((item) => ({
      id: item.id,
      company: item.company_name || item.description?.split(' ').slice(-2).join(' ') || 'Unknown',
      subject: item.subject || item.description || '',
      status: item.type || item.status || 'email_sent',
      date: item.created_at || item.sent_at,
      company_id: item.company_id,
    }));
    const sendItems = (emailSends || []).map((item) => ({
      id: `send-${item.id}`,
      company: item.company_name || item.to_name || 'Unknown',
      subject: item.subject || '',
      status: item.status || 'sent',
      date: item.sent_at || item.created_at,
      company_id: item.company_id,
    }));
    // Merge, deduplicate, and sort
    const merged = [...activityItems, ...sendItems];
    const seen = new Set();
    const unique = merged.filter((item) => {
      const key = `${item.company}-${item.subject}-${item.status}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    return unique.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 20);
  }, [recentEmails, emailSends]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
        <p className="mt-1 text-sm text-gray-500">
          Email campaign performance and lead engagement insights
        </p>
      </div>

      {/* Top Metrics Row */}
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
            <RateCard
              title="Total Emails Sent"
              value={formatNumber(metrics?.emails_sent || 0)}
              icon={Mail}
              color="blue"
              subtitle={{ trend: emailTrend, label: 'vs last week' }}
            />
            <RateCard
              title="Open Rate"
              value={`${metrics?.open_rate || 0}%`}
              icon={Eye}
              color="green"
              colorCode={openRateColor}
            />
            <RateCard
              title="Reply Rate"
              value={`${metrics?.reply_rate || 0}%`}
              icon={MessageSquare}
              color="purple"
            />
            <RateCard
              title="Click Rate"
              value={`${metrics?.click_rate || 0}%`}
              icon={MousePointerClick}
              color="teal"
            />
          </>
        )}
      </div>

      {/* Charts Section (2x2) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Email Activity Over Time */}
        <ChartCard title="Email Activity (Last 30 Days)">
          {trendsLoading ? (
            <div className="flex h-[280px] items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : trendData.length === 0 ? (
            <EmptyState
              icon={Mail}
              title="No email data yet"
              description="Send outreach emails to see activity trends here."
            />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={trendData} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip content={<ChartTooltip />} />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                />
                <Line
                  type="monotone"
                  dataKey="Sent"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dot={{ r: 2 }}
                  activeDot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="Opened"
                  stroke="#8b5cf6"
                  strokeWidth={2}
                  dot={{ r: 2 }}
                  activeDot={{ r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="Replied"
                  stroke="#14b8a6"
                  strokeWidth={2}
                  dot={{ r: 2 }}
                  activeDot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Pipeline Conversion Funnel */}
        <ChartCard title="Pipeline Conversion Funnel">
          {metricsLoading ? (
            <div className="flex h-[280px] items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={funnelData}
                margin={{ top: 0, right: 20, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="stage" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]} barSize={36}>
                  {funnelData.map((entry, index) => (
                    <Cell key={index} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Top Performing Industries */}
        <ChartCard title="Top Performing Industries">
          {metricsLoading ? (
            <div className="flex h-[280px] items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
            </div>
          ) : industryData.length === 0 ? (
            <EmptyState
              title="No industry data"
              description="Add companies with industry info to see this breakdown."
            />
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={industryData}
                layout="vertical"
                margin={{ top: 0, right: 20, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 12 }} allowDecimals={false} />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 11 }}
                  width={120}
                />
                <Tooltip content={<ChartTooltip />} />
                <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={20} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Send Timing Heatmap */}
        <ChartCard title="Best Send Times (Engagement Score)">
          <SendTimingHeatmap emailSends={allEmailSends || emailSends} />
        </ChartCard>
      </div>

      {/* Tables Section */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Top 10 Most Engaged Leads */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
            <h2 className="text-base font-semibold text-gray-900">
              Top Engaged Leads
            </h2>
            <button
              onClick={() => navigate('/companies')}
              className="flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              View All
              <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="overflow-x-auto">
            {leadsLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
              </div>
            ) : (topLeads || []).length === 0 ? (
              <div className="px-6 py-8 text-center text-sm text-gray-500">
                No scored leads yet. Score companies to see engagement data.
              </div>
            ) : (
              <table className="min-w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Company
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Score
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Stage
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">
                      Engagement
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {(topLeads || []).slice(0, 10).map((lead, idx) => (
                    <tr
                      key={lead.id || idx}
                      className="cursor-pointer transition-colors hover:bg-gray-50"
                      onClick={() => lead.id && navigate(`/companies/${lead.id}`)}
                    >
                      <td className="whitespace-nowrap px-6 py-3">
                        <span className="font-medium text-blue-600 hover:text-blue-700">
                          {lead.name}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        {lead.score != null ? (
                          <ScoreBadge score={lead.score} size="sm" />
                        ) : (
                          <span className="text-sm text-gray-400">--</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <span
                          className={cn(
                            'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium',
                            STAGE_COLORS[lead.stage]?.bg || '',
                            STAGE_COLORS[lead.stage]?.text || ''
                          )}
                        >
                          {STAGE_LABELS[lead.stage] || lead.stage || '--'}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <span className="text-sm font-semibold text-gray-700">
                          {lead.total_interactions || 0}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Recent Email Activity Log */}
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
            <h2 className="text-base font-semibold text-gray-900">
              Recent Email Activity
            </h2>
            <Activity className="h-4 w-4 text-gray-400" />
          </div>
          <div className="max-h-[440px] overflow-y-auto">
            {(emailsLoading && sendsLoading) ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
              </div>
            ) : emailActivityLog.length === 0 ? (
              <div className="px-6 py-8 text-center text-sm text-gray-500">
                No email activity yet. Send campaigns to see activity here.
              </div>
            ) : (
              <ul className="divide-y divide-gray-50">
                {emailActivityLog.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-gray-50 cursor-pointer"
                    onClick={() =>
                      item.company_id && navigate(`/companies/${item.company_id}`)
                    }
                  >
                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-50">
                      <Send className="h-3.5 w-3.5 text-blue-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium text-gray-700">
                          {item.company}
                        </p>
                        <EmailStatusBadge status={item.status} />
                      </div>
                      <p className="mt-0.5 truncate text-xs text-gray-400">
                        {item.subject || 'No subject'}
                      </p>
                    </div>
                    <span className="flex-shrink-0 text-xs text-gray-400">
                      {item.date ? timeAgo(item.date) : ''}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
