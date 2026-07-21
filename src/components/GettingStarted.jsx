import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Rocket,
  Mail,
  Users,
  ShieldCheck,
  Gauge,
  Send,
  Check,
  ChevronRight,
  X,
} from 'lucide-react';
import { cn } from '../lib/utils';

// Onboarding checklist for new users. Five steps that take a fresh workspace
// from empty to safely sending. Progress is stored in localStorage so it
// survives refreshes; the whole card can be dismissed once the user is up and
// running.
//
// This is intentionally client-side/manual: it's a guide, not a wizard that
// inspects real account state. Each step deep-links to the page that does it and
// to the matching help article.

const STORAGE_KEY = 'landline.gettingStarted';

export const GETTING_STARTED_STEPS = [
  {
    id: 'mailbox',
    title: 'Connect a mailbox',
    description: 'Add a Gmail or SMTP account to send from.',
    to: '/settings',
    help: '/help/gmail-integration',
    icon: Mail,
  },
  {
    id: 'contacts',
    title: 'Import or discover contacts',
    description: 'Upload a CSV or source new leads.',
    to: '/import',
    help: '/help/contact-management',
    icon: Users,
  },
  {
    id: 'domain',
    title: 'Verify your sending domain',
    description: 'Pass SPF, DKIM & DMARC before you send at volume.',
    to: '/deliverability/domains',
    help: '/help/domain-authentication',
    icon: ShieldCheck,
  },
  {
    id: 'warmup',
    title: 'Start a warmup plan',
    description: 'Ramp volume gradually so providers learn to trust you.',
    to: '/dialtone/senders',
    help: '/help/warmup',
    icon: Gauge,
  },
  {
    id: 'send',
    title: 'Send your first sequence',
    description: 'Build a short sequence or enroll into Dialtone.',
    to: '/sequences',
    help: '/help/sequences',
    icon: Send,
  },
];

function loadState() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

export default function GettingStarted({ className = '' }) {
  const [state, setState] = useState(loadState);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* ignore quota / privacy-mode errors */
    }
  }, [state]);

  const done = useMemo(() => state.completed || {}, [state.completed]);
  const completedCount = useMemo(
    () => GETTING_STARTED_STEPS.filter((s) => done[s.id]).length,
    [done]
  );
  const total = GETTING_STARTED_STEPS.length;
  const allDone = completedCount === total;

  const toggle = (id) =>
    setState((prev) => ({
      ...prev,
      completed: { ...(prev.completed || {}), [id]: !(prev.completed || {})[id] },
    }));

  const dismiss = () => setState((prev) => ({ ...prev, dismissed: true }));

  if (state.dismissed) return null;

  return (
    <section
      className={cn(
        'rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-50/80 to-white p-5',
        className
      )}
      aria-labelledby="getting-started-heading"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white">
            <Rocket className="h-5 w-5" />
          </span>
          <div>
            <h2 id="getting-started-heading" className="text-base font-semibold text-gray-900">
              {allDone ? "You're all set up" : 'Getting started'}
            </h2>
            <p className="text-sm text-gray-500">
              {allDone
                ? 'Every setup step is complete. Happy selling.'
                : `${completedCount} of ${total} steps complete`}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss getting started"
          className="-mr-1 rounded-md p-1.5 text-gray-400 transition-colors hover:bg-white hover:text-gray-600"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Progress bar */}
      <div className="mt-4 h-1.5 w-full overflow-hidden rounded-full bg-indigo-100">
        <div
          className="h-full rounded-full bg-indigo-600 transition-all duration-300"
          style={{ width: `${(completedCount / total) * 100}%` }}
          role="progressbar"
          aria-valuenow={completedCount}
          aria-valuemin={0}
          aria-valuemax={total}
        />
      </div>

      <ul className="mt-4 space-y-2">
        {GETTING_STARTED_STEPS.map((step) => {
          const isDone = !!done[step.id];
          return (
            <li
              key={step.id}
              className={cn(
                'flex items-center gap-3 rounded-lg border bg-white px-3 py-2.5 transition-colors',
                isDone ? 'border-indigo-100' : 'border-gray-200'
              )}
            >
              <button
                type="button"
                onClick={() => toggle(step.id)}
                aria-pressed={isDone}
                aria-label={isDone ? `Mark "${step.title}" not done` : `Mark "${step.title}" done`}
                className={cn(
                  'flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full border transition-colors',
                  isDone
                    ? 'border-indigo-600 bg-indigo-600 text-white'
                    : 'border-gray-300 text-transparent hover:border-indigo-400'
                )}
              >
                <Check className="h-3.5 w-3.5" />
              </button>
              <div className="min-w-0 flex-1">
                <div
                  className={cn(
                    'text-sm font-medium',
                    isDone ? 'text-gray-400 line-through' : 'text-gray-900'
                  )}
                >
                  {step.title}
                </div>
                <div className="truncate text-xs text-gray-500">{step.description}</div>
              </div>
              <Link
                to={step.to}
                className="inline-flex flex-shrink-0 items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-indigo-600 transition-colors hover:bg-indigo-50"
              >
                Go <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
