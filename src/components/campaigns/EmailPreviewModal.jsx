import { useEffect } from 'react';
import { Check, Mail, SkipForward, X } from 'lucide-react';
import SafeHtml from '../SafeHtml';
import { EMAIL_BODY_CLASSES, prepareEmailHtml } from '../outreach/PreviewModal';
import { ProspectStatusBadge } from './StatusBadge';

// The generated email for one prospect, as it will be (or was) sent. Drafts can
// be approved or skipped from here without going back to the table.
export default function EmailPreviewModal({ prospect, onClose, onApprove, onSkip, busy }) {
  useEffect(() => {
    if (!prospect) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [prospect, onClose]);

  if (!prospect) return null;
  const isDraft = prospect.status === 'draft';
  const canSkip = isDraft || prospect.status === 'queued';
  const hasEmail = Boolean(prospect.subject || prospect.body);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="email-preview-title"
        className="relative flex max-h-[90vh] w-full max-w-2xl flex-col rounded-xl bg-white shadow-xl"
      >
        <div className="flex items-start justify-between gap-4 border-b border-gray-200 px-5 py-4">
          <div className="min-w-0">
            <h3 id="email-preview-title" className="flex items-center gap-2 text-lg font-semibold text-gray-900">
              <Mail className="h-5 w-5 text-indigo-500" />
              Email preview
            </h3>
            <p className="mt-0.5 truncate text-sm text-gray-500">
              To {prospect.contact_name || 'contact'}
              {prospect.contact_email && <> &lt;{prospect.contact_email}&gt;</>} · {prospect.company_name}
            </p>
          </div>
          <div className="flex flex-shrink-0 items-center gap-2">
            <ProspectStatusBadge status={prospect.status} />
            <button
              type="button"
              onClick={onClose}
              aria-label="Close preview"
              className="rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto px-5 py-4">
          {hasEmail ? (
            <>
              <p className="text-xs font-medium uppercase tracking-wider text-gray-400">Subject</p>
              <p className="mt-1 text-sm font-medium text-gray-900" data-testid="preview-subject">
                {prospect.subject || '(no subject)'}
              </p>
              <p className="mt-4 text-xs font-medium uppercase tracking-wider text-gray-400">Body</p>
              <SafeHtml
                html={prepareEmailHtml(prospect.body)}
                className={`${EMAIL_BODY_CLASSES} mt-1 rounded-lg border border-gray-100 bg-gray-50 p-4`}
                data-testid="preview-body"
              />
            </>
          ) : (
            <p className="py-8 text-center text-sm text-gray-500">
              No email has been written for this prospect yet. Autopilot drafts it shortly before the send window.
            </p>
          )}
        </div>

        {(isDraft || canSkip) && (
          <div className="flex flex-col-reverse gap-2 border-t border-gray-200 px-5 py-3 sm:flex-row sm:justify-end">
            {canSkip && (
              <button
                type="button"
                disabled={busy}
                onClick={() => onSkip(prospect)}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                <SkipForward className="h-4 w-4" />
                Skip prospect
              </button>
            )}
            {isDraft && hasEmail && (
              <button
                type="button"
                disabled={busy}
                onClick={() => onApprove(prospect)}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 disabled:opacity-50"
              >
                <Check className="h-4 w-4" />
                Approve &amp; queue
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
