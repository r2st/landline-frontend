import { Link } from 'react-router-dom';
import {
  Users,
  Target,
  GitBranch,
  Bot,
  Send,
  Mail,
  Server,
  Inbox,
  Radio,
  PenLine,
  MailCheck,
  Beaker,
  Clock,
  Gauge,
  SlidersHorizontal,
  ShieldCheck,
  Globe,
  AlertTriangle,
  FileWarning,
  BarChart3,
  ShieldOff,
  Shuffle,
  Share2,
  Phone,
  BookOpen,
  Lock,
  Webhook,
  Building2,
  ShieldAlert,
  Settings,
  ArrowRight,
  Rocket,
} from 'lucide-react';

// A showcase of everything Landline can do, grouped by area. Each capability
// card links to the page that does it and the help article that explains it,
// so this doubles as a directory. Content mirrors src/lib/helpContent.js — keep
// the two in step when adding features.

const GROUPS = [
  {
    id: 'core',
    title: 'Contacts & Pipeline',
    blurb: 'Build the list, score fit, and move deals to close.',
    features: [
      { icon: Users, name: 'Contact management', desc: 'Import, groups, merge, and phone enrichment.', to: '/contacts', help: '/help/contact-management' },
      { icon: Target, name: 'ICP scoring', desc: 'Rank every lead 0–100 against your ideal profile.', to: '/dialtone/icp', help: '/help/icp-scoring' },
      { icon: GitBranch, name: 'Pipeline / CRM', desc: 'Kanban deals with an activity timeline.', to: '/pipeline', help: '/help/pipeline-crm' },
      { icon: Bot, name: 'Deal progression agent', desc: 'Nudges stalled deals with next-best actions.', to: '/agents/deals', help: '/help/pipeline-crm' },
    ],
  },
  {
    id: 'campaigns',
    title: 'Campaigns & Email',
    blurb: 'Reach out from any mailbox and see every reply in one place.',
    features: [
      { icon: Send, name: 'Sequences', desc: 'Multi-step, conditional, A/B tested cadences.', to: '/sequences', help: '/help/sequences' },
      { icon: Mail, name: 'Gmail integration', desc: 'OAuth multi-account send & receive.', to: '/settings', help: '/help/gmail-integration' },
      { icon: Server, name: 'SMTP mailboxes', desc: 'Custom SMTP/IMAP accounts.', to: '/settings', help: '/help/smtp-mailboxes' },
      { icon: Inbox, name: 'Unified inbox', desc: 'One reply queue across Gmail & SMTP, with archive, priority & bulk actions.', to: '/inbox', help: '/help/unified-inbox' },
    ],
  },
  {
    id: 'dialtone',
    title: 'Autopilot AI Agent',
    blurb: 'An autonomous cold-email agent that runs outreach for you.',
    features: [
      { icon: Radio, name: 'Autopilot Console', desc: 'Live activity feed and kill switch.', to: '/dialtone', help: '/help/dialtone-console' },
      { icon: PenLine, name: 'AI draft generation', desc: 'Personalized first touches with spam scoring.', to: '/dialtone/drafts', help: '/help/ai-drafts' },
      { icon: MailCheck, name: 'Reply triage', desc: 'Classify replies and suggest smart responses.', to: '/dialtone/inbox', help: '/help/reply-triage' },
      { icon: Beaker, name: 'A/B testing', desc: 'Variant comparison with statistical significance.', to: '/dialtone/ab-tests', help: '/help/ab-testing' },
      { icon: Clock, name: 'Send-time optimization', desc: 'Per-contact optimal windows, proven by experiment.', to: '/dialtone/send-timing', help: '/help/send-timing' },
      { icon: Gauge, name: 'Sender health', desc: 'Per-account reputation, trends & auto-throttle.', to: '/dialtone/senders', help: '/help/sender-health' },
      { icon: SlidersHorizontal, name: 'Orchestration policies', desc: 'Enrollment modes and channel guardrails.', to: '/dialtone/policies', help: '/help/orchestration-policies' },
    ],
  },
  {
    id: 'deliverability',
    title: 'Deliverability',
    blurb: 'Stay in the inbox as you scale.',
    features: [
      { icon: Gauge, name: 'Warmup plans', desc: 'Gradual volume ramp with per-account caps.', to: '/dialtone/senders', help: '/help/warmup' },
      { icon: ShieldCheck, name: 'SPF / DKIM / DMARC', desc: 'Domain authentication verification.', to: '/deliverability/domains', help: '/help/domain-authentication' },
      { icon: AlertTriangle, name: 'Bounce management', desc: 'Hard/soft classification and auto-suppression.', to: '/dialtone/health', help: '/help/bounce-management' },
      { icon: FileWarning, name: 'Spam scoring', desc: 'Pre-send content analysis.', to: '/dialtone/drafts', help: '/help/spam-scoring' },
      { icon: BarChart3, name: 'Google Postmaster', desc: 'Domain reputation & delivery metrics.', to: '/deliverability/domains', help: '/help/postmaster' },
      { icon: ShieldOff, name: 'Suppression lists', desc: 'Global + per-org, deduped.', to: '/dialtone/suppression', help: '/help/suppression' },
    ],
  },
  {
    id: 'advanced',
    title: 'Advanced',
    blurb: 'Deeper controls for teams that push volume.',
    features: [
      { icon: Shuffle, name: 'Spintax', desc: 'Template variation for deliverability.', to: '/sequences', help: '/help/spintax' },
      { icon: Share2, name: 'Multichannel', desc: 'Email + LinkedIn + phone step types.', to: '/sequences', help: '/help/multichannel' },
      { icon: Phone, name: 'Cold calling', desc: 'Call queue with briefings & scripts.', to: '/calls', help: '/help/cold-calling' },
      { icon: BookOpen, name: 'Knowledge base', desc: 'Company/product context for the AI.', to: '/knowledge', help: '/help/knowledge-base' },
      { icon: Lock, name: 'GDPR controls', desc: 'Data-subject export and erasure.', to: '/gdpr', help: '/help/gdpr' },
      { icon: Webhook, name: 'Webhooks', desc: 'Push events to your own systems.', to: '/settings', help: '/help/webhooks' },
    ],
  },
  {
    id: 'platform',
    title: 'Platform & Settings',
    blurb: 'Multi-tenant foundations for the whole team.',
    features: [
      { icon: Building2, name: 'Organizations & roles', desc: 'Org isolation, roles & team management.', to: '/settings/team', help: '/help/organizations' },
      { icon: ShieldAlert, name: 'Platform admin', desc: 'Org CRUD, stats & impersonation.', to: '/platform', help: '/help/platform-admin' },
      { icon: Settings, name: 'Settings & billing', desc: 'Account, usage & plan limits.', to: '/settings', help: '/help/settings-billing' },
    ],
  },
];

