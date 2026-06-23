import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { cn } from '../lib/utils';

const colorMap = {
  blue: { bg: 'bg-blue-100', text: 'text-blue-600', gradient: 'from-blue-500 to-blue-600', lightBg: 'bg-blue-50' },
  green: { bg: 'bg-green-100', text: 'text-green-600', gradient: 'from-green-500 to-emerald-600', lightBg: 'bg-green-50' },
  purple: { bg: 'bg-purple-100', text: 'text-purple-600', gradient: 'from-purple-500 to-purple-600', lightBg: 'bg-purple-50' },
  orange: { bg: 'bg-orange-100', text: 'text-orange-600', gradient: 'from-orange-400 to-orange-600', lightBg: 'bg-orange-50' },
  red: { bg: 'bg-red-100', text: 'text-red-600', gradient: 'from-red-500 to-red-600', lightBg: 'bg-red-50' },
  yellow: { bg: 'bg-yellow-100', text: 'text-yellow-600', gradient: 'from-yellow-400 to-amber-500', lightBg: 'bg-yellow-50' },
  indigo: { bg: 'bg-indigo-100', text: 'text-indigo-600', gradient: 'from-indigo-500 to-indigo-600', lightBg: 'bg-indigo-50' },
  teal: { bg: 'bg-teal-100', text: 'text-teal-600', gradient: 'from-teal-500 to-teal-600', lightBg: 'bg-teal-50' },
};

export default function MetricCard({ title, value, change, subtitle, icon: Icon, color = 'blue', sparkline }) {
  const isPositive = change >= 0;
  const palette = colorMap[color] || colorMap.blue;

  return (
    <div className="group relative overflow-hidden rounded-xl border border-gray-200 bg-white p-6 shadow-sm transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5">
      {/* Subtle gradient accent bar at top */}
      <div className={cn('absolute inset-x-0 top-0 h-1 bg-gradient-to-r', palette.gradient)} />

      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {change !== undefined && change !== null && (
            <div className="flex items-center gap-1">
              {isPositive ? (
                <ArrowUpRight className="h-4 w-4 text-green-500" />
              ) : (
                <ArrowDownRight className="h-4 w-4 text-red-500" />
              )}
              <span
                className={cn(
                  'text-sm font-medium',
                  isPositive ? 'text-green-600' : 'text-red-600'
                )}
              >
                {isPositive ? '+' : ''}{change}%
              </span>
              <span className="text-xs text-gray-400">vs last week</span>
            </div>
          )}
          {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
        </div>

        {Icon && (
          <div className={cn('flex h-12 w-12 items-center justify-center rounded-xl transition-transform group-hover:scale-110', palette.bg)}>
            <Icon className={cn('h-6 w-6', palette.text)} />
          </div>
        )}
      </div>

      {/* Optional sparkline area */}
      {sparkline && <div className="mt-3 -mx-2">{sparkline}</div>}
    </div>
  );
}
