import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { HeartPulse, ChevronRight, ShieldCheck } from 'lucide-react';
import { useClients } from '../hooks/useClients';
import { HEALTH_COLORS, HEALTH_LABELS } from '../lib/constants';
import { formatDate, cn } from '../lib/utils';

const RANK = { red: 0, yellow: 1 };
const MAX = 6;

// At-risk / watch clients surfaced on the dashboard next to lead suggestions.
export default function ClientHealthAlerts() {
  const navigate = useNavigate();
  const { data: clients = [], isLoading } = useClients();

  const alerts = useMemo(() => {
    return (clients || [])
      .filter((c) => c.health_status === 'red' || c.health_status === 'yellow')
      .sort((a, b) => {
        const r = (RANK[a.health_status] ?? 9) - (RANK[b.health_status] ?? 9);
        if (r !== 0) return r;
        return (a.health_score ?? 100) - (b.health_score ?? 100);
      })
      .slice(0, MAX);
  }, [clients]);

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
        <h2 className="flex items-center gap-2 text-base font-semibold text-gray-900">
          <HeartPulse className="h-4 w-4 text-rose-500" />
          Client Health Alerts
        </h2>
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
          {alerts.length}
        </span>
      </div>
      {isLoading ? (
        <div className="space-y-3 p-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex animate-pulse items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-gray-200" />
              <div className="flex-1 space-y-1">
                <div className="h-3 w-3/4 rounded bg-gray-200" />
                <div className="h-2.5 w-1/4 rounded bg-gray-200" />
              </div>
            </div>
          ))}
        </div>
      ) : alerts.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-6 py-8 text-center">
          <ShieldCheck className="h-8 w-8 text-green-400" />
          <p className="mt-2 text-sm font-medium text-gray-900">All clients healthy</p>
          <p className="mt-0.5 text-sm text-gray-500">No clients are at risk or need attention right now.</p>
        </div>
      ) : (
        <ul className="divide-y divide-gray-50">
          {alerts.map((c) => {
            const palette = HEALTH_COLORS[c.health_status] || HEALTH_COLORS.yellow;
            return (
              <li key={c.id}>
                <button
                  type="button"
                  onClick={() => navigate(`/companies/${c.id}`)}
                  className="flex w-full items-center gap-3 px-6 py-3 text-left transition-colors hover:bg-gray-50"
                >
                  <span className={cn('flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full', palette.bg)}>
                    <HeartPulse className={cn('h-4 w-4', palette.text)} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-gray-900">{c.name}</span>
                    <span className="block text-xs text-gray-500">
                      {HEALTH_LABELS[c.health_status]}
                      {c.health_score != null && <span> · {c.health_score}/100</span>}
                      {c.last_contact_at && <span> · last contact {formatDate(c.last_contact_at)}</span>}
                    </span>
                  </span>
                  <ChevronRight className="h-4 w-4 flex-shrink-0 text-gray-300" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
