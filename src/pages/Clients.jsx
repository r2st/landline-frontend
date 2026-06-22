import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Users, HeartPulse, DollarSign, AlertTriangle, LayoutDashboard } from 'lucide-react';
import DataTable from '../components/DataTable';
import HealthBadge from '../components/HealthBadge';
import MetricCard from '../components/MetricCard';
import EmptyState from '../components/EmptyState';
import { useClients } from '../hooks/useClients';
import { HEALTH_STATUSES, HEALTH_LABELS } from '../lib/constants';
import { formatCurrency, formatDate, cn } from '../lib/utils';

export default function Clients() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [healthFilter, setHealthFilter] = useState('');

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
    return { count: list.length, revenue, atRisk, avgHealth };
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
        <MetricCard title="Total Clients" value={stats.count} icon={Users} color="teal" />
        <MetricCard title="Total Revenue" value={formatCurrency(stats.revenue, { compact: true })} icon={DollarSign} color="green" />
        <MetricCard title="Avg Health" value={stats.avgHealth != null ? stats.avgHealth : '—'} icon={HeartPulse} color="purple" />
        <MetricCard title="At Risk" value={stats.atRisk} icon={AlertTriangle} color="red" />
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
      </div>

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
