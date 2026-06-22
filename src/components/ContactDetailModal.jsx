import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  X,
  Mail,
  Phone,
  Globe,
  MapPin,
  Building2,
  Linkedin,
  CreditCard,
  Briefcase,
  StickyNote,
} from 'lucide-react';
import { contactsApi } from '../api/client';
import { getInitials, contactPhones, formatDate } from '../lib/utils';

const fullName = (c) =>
  [c?.first_name, c?.last_name].filter(Boolean).join(' ').trim() || c?.email || 'Unknown';

function Row({ icon: Icon, children }) {
  return (
    <div className="flex items-start gap-2.5 text-sm text-gray-700">
      <Icon className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-400" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

/**
 * Full detail view for a single contact. Fetches the contact by id so it gets
 * the heavy fields the list omits — most importantly the scanned card image
 * (returned as a base64 data URL) and the full address. `initial` is the
 * already-loaded list row, used as a placeholder until the detail arrives.
 */
export default function ContactDetailModal({ contactId, initial, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const { data: detail, isLoading } = useQuery({
    queryKey: ['contact', contactId],
    queryFn: () => contactsApi.getById(contactId),
    enabled: !!contactId,
  });

  // Merge: detail (authoritative) over the list row we already had.
  const c = { ...(initial || {}), ...(detail || {}) };
  const phones = contactPhones(c);
  const location = [c.address, c.city, c.state, c.postal_code, c.country]
    .filter(Boolean)
    .join(', ');
  const companyName = c.company || c.company_name;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-gray-100 bg-white px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-base font-semibold text-blue-600">
              {getInitials(c.first_name, c.last_name)}
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-lg font-bold text-gray-900">{fullName(c)}</h2>
              <p className="truncate text-sm text-gray-500">
                {[c.title, c.department].filter(Boolean).join(' · ')}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-6 px-6 py-5 sm:grid-cols-2">
          {/* Left: details */}
          <div className="space-y-4">
            {companyName && (
              <Row icon={Building2}>
                {c.company_id ? (
                  <Link to={`/companies/${c.company_id}`} className="font-medium text-blue-600 hover:text-blue-700">
                    {companyName}
                  </Link>
                ) : (
                  <span className="font-medium text-gray-800">{companyName}</span>
                )}
              </Row>
            )}

            {c.email && (
              <Row icon={Mail}>
                <a href={`mailto:${c.email}`} className="text-gray-700 hover:text-blue-600 break-all">
                  {c.email}
                </a>
              </Row>
            )}

            {/* All phone numbers */}
            {phones.length > 0 && (
              <div className="space-y-1.5">
                {phones.map((p, i) => (
                  <Row key={`${p.number}-${i}`} icon={Phone}>
                    <a href={`tel:${p.number}`} className="text-gray-700 hover:text-blue-600">
                      {p.number}
                      {p.label && <span className="ml-2 text-xs text-gray-400">{p.label}</span>}
                    </a>
                  </Row>
                ))}
              </div>
            )}

            {c.website && (
              <Row icon={Globe}>
                <a
                  href={c.website.startsWith('http') ? c.website : `https://${c.website}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-700 hover:text-blue-600 break-all"
                >
                  {c.website.replace(/^https?:\/\//, '')}
                </a>
              </Row>
            )}

            {c.linkedin_url && (
              <Row icon={Linkedin}>
                <a
                  href={c.linkedin_url.startsWith('http') ? c.linkedin_url : `https://${c.linkedin_url}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-gray-700 hover:text-blue-600"
                >
                  LinkedIn profile
                </a>
              </Row>
            )}

            {location && (
              <Row icon={MapPin}>
                <span className="text-gray-700">{location}</span>
              </Row>
            )}

            {c.source && (
              <Row icon={/card|scan/.test(String(c.source).toLowerCase()) ? CreditCard : Briefcase}>
                <span className="text-gray-600">
                  {/card|scan/.test(String(c.source).toLowerCase()) ? 'Scanned card' : c.source}
                  {c.created_at && ` · ${formatDate(c.created_at)}`}
                </span>
              </Row>
            )}

            {c.notes && (
              <Row icon={StickyNote}>
                <span className="whitespace-pre-wrap text-gray-600">{c.notes}</span>
              </Row>
            )}
          </div>

          {/* Right: scanned card image */}
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
              Card Image
            </p>
            {isLoading ? (
              <div className="flex h-48 items-center justify-center rounded-lg border border-gray-200 bg-gray-50">
                <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-blue-600" />
              </div>
            ) : c.card_image ? (
              <a href={c.card_image} target="_blank" rel="noopener noreferrer">
                <img
                  src={c.card_image}
                  alt={`Business card for ${fullName(c)}`}
                  className="w-full rounded-lg border border-gray-200 object-contain shadow-sm"
                />
              </a>
            ) : (
              <div className="flex h-48 flex-col items-center justify-center rounded-lg border border-dashed border-gray-200 bg-gray-50 text-center text-sm text-gray-400">
                <CreditCard className="mb-2 h-6 w-6" />
                No card image saved
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
