import { useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Search, Users, HeartPulse, DollarSign, AlertTriangle, LayoutDashboard, CalendarClock, LayoutGrid, LayoutList, Star, Clock, AlertCircle, Phone } from 'lucide-react';
import DataTable from '../components/DataTable';
import HealthBadge from '../components/HealthBadge';
import MetricCard from '../components/MetricCard';
import EmptyState from '../components/EmptyState';
import { useClients } from '../hooks/useClients';
import { HEALTH_STATUSES, HEALTH_LABELS, HEALTH_COLORS } from '../lib/constants';
import { formatCurrency, formatDate, cn } from '../lib/utils';

export default function Clients() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [healthFilter, setHealthFilter] = useState('');
  const [viewMode, setViewMode] = useState('table');

  const { data: clients = [], isLoading, isError } = useClients();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (clients || []).filter((c) => {
      if (healthFilter && c.health_status !== healthFilter) return false;
      if (q && !(c.name || '').toLowerCase().includes(q)) return false;
      return true;
    });
  }, [clients, search, healthFilter]);

  const stats = useMemo(() => {
    const list = clients || [];
    const revenue = list.reduce((sum, c) => sum + (Number(c.deal_value) || 0), 0);
    const atRisk = list.filter((c) => c.health_status === 'red').length;
    const scored = list.filter((c) => c.health_score != null);
    const avgHealth = scored.length
      ? Math.round(scored.reduce((s, c) => s + c.health_score, 0) / scored.length)
      : null;
    const healthCounts = { green: 0, yellow: 0, red: 0 };
    list.forEach((c) => { if (healthCounts[c.health_status] !== undefined) healthCounts[c.health_status]++; });
    const atRiskClients = list.filter((c) => c.health_status === 'red');
    return { count: list.length, revenue, atRisk, avgHealth, healthCounts, atRiskClients };
  }, [clients]);

  const columns = [
    {
      key: 'name',
      label: 'Client',
      render: (val, row) => (
        <span className="font-medium text-blue-600 hover:text-blue-700">{row.name}</span>
      ),
    },
    {
      key: 'health_score',
      label: 'Health',
      render: (val, row) => <HealthBadge status={row.health_status} score={row.health_score} size="sm" showScore />,
    },
    {
      key: 'deal_value',
      label: 'Deal Value',
      render: (val) => (val != null ? formatCurrency(val) : '—'),
    },
    {
      key: 'last_contact_at',
      label: 'Last Contact',
      render: (val) => (val ? formatDate(val) : '—'),
    },
    {
      key: 'upcoming_tasks',
      label: 'Upcoming Tasks',
      render: (val) =>
        val ? (
          <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">
            {val}
          </span>
        ) : (
          <span className="text-gray-400">0</span>
        ),
    },
    {
      key: 'industry',
      label: 'Industry',
      render: (val) => val || '—',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-bold text-gray-900">
            <Users className="h-5 w-5 text-teal-500" />
            Clients
          </h1>
          <p className="mt-1 text-sm text-gray-500">Your active clients, their health, and account value.</p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/client-dashboard')}
          className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          <LayoutDashboard className="h-4 w-4" />
          Client Dashboard
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <MetricCard title="Active Clients" value={stats.count} icon={Users} color="teal" />
        <MetricCard title="Monthly Recurring Revenue" value={formatCurrency(stats.revenue, { compact: true })} icon={DollarSign} color="green" subtitle="Based on deal values" />
        <MetricCard title="Avg Client Lifetime" value="—" icon={Clock} color="purple" subtitle="Track client start dates to calculate" />
        <MetricCard title="Churn Rate" value="—" icon={AlertTriangle} color="red" subtitle="Based on client retention data" />
      </div>

      {/* Client Health Overview */}
      {stats.count > 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-4">
          <h3 className="mb-3 text-sm font-semibold text-gray-700">Client Health Overview</h3>
          <div className="h-4 w-full overflow-hidden rounded-full bg-gray-100 flex">
            {HEALTH_STATUSES.map((s) => {
              const pct = (stats.healthCounts[s] / stats.count) * 100;
              if (pct === 0) return null;
              return (
                <div
                  key={s}
                  style={{ width: `${pct}%`, backgroundColor: HEALTH_COLORS[s].hex }}
                  className="h-full transition-all duration-300"
                />
              );
            })}
          </div>
          <div className="mt-2 flex gap-4">
            {HEALTH_STATUSES.map((s) => (
              <div key={s} className="flex items-center gap-1.5 text-xs text-gray-600">
                <span className={cn('inline-block h-2.5 w-2.5 rounded-full', HEALTH_COLORS[s].dot)} />
                {HEALTH_LABELS[s]}: {stats.healthCounts[s]}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Placeholder cards row */}
      <div className="grid gap-4 sm:grid-cols-2">
        {/* Upcoming Renewals placeholder */}
        <div className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50/50 p-5">
          <div className="flex items-center gap-2 text-gray-500">
            <CalendarClock className="h-5 w-5" />
            <h3 className="text-sm font-semibold">Upcoming Renewals</h3>
          </div>
          <p className="mt-2 text-sm text-gray-400">
            Set renewal dates on client profiles to see upcoming renewals here.
          </p>
        </div>

        {/* Client Satisfaction (NPS) placeholder */}
        <div className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50/50 p-5">
          <div className="flex items-center gap-2 text-gray-500">
            <Star className="h-5 w-5" />
            <h3 className="text-sm font-semibold">Client Satisfaction (NPS)</h3>
          </div>
          <p className="mt-2 text-sm text-gray-400">
            Track client satisfaction by adding NPS scores to client profiles.
          </p>
          <Link to="/settings" className="mt-2 inline-block text-sm font-medium text-blue-600 hover:text-blue-700">
            Configure in Settings
          </Link>
        </div>
      </div>

      {/* Search + health filter */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full sm:flex-1" style={{ minWidth: '200px', maxWidth: '400px' }}>
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search clients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 w-full rounded-lg border border-gray-300 bg-white pl-9 pr-3 text-sm text-gray-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setHealthFilter('')}
            className={cn(
              'rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
              !healthFilter ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
            )}
          >
            All
          </button>
          {HEALTH_STATUSES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setHealthFilter(healthFilter === s ? '' : s)}
              className={cn(
                'rounded-lg border px-3 py-2 text-sm font-medium transition-colors',
                healthFilter === s ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
              )}
            >
              {HEALTH_LABELS[s]}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center rounded-lg border border-gray-300 bg-white">
          <button
            type="button"
            onClick={() => setViewMode('table')}
            className={cn(
              'rounded-l-lg p-2 transition-colors',
              viewMode === 'table' ? 'bg-blue-50 text-blue-700' : 'text-gray-500 hover:bg-gray-50'
            )}
            title="List view"
          >
            <LayoutList className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setViewMode('card')}
            className={cn(
              'rounded-r-lg p-2 transition-colors',
              viewMode === 'card' ? 'bg-blue-50 text-blue-700' : 'text-gray-500 hover:bg-gray-50'
            )}
            title="Card view"
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* At Risk Alerts */}
      {!isLoading && !isError && stats.atRiskClients.length > 0 && healthFilter !== 'red' && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <div className="mb-3 flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-600" />
            <h3 className="text-sm font-semibold text-red-800">At Risk Clients</h3>
          </div>
          <div className="space-y-2">
            {stats.atRiskClients.slice(0, 5).map((client) => (
              <div
                key={client.id}
                className="flex flex-wrap items-center gap-3 rounded-md bg-white p-2.5 text-sm cursor-pointer hover:bg-red-50/50 transition-colors"
                onClick={() => navigate(`/companies/${client.id}`)}
              >
                <span className="font-medium text-gray-900">{client.name}</span>
                <HealthBadge status={client.health_status} size="sm" />
                {client.deal_value != null && (
                  <span className="text-gray-600">{formatCurrency(client.deal_value)}</span>
                )}
                <span className="ml-auto flex items-center gap-1 text-xs text-red-600">
                  <Phone className="h-3 w-3" />
                  Schedule a check-in call
                </span>
              </div>
            ))}
          </div>
          {stats.atRiskClients.length > 5 && (
            <button
              type="button"
              onClick={() => setHealthFilter('red')}
              className="mt-3 text-sm font-medium text-red-700 hover:text-red-800"
            >
              View all {stats.atRiskClients.length} at-risk clients
            </button>
          )}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
        </div>
      ) : isError ? (
        <EmptyState title="Failed to load clients" description="There was an error loading clients. Please try again." icon={Users} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No clients yet"
          description={
            search || healthFilter
              ? 'No clients match your search or filter.'
              : 'Companies move here once they reach the Client stage in your pipeline.'
          }
          action={!search && !healthFilter ? { label: 'View Pipeline', onClick: () => navigate('/pipeline') } : undefined}
        />
      ) : viewMode === 'card' ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((client) => (
            <div
              key={client.id}
              onClick={() => navigate(`/companies/${client.id}`)}
              className="cursor-pointer rounded-lg border border-gray-200 bg-white p-4 transition-shadow hover:shadow-md"
            >
              <div className="mb-3 flex items-center justify-between">
                <h3 className="font-medium text-gray-900 truncate">{client.name}</h3>
                <HealthBadge status={client.health_status} score={client.health_score} size="sm" showScore />
              </div>
              <div className="space-y-1.5 text-sm text-gray-600">
                <div className="flex items-center justify-between">
                  <span>Deal Value</span>
                  <span className="font-medium text-gray-900">
                    {client.deal_value != null ? formatCurrency(client.deal_value) : '—'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Last Contact</span>
                  <span>{client.last_contact_at ? formatDate(client.last_contact_at) : '—'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Industry</span>
                  <span>{client.industry || '—'}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <DataTable
          columns={columns}
          data={filtered}
          onRowClick={(row) => navigate(`/companies/${row.id}`)}
          emptyMessage="No clients match your criteria"
        />
      )}
    </div>
  );
}
