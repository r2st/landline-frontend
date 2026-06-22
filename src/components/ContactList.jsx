import { Mail, Phone, Linkedin, Plus, Users } from 'lucide-react';
import { getInitials } from '../lib/utils';
import EmptyState from './EmptyState';

export default function ContactList({ contacts = [], companyId, onAddContact }) {
  if (contacts.length === 0) {
    return (
      <div>
        <EmptyState
          icon={Users}
          title="No contacts yet"
          description="Add contacts to keep track of your key stakeholders at this company."
          action={onAddContact ? { label: 'Add Contact', onClick: onAddContact } : undefined}
        />
      </div>
    );
  }

  return (
    <div>
      <ul className="divide-y divide-gray-100">
        {contacts.map((contact) => (
          <li
            key={contact.id}
            className="flex items-center gap-4 px-4 py-3 transition-colors hover:bg-gray-50"
          >
            {/* Avatar */}
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-600">
              {getInitials(contact.first_name, contact.last_name)}
            </div>

            {/* Info */}
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-gray-900">
                {contact.first_name} {contact.last_name}
              </p>
              {contact.title && (
                <p className="truncate text-sm text-gray-500">{contact.title}</p>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {contact.email && (
                <a
                  href={`mailto:${contact.email}`}
                  className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                  title={contact.email}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Mail className="h-4 w-4" />
                </a>
              )}
              {contact.phone && (
                <a
                  href={`tel:${contact.phone}`}
                  className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                  title={contact.phone}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Phone className="h-4 w-4" />
                </a>
              )}
              {contact.linkedin_url && (
                <a
                  href={contact.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-blue-600"
                  title="LinkedIn Profile"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Linkedin className="h-4 w-4" />
                </a>
              )}
            </div>
          </li>
        ))}
      </ul>

      {/* Add Contact Button */}
      {onAddContact && (
        <div className="border-t border-gray-100 px-4 py-3">
          <button
            type="button"
            onClick={onAddContact}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 py-2 text-sm font-medium text-gray-500 transition-colors hover:border-blue-400 hover:text-blue-500"
          >
            <Plus className="h-4 w-4" />
            Add Contact
          </button>
        </div>
      )}
    </div>
  );
}
