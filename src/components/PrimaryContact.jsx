import { Mail, Phone } from 'lucide-react';
import { cn } from '../lib/utils';

// The one contact a company is represented by, as resolved by the backend
// (`primary_contact` on any company response). Enrichment usually finds an
// address and no name, so the address — not the name — is the headline.
export default function PrimaryContact({ contact, showPhone = false, className }) {
  if (!contact || (!contact.email && !contact.phone)) {
    return <span className="text-sm text-gray-300">—</span>;
  }

  // Clicking through to mail/tel must not also trigger the row's navigation.
  const stop = (e) => e.stopPropagation();
  const blocked = contact.suppressed || contact.unsubscribed;
  const phone = contact.phone || contact.mobile;

  return (
    <div className={cn('min-w-0 space-y-0.5', className)}>
      {contact.email && (
        <div className="flex items-center gap-1.5">
          <Mail className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
          <a
            href={`mailto:${contact.email}`}
            onClick={stop}
            title={blocked ? `${contact.email} — opted out, do not email` : contact.email}
            className={cn(
              'truncate text-sm',
              blocked
                ? 'text-gray-400 line-through'
                : 'text-blue-600 hover:text-blue-700 hover:underline'
            )}
          >
            {contact.email}
          </a>
        </div>
      )}
      {contact.full_name && (
        <p className="truncate text-xs text-gray-500">
          {contact.full_name}
          {contact.title ? ` · ${contact.title}` : ''}
        </p>
      )}
      {showPhone && phone && (
        <div className="flex items-center gap-1.5">
          <Phone className="h-3.5 w-3.5 flex-shrink-0 text-gray-400" />
          <a
            href={`tel:${phone}`}
            onClick={stop}
            className="truncate text-xs text-gray-600 hover:text-gray-900 hover:underline"
          >
            {phone}
          </a>
        </div>
      )}
    </div>
  );
}
