import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Search,
  Building2,
  Users,
  Sparkles,
  Upload,
  CreditCard,
  Send,
  GitBranch,
  Newspaper,
  Bell,
  Plus,
  CornerDownLeft,
  ArrowUp,
  ArrowDown,
  HeartPulse,
  CheckSquare,
  BarChart3,
  DollarSign,
  Inbox,
  BookOpen,
  Phone,
  Landmark,
  Activity,
  Radio,
} from 'lucide-react';
import { companiesApi, contactsApi, tasksApi, dealsApi } from '../api/client';
import { normalizeCompanies } from '../lib/normalize';
import { getInitials, cn } from '../lib/utils';

// Static commands: jump to a page or kick off a workflow. `keywords` widen the
// fuzzy match so e.g. "email" finds Campaigns.
const COMMANDS = [
  { id: 'discovery', label: 'Discover companies', hint: 'Find new leads on Apollo', icon: Sparkles, to: '/discovery', keywords: 'apollo search find prospect new' },
  { id: 'add-company', label: 'Add a company', hint: 'Create a company manually', icon: Plus, to: '/companies', keywords: 'new create lead' },
  { id: 'scan', label: 'Scan a business card', hint: 'Add a contact from a photo', icon: CreditCard, to: '/scan', keywords: 'card contact ocr photo' },
  { id: 'inbox', label: 'Go to Inbox', hint: 'All email conversations', icon: Inbox, to: '/inbox', keywords: 'email inbox messages threads replies conversations' },
  { id: 'compose', label: 'Compose & send outreach', hint: 'Email Campaigns', icon: Send, to: '/outreach', keywords: 'email send campaign template message' },
  { id: 'import', label: 'Import from CSV', hint: 'Bulk-add companies & contacts', icon: Upload, to: '/import', keywords: 'csv upload bulk' },
  { id: 'pipeline', label: 'View pipeline', hint: 'Kanban board of all stages', icon: GitBranch, to: '/pipeline', keywords: 'kanban board stage deals' },
  { id: 'follow-ups', label: 'Review follow-ups', hint: 'Reminders & cold contacts', icon: Bell, to: '/follow-ups', keywords: 'reminders tasks cold stale' },
  { id: 'news', label: 'Check company news', hint: 'Buying-signal feed', icon: Newspaper, to: '/news', keywords: 'signals funding articles' },
  { id: 'companies', label: 'Go to Companies', hint: 'Browse all companies', icon: Building2, to: '/companies', keywords: 'list table leads' },
  { id: 'contacts', label: 'Go to Contacts', hint: 'Browse all contacts', icon: Users, to: '/contacts', keywords: 'people list' },
  { id: 'clients', label: 'Go to Clients', hint: 'Active clients & health', icon: HeartPulse, to: '/clients', keywords: 'customers accounts health retention' },
  { id: 'client-dashboard', label: 'Client Dashboard', hint: 'Revenue, health & retention', icon: BarChart3, to: '/client-dashboard', keywords: 'revenue health retention overview' },
  { id: 'tasks', label: 'Go to Tasks', hint: 'Follow-ups & to-dos', icon: CheckSquare, to: '/tasks', keywords: 'todo follow-up due calendar' },
  { id: 'reports', label: 'Go to Reports', hint: 'Retention, revenue & activity', icon: BarChart3, to: '/reports', keywords: 'analytics funnel heatmap export csv' },
  { id: 'daily-activity', label: 'Daily Activity', hint: "Autonomous agent's daily summary", icon: Activity, to: '/daily-activity', keywords: 'daily activity summary agent autonomous digest emails sent bounces replies briefing' },
  { id: 'dialtone-console', label: 'Dialtone Console', hint: 'Live activity log for the cold-email agent', icon: Radio, to: '/dialtone', keywords: 'dialtone console activity log live realtime agent emails opens clicks replies bounces errors leads warmup engagement feed' },
  { id: 'calls', label: 'Cold Calling', hint: "Today's call queue & briefings", icon: Phone, to: '/calls', keywords: 'phone call queue dial briefing script cold' },
  { id: 'knowledge', label: 'Knowledge Base', hint: 'Contacts, guidelines & strategy', icon: BookOpen, to: '/knowledge', keywords: 'guidelines strategy industry playbook docs ai config contacts' },
  { id: 'investors', label: 'Go to Investors', hint: 'Fundraising pipeline & investor CRM', icon: Landmark, to: '/investors', keywords: 'investor fundraise fundraising vc venture capital pipeline funnel seed series check raise' },
];

