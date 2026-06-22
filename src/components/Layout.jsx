import React, { useState, useEffect, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  LayoutDashboard,
  BarChart3,
  Building2,
  GitBranch,
  Upload,
  Send,
  Bell,
  Settings,
  Phone,
  Menu,
  X,
  Sparkles,
  ListOrdered,
  Folder,
  Newspaper,
  Rocket,
  CreditCard,
  Users,
  Search,
  HeartPulse,
  CheckSquare,
  PieChart,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { emailApi } from '../api/client';
import CommandPalette from './CommandPalette';

const navSections = [
  {
    label: 'Overview',
    items: [
      { name: 'Dashboard', href: '/', icon: LayoutDashboard },
      { name: 'Analytics', href: '/analytics', icon: BarChart3 },
      { name: 'Pipeline', href: '/pipeline', icon: GitBranch },
    ],
  },
  {
    label: 'Leads',
    items: [
      { name: 'Companies', href: '/companies', icon: Building2 },
      { name: 'Contacts', href: '/contacts', icon: Users },
      { name: 'Discovery', href: '/discovery', icon: Sparkles },
      { name: 'Groups', href: '/groups', icon: Folder },
      { name: 'News', href: '/news', icon: Newspaper },
      { name: 'Import', href: '/import', icon: Upload },
      { name: 'Business Card', href: '/scan', icon: CreditCard },
    ],
  },
  {
    label: 'Outreach',
    items: [
      { name: 'Campaigns', href: '/outreach', icon: Send },
      { name: 'Sequences', href: '/sequences', icon: ListOrdered },
      { name: 'Follow-ups', href: '/follow-ups', icon: Bell },
      { name: 'Demos', href: '/demos', icon: Rocket },
    ],
  },
  {
    label: 'Clients',
    items: [
      { name: 'Clients', href: '/clients', icon: HeartPulse },
      { name: 'Client Dashboard', href: '/client-dashboard', icon: PieChart },
      { name: 'Tasks', href: '/tasks', icon: CheckSquare },
      { name: 'Reports', href: '/reports', icon: BarChart3 },
    ],
  },
];

// Flatten all nav items for finding current page name
const allNavItems = [
  ...navSections.flatMap(s => s.items),
  { name: 'Settings', href: '/settings', icon: Settings },
];

export default function Layout({ children }) {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  // ⌘K / Ctrl+K opens the command palette from anywhere.
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Check for recent replies (last 24 hours) to show notification dot
  const { data: recentSends } = useQuery({
    queryKey: ['layout-reply-check'],
    queryFn: async () => {
      try {
        const data = await emailApi.getSends({ limit: 50 });
        const items = data?.items || data;
        return Array.isArray(items) ? items : [];
      } catch {
        return [];
      }
    },
    staleTime: 60000, // check every 60 seconds
    refetchInterval: 60000,
    retry: false,
  });

  const hasNewReplies = useMemo(() => {
    if (!recentSends?.length) return false;
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return recentSends.some((s) => {
      if (s.status !== 'replied') return false;
      const d = new Date(s.replied_at || s.updated_at || s.sent_at);
      return !isNaN(d) && d > cutoff;
    });
  }, [recentSends]);

  const currentPage = allNavItems.find(
    item => item.href === location.pathname ||
    (item.href !== '/' && location.pathname.startsWith(item.href))
  );

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (mobileOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileOpen]);

  const NavLink = ({ item, showBadge }) => {
    const isActive = location.pathname === item.href ||
      (item.href !== '/' && location.pathname.startsWith(item.href));
    return (
      <Link
        to={item.href}
        className={cn(
          'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
          isActive
            ? 'bg-blue-600/20 text-blue-400'
            : 'text-gray-400 hover:bg-white/5 hover:text-white'
        )}
      >
        <item.icon className="h-5 w-5 flex-shrink-0" />
        {item.name}
        {showBadge && (
          <span className="ml-auto h-2 w-2 rounded-full bg-red-500 flex-shrink-0" />
        )}
      </Link>
    );
  };

  const SidebarContent = (
    <>
      <div className="flex items-center justify-between gap-2 px-5 py-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Phone className="h-6 w-6 text-blue-400" />
          <span className="text-lg font-bold tracking-tight">Landline</span>
        </div>
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          className="-mr-1 rounded-md p-1.5 text-gray-400 hover:bg-white/5 hover:text-white lg:hidden"
          aria-label="Close menu"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
        {navSections.map((section) => (
          <div key={section.label}>
            <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
              {section.label}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => (
                <NavLink
                  key={item.name}
                  item={item}
                  showBadge={item.name === 'Campaigns' && hasNewReplies}
                />
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-white/10 px-3 py-2">
        <NavLink item={{ name: 'Settings', href: '/settings', icon: Settings }} />
        <div className="px-3 pt-2 pb-1">
          <div className="text-[11px] text-gray-600">Landline v1.0 &middot; B2B Lead Gen</div>
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile top bar */}
      <header className="fixed inset-x-0 top-0 z-30 flex h-14 items-center gap-3 border-b border-gray-200 bg-navy-900 px-4 text-white lg:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="-ml-1 rounded-md p-2 text-gray-300 hover:bg-white/5 hover:text-white"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2 min-w-0">
          <Phone className="h-5 w-5 text-blue-400 flex-shrink-0" />
          <span className="font-semibold tracking-tight truncate">
            {currentPage ? currentPage.name : 'Landline'}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setPaletteOpen(true)}
          className="ml-auto -mr-1 rounded-md p-2 text-gray-300 hover:bg-white/5 hover:text-white"
          aria-label="Search"
        >
          <Search className="h-5 w-5" />
        </button>
      </header>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-60 flex-col bg-navy-900 text-white transition-transform duration-200 ease-in-out lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {SidebarContent}
      </aside>

      {/* Main content */}
      <main className="pt-14 lg:pt-0 lg:pl-60">
        {/* Desktop top utility bar */}
        <header className="sticky top-0 z-20 hidden h-14 items-center gap-4 border-b border-gray-200 bg-white/80 px-8 backdrop-blur lg:flex">
          <div className="flex items-center gap-2 text-sm text-gray-400">
            <span>Landline</span>
            <span className="text-gray-300">/</span>
            <span className="font-medium text-gray-700">{currentPage ? currentPage.name : 'Dashboard'}</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 py-1.5 pl-3 pr-2 text-sm text-gray-500 transition-colors hover:border-gray-300 hover:bg-gray-100"
            >
              <Search className="h-4 w-4" />
              <span>Search…</span>
              <kbd className="rounded border border-gray-200 bg-white px-1.5 py-0.5 text-[11px] font-medium text-gray-400">⌘K</kbd>
            </button>
            <Link
              to="/outreach"
              className="relative rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
              aria-label="Email replies"
              title={hasNewReplies ? 'New replies in the last 24h' : 'Email campaigns'}
            >
              <Bell className="h-5 w-5" />
              {hasNewReplies && (
                <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
              )}
            </Link>
          </div>
        </header>

        <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
          {children}
        </div>
      </main>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  );
}
