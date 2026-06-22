import { useMemo } from 'react';
import {
  Plus, Target, Send, Eye, Mail, UserPlus, Newspaper, ArrowRight, Clock,
  TrendingUp, TrendingDown, Sparkles,
} from 'lucide-react';
import { timeAgo, getScoreLabel, cn } from '../lib/utils';

const typeStyles = {
  company_added: { icon: Plus, color: 'text-green-500 bg-green-50' },
  contact_added: { icon: UserPlus, color: 'text-teal-500 bg-teal-50' },
  lead_scored: { icon: Target, color: 'text-yellow-500 bg-yellow-50' },
  score_up: { icon: TrendingUp, color: 'text-emerald-500 bg-emerald-50' },
  score_down: { icon: TrendingDown, color: 'text-red-500 bg-red-50' },
  email_sent: { icon: Send, color: 'text-purple-500 bg-purple-50' },
  email_opened: { icon: Eye, color: 'text-indigo-500 bg-indigo-50' },
  email_replied: { icon: Mail, color: 'text-green-600 bg-green-50' },
  news: { icon: Newspaper, color: 'text-blue-500 bg-blue-50' },
  enriched: { icon: Sparkles, color: 'text-purple-500 bg-purple-50' },
  stage_changed: { icon: ArrowRight, color: 'text-blue-500 bg-blue-50' },
};

const fullName = (c) =>
  [c.first_name, c.last_name].filter(Boolean).join(' ') || c.email || 'A contact';

// Merge every signal we have about a company into one chronological feed.
function buildEvents({ company, contacts = [], scores = [], news = [], sends = [], outreachEvents = [] }) {
  const events = [];

  if (company?.created_at) {
    events.push({
      id: 'added',
      type: 'company_added',
      title: 'Company added to Landline',
      subtitle: company.source ? `via ${company.source.replace(/_/g, ' ')}` : null,
      at: company.created_at,
    });
  }

  // Score history — oldest→newest so we can describe each change as a delta.
  const ordered = [...scores]
    .filter((s) => s.scored_at)
    .sort((a, b) => new Date(a.scored_at) - new Date(b.scored_at));
  let prev = null;
  for (const s of ordered) {
    const val = s.fit_score ?? s.score;
    const delta = prev == null ? null : val - prev;
    events.push({
      id: `score-${s.id || s.scored_at}`,
      type: delta == null ? 'lead_scored' : delta > 0 ? 'score_up' : delta < 0 ? 'score_down' : 'lead_scored',
      title:
        delta == null
          ? `Lead scored ${val} — ${getScoreLabel(val)}`
          : delta === 0
            ? `Re-scored, held at ${val}`
            : `Score ${delta > 0 ? 'rose' : 'fell'} ${Math.abs(delta)} → ${val} (${getScoreLabel(val)})`,
      at: s.scored_at,
    });
    prev = val;
  }

  for (const c of contacts) {
    if (!c.created_at) continue;
    events.push({
      id: `contact-${c.id}`,
      type: 'contact_added',
      title: `${fullName(c)} added as a contact`,
      subtitle: c.title || null,
      at: c.created_at,
    });
  }

  // Email sends scoped to this company's contacts (by id, with email fallback).
  const contactIds = new Set(contacts.map((c) => String(c.id)));
  const contactEmails = new Set(contacts.map((c) => (c.email || '').toLowerCase()).filter(Boolean));
  const mine = sends.filter(
    (s) =>
      (s.contact_id && contactIds.has(String(s.contact_id))) ||
      (s.to_email && contactEmails.has(String(s.to_email).toLowerCase()))
  );
  for (const s of mine) {
    if (s.sent_at) {
      events.push({
        id: `send-${s.id}`,
        type: 'email_sent',
        title: `Email sent to ${s.to_email || 'a contact'}`,
        subtitle: s.subject || null,
        at: s.sent_at,
      });
    }
    if (s.opened_at) {
      events.push({ id: `open-${s.id}`, type: 'email_opened', title: `${s.to_email || 'Recipient'} opened an email`, subtitle: s.subject || null, at: s.opened_at });
    }
    if (s.replied_at) {
      events.push({ id: `reply-${s.id}`, type: 'email_replied', title: `${s.to_email || 'Recipient'} replied`, subtitle: s.subject || null, at: s.replied_at });
    }
  }

  for (const a of news) {
    const at = a.published_at || a.created_at;
    if (!at) continue;
    events.push({
      id: `news-${a.id}`,
      type: 'news',
      title: a.title || 'News article',
      subtitle: a.category ? a.category.replace(/_/g, ' ') : a.source || null,
      at,
    });
  }

  for (const e of outreachEvents) {
    const at = e.occurred_at || e.created_at;
    if (!at) continue;
    const t = e.event_type || e.type;
    events.push({
      id: `oe-${e.id}`,
      type: typeStyles[t] ? t : 'stage_changed',
      title: String(t || 'Outreach event').replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase()),
      subtitle: e.subject || null,
      at,
    });
  }

  return events
    .filter((e) => e.at && !isNaN(new Date(e.at)))
    .sort((a, b) => new Date(b.at) - new Date(a.at));
}

export default function ActivityTimeline(props) {
  const events = useMemo(() => buildEvents(props), [props]);

  if (events.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-10 text-center">
        <Clock className="mx-auto h-8 w-8 text-gray-300" />
        <p className="mt-2 text-sm text-gray-500">No activity recorded yet.</p>
      </div>
    );
  }

  return (
    <div className="relative ml-3 border-l-2 border-gray-100 pl-6">
      {events.map((e) => {
        const style = typeStyles[e.type] || { icon: Clock, color: 'text-gray-500 bg-gray-50' };
        const Icon = style.icon;
        return (
          <div key={e.id} className="relative mb-5 last:mb-0">
            <div className={cn('absolute -left-[33px] flex h-6 w-6 items-center justify-center rounded-full ring-4 ring-white', style.color)}>
              <Icon className="h-3 w-3" />
            </div>
            <p className="text-sm font-medium text-gray-900">{e.title}</p>
            {e.subtitle && <p className="mt-0.5 truncate text-sm text-gray-600">{e.subtitle}</p>}
            <p className="mt-0.5 text-xs text-gray-400">{timeAgo(e.at)}</p>
          </div>
        );
      })}
    </div>
  );
}
