import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, Newspaper, Snowflake, TrendingUp, ChevronRight } from 'lucide-react';
import { useNews } from '../hooks/useNews';
import { useStaleContacts } from '../hooks/useFollowUps';
import { useTopLeads } from '../hooks/useDashboard';
import { STAGE_LABELS } from '../lib/constants';
import { cn } from '../lib/utils';

const EARLY_STAGES = new Set(['new', 'researched', 'scored']);
const COLD_DAYS = 14; // "hasn't been contacted in 2 weeks"
const MAX = 6;

// Synthesize next-best-actions from real signals: actionable news, contacts
// gone cold, and high-scoring leads still stuck early in the pipeline.
// De-duped to at most one suggestion per company so the list stays varied.
function buildSuggestions({ news, stale, topLeads }) {
  const out = [];
  const seen = new Set();
  const take = (companyId, s) => {
    const key = String(companyId);
    if (companyId && seen.has(key)) return;
    if (companyId) seen.add(key);
    out.push(s);
  };

  // 1. Fresh, actionable news → review & reach out.
  for (const a of news || []) {
    if (a.actioned || a.is_actionable === false) continue;
    const cat = (a.category || 'news').replace(/_/g, ' ');
    take(a.company_id, {
      id: `news-${a.id}`,
      icon: Newspaper,
      tone: 'text-blue-600 bg-blue-50',
      company: a.company_name || 'A company',
      text: `New ${cat} — review and reach out`,
      hint: a.title,
      to: `/companies/${a.company_id}`,
    });
  }

  // 2. Contacts gone cold (no open follow-up already) → send a follow-up.
  const cold = [...(stale || [])]
    .filter((c) => !c.has_open_follow_up && (c.days_since_contact ?? 999) >= COLD_DAYS)
    .sort((a, b) => (b.days_since_contact ?? 0) - (a.days_since_contact ?? 0));
  for (const c of cold) {
    const days = c.days_since_contact;
    take(c.company_id, {
      id: `cold-${c.contact_id}`,
      icon: Snowflake,
      tone: 'text-sky-600 bg-sky-50',
      company: c.company_name || 'A company',
      text: days
        ? `Not contacted in ${days} days — send a follow-up`
        : `Never contacted — send a first touch`,
      hint: c.email || null,
      to: `/companies/${c.company_id}`,
    });
  }

  // 3. High-scoring leads still parked early → prioritize outreach.
  for (const l of topLeads || []) {
    if ((l.score ?? 0) < 70 || !EARLY_STAGES.has(l.stage)) continue;
    take(l.id, {
      id: `hot-${l.id}`,
      icon: TrendingUp,
      tone: 'text-emerald-600 bg-emerald-50',
      company: l.name || 'A lead',
      text: `Scores ${l.score} but still ${STAGE_LABELS[l.stage] || l.stage} — prioritize outreach`,
      hint: l.industry || null,
      to: `/companies/${l.id}`,
    });
  }

  // News first, then cold, then hot (already in that push order); cap the list.
  return out.slice(0, MAX);
}

export default function SmartSuggestions() {
  const navigate = useNavigate();
  const { data: news = [] } = useNews({ limit: 50, actionable_only: true });
  const { data: stale = [] } = useStaleContacts(COLD_DAYS);
  const { data: topLeads = [] } = useTopLeads(15);

  const newsArr = Array.isArray(news) ? news : news?.items || [];
  const suggestions = useMemo(
    () => buildSuggestions({ news: newsArr, stale, topLeads }),
    [newsArr, stale, topLeads]
  );

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
        <h2 className="flex items-center gap-2 text-base font-semibold text-gray-900">
          <Sparkles className="h-4 w-4 text-purple-500" />
          Smart Suggestions
        </h2>
        <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
          {suggestions.length}
        </span>
      </div>
      {suggestions.length === 0 ? (
        <div className="px-6 py-8 text-center">
          <Sparkles className="mx-auto h-8 w-8 text-gray-300" />
          <p className="mt-2 text-sm font-medium text-gray-900">No suggestions right now</p>
          <p className="mt-0.5 text-sm text-gray-500">
            Check company news and score more leads to surface next-best-actions.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-gray-50">
          {suggestions.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => navigate(s.to)}
                className="flex w-full items-center gap-3 px-6 py-3 text-left transition-colors hover:bg-gray-50"
              >
                <span className={cn('flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full', s.tone)}>
                  <s.icon className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm text-gray-900">
                    <span className="font-semibold">{s.company}</span>{' '}
                    <span className="text-gray-600">{s.text}</span>
                  </span>
                  {s.hint && <span className="block truncate text-xs text-gray-400">{s.hint}</span>}
                </span>
                <ChevronRight className="h-4 w-4 flex-shrink-0 text-gray-300" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
