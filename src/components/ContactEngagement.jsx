import { useState } from 'react';
import {
  Mail, MailOpen, MousePointerClick, MessageSquareReply, AlertTriangle,
  Tag as TagIcon, X, Plus,
} from 'lucide-react';
import { useContactEngagement, useUpdateContactTags } from '../hooks/useContacts';
import { cn } from '../lib/utils';

function ts(iso) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

const EVENT_META = {
  sent: { label: 'Sent', icon: Mail, className: 'text-indigo-500' },
  opened: { label: 'Opened', icon: MailOpen, className: 'text-blue-500' },
  clicked: { label: 'Clicked', icon: MousePointerClick, className: 'text-violet-500' },
  replied: { label: 'Replied', icon: MessageSquareReply, className: 'text-green-600' },
  bounced: { label: 'Bounced', icon: AlertTriangle, className: 'text-red-500' },
};

function Stat({ label, value, muted }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2">
      <p className="text-[11px] uppercase tracking-wider text-gray-400">{label}</p>
      <p className={cn('mt-0.5 text-lg font-semibold tabular-nums',
        muted ? 'text-gray-400' : 'text-gray-900')}>
        {value}
      </p>
    </div>
  );
}

/**
 * Tag editor for one contact.
 *
 * Sends add/remove deltas rather than the whole set, so two people editing the
 * same contact from two stale list views don't overwrite each other's tags.
 */
export function ContactTags({ contactId, tags = [] }) {
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState('');
  const update = useUpdateContactTags();

  const submit = async (e) => {
    e?.preventDefault();
    const value = draft.trim();
    if (!value) {
      setAdding(false);
      return;
    }
    // One field, comma-separated: typing "imts, warm" in a hurry should add two
    // tags, not one tag named "imts, warm".
    const add = value.split(',').map((t) => t.trim()).filter(Boolean);
    await update.mutateAsync({ id: contactId, add });
    setDraft('');
    setAdding(false);
  };

  return (
    <div>
      <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
        <TagIcon className="h-3 w-3" />
        Tags
      </p>
      <div className="flex flex-wrap items-center gap-1.5">
        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700"
          >
            {tag}
            <button
              type="button"
              aria-label={`Remove tag ${tag}`}
              onClick={() => update.mutate({ id: contactId, remove: [tag] })}
              className="text-gray-400 transition hover:text-red-500"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}

        {adding ? (
          <form onSubmit={submit} className="inline-flex items-center gap-1">
            <input
              // The field only exists because the user just clicked "Add tag";
              // not focusing it means a second click to do the thing they
              // already asked for.
              // eslint-disable-next-line jsx-a11y/no-autofocus
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={submit}
              onKeyDown={(e) => e.key === 'Escape' && setAdding(false)}
              placeholder="tag name"
              aria-label="New tag"
              className="h-7 w-32 rounded-full border border-gray-300 px-2.5 text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="inline-flex items-center gap-1 rounded-full border border-dashed border-gray-300 px-2.5 py-1 text-xs text-gray-500 transition hover:border-gray-400 hover:text-gray-700"
          >
            <Plus className="h-3 w-3" />
            Add tag
          </button>
        )}

        {tags.length === 0 && !adding && (
          <span className="text-xs text-gray-400">None yet</span>
        )}
      </div>
    </div>
  );
}

/**
 * What we've sent this contact and what came back.
 *
 * The numbers come from an endpoint that reads BOTH send tables — sequence
 * sends live only in outreach_events and manual/template sends only in
 * email_sends, so anything reading one of them tells an operator we've never
 * emailed someone we've emailed nine times.
 */
export default function ContactEngagement({ contactId }) {
  const { data, isLoading } = useContactEngagement(contactId, 25);

  if (isLoading) {
    return (
      <div className="rounded-lg border border-gray-200 p-4">
        <div className="h-4 w-24 animate-pulse rounded bg-gray-100" />
      </div>
    );
  }
  if (!data) return null;

  const pct = (v) => `${Math.round((v || 0) * 100)}%`;

  return (
    <div>
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
        Engagement
      </p>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Sent" value={data.sent} muted={!data.sent} />
        <Stat label="Opened" value={data.opened} muted={!data.opened} />
        <Stat label="Replied" value={data.replied} muted={!data.replied} />
        <Stat
          label="Bounced"
          value={data.bounced}
          muted={!data.bounced}
        />
      </div>

      {data.sent > 0 && (
        <p className="mt-2 text-xs text-gray-500">
          {pct(data.open_rate)} open · {pct(data.reply_rate)} reply
          {data.active_enrollments > 0 && (
            <> · {data.active_enrollments} active sequence
              {data.active_enrollments === 1 ? '' : 's'}</>
          )}
        </p>
      )}

      {data.events?.length > 0 ? (
        <ul className="mt-3 max-h-64 space-y-0 overflow-y-auto rounded-lg border border-gray-200">
          {data.events.map((e, i) => {
            const meta = EVENT_META[e.type] || { label: e.type, icon: Mail, className: 'text-gray-400' };
            const Icon = meta.icon;
            return (
              <li
                key={`${e.type}-${e.occurred_at}-${i}`}
                className="flex items-start gap-2.5 border-b border-gray-50 px-3 py-2 last:border-0"
              >
                <Icon className={cn('mt-0.5 h-3.5 w-3.5 flex-shrink-0', meta.className)} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-gray-700">
                    {meta.label}
                    {e.subject ? <span className="font-normal text-gray-500"> · {e.subject}</span> : null}
                  </p>
                  {(e.sequence_name || e.step_number) && (
                    <p className="truncate text-[11px] text-gray-400">
                      {e.sequence_name || 'Sequence'}
                      {e.step_number ? ` · step ${e.step_number}` : ''}
                    </p>
                  )}
                </div>
                <time className="flex-shrink-0 whitespace-nowrap text-[11px] text-gray-400">
                  {ts(e.occurred_at)}
                </time>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-3 text-xs text-gray-400">Nothing sent to this contact yet.</p>
      )}
    </div>
  );
}