function scoreMatch(text, q) {
  // Cheap subsequence-ish ranking: prefix > word-start > contains.
  const t = text.toLowerCase();
  if (t === q) return 0;
  if (t.startsWith(q)) return 1;
  if (t.includes(` ${q}`)) return 2;
  if (t.includes(q)) return 3;
  return Infinity;
}

export default function CommandPalette({ open, onClose }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const q = query.trim().toLowerCase();

  // Reset when (re)opened, and focus the input.
  useEffect(() => {
    if (open) {
      setQuery('');
      setActive(0);
      // focus on next frame so the element exists
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  // Live company search (server-side q), only while the palette is open.
  const { data: companies = [] } = useQuery({
    queryKey: ['palette-companies', q],
    queryFn: async () => {
      const data = await companiesApi.getAll({ q, page_size: 6 });
      return normalizeCompanies(data.items || data).slice(0, 6);
    },
    enabled: open && q.length >= 2,
    staleTime: 30000,
  });

  // Contacts: fetch once while open, filter client-side (the list is small).
  const { data: allContacts = [] } = useQuery({
    queryKey: ['palette-contacts'],
    queryFn: async () => {
      const data = await contactsApi.getAll({ page_size: 500 });
      return Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
    },
    enabled: open,
    staleTime: 60000,
  });

  // Tasks + deals: fetch once while open, filter client-side. Both degrade to
  // an empty list if the client-lifecycle backend isn't up yet.
  const { data: allTasks = [] } = useQuery({
    queryKey: ['palette-tasks'],
    queryFn: async () => {
      try {
        const data = await tasksApi.list({ page_size: 500 });
        return Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
      } catch {
        return [];
      }
    },
    enabled: open,
    staleTime: 60000,
    retry: false,
  });

  const { data: allDeals = [] } = useQuery({
    queryKey: ['palette-deals'],
    queryFn: async () => {
      try {
        const data = await dealsApi.list({ page_size: 500 });
        return Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
      } catch {
        return [];
      }
    },
    enabled: open,
    staleTime: 60000,
    retry: false,
  });

  const taskMatches = useMemo(() => {
    if (q.length < 2) return [];
    return allTasks
      .map((t) => {
        const hay = [t.title, t.description, t.company_name].filter(Boolean).join(' ');
        return { t, rank: scoreMatch(hay, q) };
      })
      .filter((x) => x.rank !== Infinity)
      .sort((a, b) => a.rank - b.rank)
      .slice(0, 5)
      .map((x) => x.t);
  }, [allTasks, q]);

  const dealMatches = useMemo(() => {
    if (q.length < 2) return [];
    return allDeals
      .map((d) => {
        const hay = [d.title, d.company_name].filter(Boolean).join(' ');
        return { d, rank: scoreMatch(hay, q) };
      })
      .filter((x) => x.rank !== Infinity)
      .sort((a, b) => a.rank - b.rank)
      .slice(0, 5)
      .map((x) => x.d);
  }, [allDeals, q]);

  const contactMatches = useMemo(() => {
    if (q.length < 2) return [];
    return allContacts
      .map((c) => {
        const name = [c.first_name, c.last_name].filter(Boolean).join(' ');
        const hay = [name, c.email, c.company, c.title].filter(Boolean).join(' ');
        return { c, rank: scoreMatch(hay, q) };
      })
      .filter((x) => x.rank !== Infinity)
      .sort((a, b) => a.rank - b.rank)
      .slice(0, 6)
      .map((x) => x.c);
  }, [allContacts, q]);

  const commandMatches = useMemo(() => {
    if (!q) return COMMANDS;
    return COMMANDS.map((cmd) => ({
      cmd,
      rank: Math.min(scoreMatch(cmd.label, q), scoreMatch(cmd.keywords, q) + 0.5),
    }))
      .filter((x) => x.rank !== Infinity)
      .sort((a, b) => a.rank - b.rank)
      .map((x) => x.cmd);
  }, [q]);

  // Build a single flat list of selectable items for keyboard navigation.
  const items = useMemo(() => {
    const out = [];
    commandMatches.forEach((cmd) =>
      out.push({ key: `cmd-${cmd.id}`, group: 'Actions', icon: cmd.icon, title: cmd.label, subtitle: cmd.hint, run: () => navigate(cmd.to) })
    );
    companies.forEach((co) =>
      out.push({
        key: `co-${co.id}`,
        group: 'Companies',
        icon: Building2,
        title: co.name,
        subtitle: [co.industry, co.city, co.state].filter(Boolean).join(' · ') || 'Company',
        run: () => navigate(`/companies/${co.id}`),
      })
    );
    contactMatches.forEach((c) => {
      const name = [c.first_name, c.last_name].filter(Boolean).join(' ') || c.email || 'Contact';
      out.push({
        key: `ct-${c.id}`,
        group: 'Contacts',
        initials: getInitials(c.first_name, c.last_name),
        title: name,
        subtitle: [c.title, c.company].filter(Boolean).join(' · ') || c.email || 'Contact',
        run: () => navigate(`/contacts?highlight=${c.id}`),
      });
    });
    taskMatches.forEach((t) => {
      out.push({
        key: `tk-${t.id}`,
        group: 'Tasks',
        icon: CheckSquare,
        title: t.title,
        subtitle: t.company_name || (t.due_date ? 'Task' : 'Task'),
        run: () => navigate('/tasks'),
      });
    });
    dealMatches.forEach((d) => {
      out.push({
        key: `dl-${d.id}`,
        group: 'Deals',
        icon: DollarSign,
        title: d.title,
        subtitle: d.company_name || 'Deal',
        run: () => navigate(d.company_id ? `/companies/${d.company_id}` : '/reports'),
      });
    });
    return out;
  }, [commandMatches, companies, contactMatches, taskMatches, dealMatches, navigate]);

  // Clamp the active index whenever the result set changes.
  useEffect(() => {
    setActive((a) => (items.length === 0 ? 0 : Math.min(a, items.length - 1)));
  }, [items.length]);

  const choose = (item) => {
    if (!item) return;
    item.run();
    onClose();
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => (items.length ? (a + 1) % items.length : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => (items.length ? (a - 1 + items.length) % items.length : 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      choose(items[active]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  // Keep the active row scrolled into view.
  useEffect(() => {
    const el = listRef.current?.querySelector('[data-active="true"]');
    el?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  if (!open) return null;

  // Render with group headers, tracking the flat index for highlight.
  let flatIndex = -1;
  let lastGroup = null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-start justify-center bg-black/40 p-4 pt-[12vh] backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="flex max-h-[70vh] w-full max-w-xl flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-3 border-b border-gray-100 px-4">
          <Search className="h-5 w-5 flex-shrink-0 text-gray-400" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setActive(0); }}
            onKeyDown={onKeyDown}
            placeholder="Search companies, contacts, or jump to…"
            className="h-14 w-full bg-transparent text-sm text-gray-900 placeholder-gray-400 focus:outline-none"
          />
          <kbd className="hidden flex-shrink-0 rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-[11px] font-medium text-gray-400 sm:inline-block">
            Esc
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="flex-1 overflow-y-auto py-2">
          {items.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-gray-500">
              No matches for “{query}”.
            </div>
          ) : (
            items.map((item) => {
              flatIndex += 1;
              const idx = flatIndex;
              const showHeader = item.group !== lastGroup;
              lastGroup = item.group;
              const isActive = idx === active;
              return (
                <div key={item.key}>
                  {showHeader && (
                    <p className="px-4 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                      {item.group}
                    </p>
                  )}
                  <button
                    type="button"
                    data-active={isActive}
                    onMouseEnter={() => setActive(idx)}
                    onClick={() => choose(item)}
                    className={cn(
                      'flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors',
                      isActive ? 'bg-blue-50' : 'hover:bg-gray-50'
                    )}
                  >
                    {item.initials ? (
                      <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-[11px] font-semibold text-blue-600">
                        {item.initials}
                      </span>
                    ) : (
                      <item.icon className={cn('h-5 w-5 flex-shrink-0', isActive ? 'text-blue-600' : 'text-gray-400')} />
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-gray-900">{item.title}</span>
                      {item.subtitle && (
                        <span className="block truncate text-xs text-gray-500">{item.subtitle}</span>
                      )}
                    </span>
                    {isActive && <CornerDownLeft className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />}
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Footer hint */}
        <div className="flex items-center gap-4 border-t border-gray-100 px-4 py-2 text-[11px] text-gray-400">
          <span className="inline-flex items-center gap-1"><ArrowUp className="h-3 w-3" /><ArrowDown className="h-3 w-3" /> navigate</span>
          <span className="inline-flex items-center gap-1"><CornerDownLeft className="h-3 w-3" /> open</span>
        </div>
      </div>
    </div>
  );
}
