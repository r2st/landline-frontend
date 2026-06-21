import React, { useState, useEffect, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  LayoutDashboard,
  BarChart3,
  Building2,
  GitBranch,
  Upload,
  Mail,
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
} from 'lucide-react';
import { cn } from '../lib/utils';
import { emailApi } from '../api/client';

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
      { name: 'Discovery', href: '/discovery', icon: Sparkles },
      { name: 'Groups', href: '/groups', icon: Folder },
      { name: 'News', href: '/news', icon: Newspaper },
      { name: 'Import', href: '/import', icon: Upload },
      { name: 'Scan Card', href: '/scan', icon: CreditCard },
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
];

// Flatten all nav items for finding current page name
const allNavItems = [
  ...navSections.flatMap(s => s.items),
  { name: 'Settings', href: '/settings', icon: Settings },
];

export default function Layout({ children }) {
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Check for recent replies (last 24 hours) to show notification dot
  const { data: recentSends } = useQuery({
    queryKey: ['layout-reply-check'],
    queryFn: async () => {
      try {
        const data = await emailApi.getSends({ page_size: 50 });
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
        <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
