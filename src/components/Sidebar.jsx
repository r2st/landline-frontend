import { Link, useLocation } from 'react-router-dom';
import {
  Phone,
  LayoutDashboard,
  Kanban,
  Building2,
  Upload,
  Mail,
  Send,
  Settings,
} from 'lucide-react';
import { cn } from '../lib/utils';

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Pipeline', href: '/pipeline', icon: Kanban },
  { name: 'Companies', href: '/companies', icon: Building2 },
  { name: 'Import', href: '/import', icon: Upload },
  { name: 'Sequences', href: '/sequences', icon: Mail },
  { name: 'Email Campaigns', href: '/outreach', icon: Send },
  { name: 'Settings', href: '/settings', icon: Settings },
];

export default function Sidebar() {
  const location = useLocation();

  const isActive = (href) => {
    if (href === '/') return location.pathname === '/';
    return location.pathname.startsWith(href);
  };

  return (
    <aside className="fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-slate-800">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 px-6">
        <Phone className="h-7 w-7 text-blue-400" />
        <div>
          <span className="text-xl font-bold tracking-tight text-white">LANDLINE</span>
          <span className="ml-1.5 text-xs text-gray-400">by Apprend</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="mt-4 flex-1 space-y-1 px-3">
        {navigation.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                'group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                active
                  ? 'bg-slate-700 text-white'
                  : 'text-gray-400 hover:bg-slate-700/50 hover:text-white'
              )}
            >
              <item.icon
                className={cn(
                  'h-5 w-5 flex-shrink-0',
                  active ? 'text-white' : 'text-gray-400 group-hover:text-white'
                )}
              />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="border-t border-slate-700 px-6 py-4">
        <p className="text-xs text-gray-500">Landline v1.0</p>
      </div>
    </aside>
  );
}