export default function FeaturesPage() {
  return (
    <div>
      {/* Hero */}
      <div className="mb-8 rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-600 to-indigo-700 p-8 text-white">
        <h1 className="text-3xl font-bold">Everything DoAide Prospect can do</h1>
        <p className="mt-2 max-w-2xl text-indigo-100">
          A B2B sales platform with Autopilot — an autonomous cold-email AI agent that sources
          prospects, writes and sends first touches, triages replies, and protects your reputation.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            to="/help"
            className="inline-flex items-center gap-1.5 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-indigo-700 transition-colors hover:bg-indigo-50"
          >
            <BookOpen className="h-4 w-4" /> Open the Help Center
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-500/40 px-4 py-2 text-sm font-semibold text-white ring-1 ring-inset ring-white/30 transition-colors hover:bg-indigo-500/60"
          >
            <Rocket className="h-4 w-4" /> Getting started
          </Link>
        </div>
      </div>

      {GROUPS.map((group) => (
        <section key={group.id} className="mb-10" aria-labelledby={`features-${group.id}`}>
          <h2 id={`features-${group.id}`} className="text-lg font-bold text-gray-900">
            {group.title}
          </h2>
          <p className="mb-4 text-sm text-gray-500">{group.blurb}</p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {group.features.map((f) => (
              <div
                key={f.name}
                className="group flex flex-col rounded-xl border border-gray-200 bg-white p-4 transition-all hover:border-indigo-200 hover:shadow-sm"
              >
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                    <f.icon className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold text-gray-900">{f.name}</h3>
                    <p className="mt-0.5 text-xs text-gray-500">{f.desc}</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-3 border-t border-gray-100 pt-2.5 text-xs font-medium">
                  <Link
                    to={f.to}
                    className="inline-flex items-center gap-1 text-indigo-600 transition-colors hover:text-indigo-700"
                  >
                    Open <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                  <Link
                    to={f.help}
                    className="inline-flex items-center gap-1 text-gray-400 transition-colors hover:text-gray-700"
                  >
                    <BookOpen className="h-3.5 w-3.5" /> Learn
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
