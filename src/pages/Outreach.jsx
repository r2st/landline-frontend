import { useState, useMemo, useRef, useEffect } from 'react';
import {
  Mail,
  Plus,
  Star,
  Pencil,
  Trash2,
  Eye,
  Send,
  Search,
  X,
  CheckCircle2,
  Users,
  FileText,
  ExternalLink,
} from 'lucide-react';
import EmptyState from '../components/EmptyState';
import {
  useEmailTemplates,
  useCreateTemplate,
  useUpdateTemplate,
  useDeleteTemplate,
  useSetDefaultTemplate,
  usePreviewTemplate,
  useComposeEmail,
  useEmailSends,
} from '../hooks/useEmailTemplates';
import { useContacts } from '../hooks/useContacts';
import { MERGE_FIELDS, DEMO_LINK } from '../lib/mockData';
import { cn, timeAgo } from '../lib/utils';

// ─── Merge field insert bar ─────────────────────────────────────────────────────

function MergeFieldBar({ onInsert }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-xs text-gray-500">Insert field:</span>
      {MERGE_FIELDS.map((f) => (
        <button
          key={f.value}
          type="button"
          onClick={() => onInsert(f.value)}
          className="rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-600 hover:bg-blue-100"
        >
          {f.label}
        </button>
      ))}
    </div>
  );
}

// ─── Preview modal ───────────────────────────────────────────────────────────────

function PreviewModal({ open, onClose, loading, subject, body, contextLabel }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-gray-400" />
            <h3 className="text-sm font-semibold text-gray-900">Email Preview</h3>
            {contextLabel && (
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                {contextLabel}
              </span>
            )}
          </div>
          <button type="button" onClick={onClose} className="rounded p-1 text-gray-400 hover:bg-gray-100">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="overflow-y-auto p-5">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-blue-600" />
            </div>
          ) : (
            <>
              <div className="mb-3 border-b border-gray-100 pb-3">
                <p className="text-xs uppercase tracking-wide text-gray-400">Subject</p>
                <p className="mt-0.5 text-sm font-semibold text-gray-900">{subject}</p>
              </div>
              <div
                className="prose prose-sm max-w-none text-sm text-gray-700 [&_a]:text-blue-600 [&_p]:my-2"
                dangerouslySetInnerHTML={{ __html: body || '' }}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Template editor ─────────────────────────────────────────────────────────────

function TemplateEditor({ template, onClose }) {
  const isEdit = Boolean(template);
  const [name, setName] = useState(template?.name || '');
  const [subject, setSubject] = useState(template?.subject || '');
  const [body, setBody] = useState(template?.body || '');
  const [activeField, setActiveField] = useState('body');
  const subjectRef = useRef(null);
  const bodyRef = useRef(null);

  const createTemplate = useCreateTemplate();
  const updateTemplate = useUpdateTemplate();
  const preview = usePreviewTemplate();
  const [previewOpen, setPreviewOpen] = useState(false);

  const insert = (token) => {
    const ref = activeField === 'subject' ? subjectRef : bodyRef;
    const setter = activeField === 'subject' ? setSubject : setBody;
    const value = activeField === 'subject' ? subject : body;
    const el = ref.current;
    if (el && el.selectionStart != null) {
      const start = el.selectionStart;
      const end = el.selectionEnd;
      setter(value.slice(0, start) + token + value.slice(end));
      requestAnimationFrame(() => {
        el.focus();
        el.selectionStart = el.selectionEnd = start + token.length;
      });
    } else {
      setter(value + token);
    }
  };

  const handlePreview = () => {
    setPreviewOpen(true);
    preview.mutate({ subject, body });
  };

  const handleSave = () => {
    if (!name.trim() || !subject.trim() || !body.trim()) return;
    const data = { name: name.trim(), subject, body };
    if (isEdit) {
      updateTemplate.mutate({ id: template.id, data }, { onSuccess: onClose });
    } else {
      createTemplate.mutate(data, { onSuccess: onClose });
    }
  };

  const saving = createTemplate.isPending || updateTemplate.isPending;
  const valid = name.trim() && subject.trim() && body.trim();

  return (
    <div className="rounded-xl border border-blue-200 bg-white p-6 shadow-sm">
      <div className="mb-5 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">
          {isEdit ? 'Edit Template' : 'New Template'}
        </h2>
        <button type="button" onClick={onClose} className="rounded p-1 text-gray-400 hover:bg-gray-100">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Template Name *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g., Professional Outreach"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Subject *</label>
          <input
            ref={subjectRef}
            type="text"
            value={subject}
            onFocus={() => setActiveField('subject')}
            onChange={(e) => setSubject(e.target.value)}
            placeholder="Real-time press monitoring for {{company}}"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between">
            <label className="block text-sm font-medium text-gray-700">Body (HTML) *</label>
          </div>
          <textarea
            ref={bodyRef}
            value={body}
            onFocus={() => setActiveField('body')}
            onChange={(e) => setBody(e.target.value)}
            rows={12}
            placeholder="<p>Hi {{first_name}}, ...</p>"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 font-mono text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        <div className="flex flex-col gap-2 rounded-lg bg-gray-50 p-3">
          <MergeFieldBar onInsert={insert} />
          <button
            type="button"
            onClick={() => insert(DEMO_LINK)}
            className="inline-flex w-fit items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 hover:bg-emerald-100"
          >
            <ExternalLink className="h-3 w-3" />
            Insert demo link
          </button>
          <p className="text-xs text-gray-400">
            Fields are merged from each contact when previewing or sending. Demo link: {DEMO_LINK}
          </p>
        </div>

        <div className="flex justify-between gap-3 border-t border-gray-200 pt-4">
          <button
            type="button"
            onClick={handlePreview}
            className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            <Eye className="h-4 w-4" />
            Preview
          </button>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!valid || saving}
              className="rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-600 disabled:opacity-50"
            >
              {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Template'}
            </button>
          </div>
        </div>
      </div>

      <PreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        loading={preview.isPending}
        subject={preview.data?.subject}
        body={preview.data?.body}
        contextLabel="sample contact"
      />
    </div>
  );
}

// ─── Template card ───────────────────────────────────────────────────────────────

function TemplateCard({ template, onEdit, onPreview }) {
  const setDefault = useSetDefaultTemplate();
  const deleteTemplate = useDeleteTemplate();

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-base font-semibold text-gray-900">{template.name}</h3>
            {template.is_default && (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                Default
              </span>
            )}
          </div>
          <p className="mt-1 truncate text-sm text-gray-500">{template.subject}</p>
        </div>
        <button
          type="button"
          title={template.is_default ? 'This is the default' : 'Set as default'}
          onClick={() => !template.is_default && setDefault.mutate(template.id)}
          className={cn(
            'rounded-md p-1.5',
            template.is_default
              ? 'text-amber-500'
              : 'text-gray-300 hover:bg-amber-50 hover:text-amber-500'
          )}
        >
          <Star className={cn('h-5 w-5', template.is_default && 'fill-amber-500')} />
        </button>
      </div>

      <div className="mt-4 flex items-center gap-2 border-t border-gray-100 pt-3">
        <button
          type="button"
          onClick={() => onPreview(template)}
          className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100"
        >
          <Eye className="h-3.5 w-3.5" />
          Preview
        </button>
        <button
          type="button"
          onClick={() => onEdit(template)}
          className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100"
        >
          <Pencil className="h-3.5 w-3.5" />
          Edit
        </button>
        <button
          type="button"
          disabled={template.is_default}
          onClick={() => {
            if (template.is_default) return;
            if (window.confirm(`Delete "${template.name}"?`)) deleteTemplate.mutate(template.id);
          }}
          title={template.is_default ? 'Set another template as default first' : 'Delete'}
          className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:text-gray-300 disabled:hover:bg-transparent"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Delete
        </button>
      </div>
    </div>
  );
}

// ─── Templates tab ───────────────────────────────────────────────────────────────

function TemplatesTab() {
  const { data: templates, isLoading } = useEmailTemplates();
  const [editing, setEditing] = useState(null); // template object or 'new'
  const preview = usePreviewTemplate();
  const [previewOpen, setPreviewOpen] = useState(false);

  const handlePreview = (template) => {
    setPreviewOpen(true);
    preview.mutate({ template_id: template.id });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {!editing && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setEditing('new')}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-600"
          >
            <Plus className="h-4 w-4" />
            New Template
          </button>
        </div>
      )}

      {editing && (
        <TemplateEditor
          template={editing === 'new' ? null : editing}
          onClose={() => setEditing(null)}
        />
      )}

      {!editing && (templates?.length ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {templates.map((t) => (
            <TemplateCard key={t.id} template={t} onEdit={setEditing} onPreview={handlePreview} />
          ))}
        </div>
      ) : (
        <EmptyState
          title="No templates yet"
          description="Create your first email template to start composing outreach."
          icon={FileText}
          action={{ label: 'New Template', onClick: () => setEditing('new') }}
        />
      ))}

      <PreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        loading={preview.isPending}
        subject={preview.data?.subject}
        body={preview.data?.body}
        contextLabel="sample contact"
      />
    </div>
  );
}

// ─── Compose tab ─────────────────────────────────────────────────────────────────

function ComposeTab() {
  const { data: templates } = useEmailTemplates();
  const { data: contacts, isLoading: contactsLoading } = useContacts();
  const { data: sends } = useEmailSends();
  const preview = usePreviewTemplate();
  const compose = useComposeEmail();

  const [templateId, setTemplateId] = useState('');
  const [selected, setSelected] = useState({}); // id -> true
  const [search, setSearch] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);

  // Default-select the default template once templates load.
  useEffect(() => {
    if (!templateId && templates?.length) {
      const def = templates.find((t) => t.is_default) || templates[0];
      setTemplateId(def.id);
    }
  }, [templates, templateId]);

  // Map contact_id -> most recent send time.
  const lastSentByContact = useMemo(() => {
    const map = {};
    (sends || []).forEach((s) => {
      if (!s.contact_id) return;
      const prev = map[String(s.contact_id)];
      if (!prev || new Date(s.sent_at) > new Date(prev)) map[String(s.contact_id)] = s.sent_at;
    });
    return map;
  }, [sends]);

  const withEmail = useMemo(
    () => (contacts || []).filter((c) => c.email),
    [contacts]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return withEmail;
    return withEmail.filter((c) =>
      [c.first_name, c.last_name, c.email, c.company, c.title]
        .filter(Boolean)
        .some((v) => v.toLowerCase().includes(q))
    );
  }, [withEmail, search]);

  const selectedIds = useMemo(
    () => Object.keys(selected).filter((id) => selected[id]),
    [selected]
  );
  const selectedContacts = useMemo(
    () => withEmail.filter((c) => selected[String(c.id)]),
    [withEmail, selected]
  );

  const allFilteredSelected =
    filtered.length > 0 && filtered.every((c) => selected[String(c.id)]);

  const toggleAll = () => {
    const next = { ...selected };
    if (allFilteredSelected) {
      filtered.forEach((c) => delete next[String(c.id)]);
    } else {
      filtered.forEach((c) => { next[String(c.id)] = true; });
    }
    setSelected(next);
  };

  const handlePreview = () => {
    const sample = selectedContacts[0] || withEmail[0];
    setPreviewOpen(true);
    preview.mutate({ template_id: templateId, contact_id: sample?.id, contact: sample });
  };

  const handleSend = () => {
    if (!selectedIds.length || !templateId) return;
    compose.mutate(
      { contact_ids: selectedIds, template_id: templateId, contacts: withEmail },
      { onSuccess: () => setSelected({}) }
    );
  };

  const previewContact = selectedContacts[0] || withEmail[0];

  return (
    <div className="space-y-5">
      {/* Controls */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Template</label>
            <select
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {(templates || []).map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}{t.is_default ? ' (default)' : ''}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end gap-2">
            <button
              type="button"
              onClick={handlePreview}
              disabled={!templateId || !previewContact}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              <Eye className="h-4 w-4" />
              Preview
            </button>
            <button
              type="button"
              onClick={handleSend}
              disabled={!selectedIds.length || !templateId || compose.isPending}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-600 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              {compose.isPending ? 'Sending…' : `Send to ${selectedIds.length} contact${selectedIds.length === 1 ? '' : 's'}`}
            </button>
          </div>
        </div>
      </div>

      {/* Contact selector */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b border-gray-100 p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-900">
            <Users className="h-4 w-4 text-gray-400" />
            Select Contacts
            <span className="text-xs font-normal text-gray-400">
              ({selectedIds.length} selected · {withEmail.length} with email)
            </span>
          </div>
          <div className="relative w-64">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search contacts…"
              className="w-full rounded-lg border border-gray-300 py-2 pl-8 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </div>

        {contactsLoading ? (
          <div className="flex justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-blue-600" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState title="No contacts found" description="Try a different search." icon={Users} />
        ) : (
          <div className="max-h-[28rem] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="w-10 px-4 py-2">
                    <input
                      type="checkbox"
                      checked={allFilteredSelected}
                      onChange={toggleAll}
                      className="h-4 w-4 rounded border-gray-300 text-blue-600"
                    />
                  </th>
                  <th className="px-4 py-2">Contact</th>
                  <th className="px-4 py-2">Company</th>
                  <th className="px-4 py-2">Email</th>
                  <th className="px-4 py-2">Last Emailed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((c) => {
                  const id = String(c.id);
                  const lastSent = lastSentByContact[id];
                  return (
                    <tr
                      key={id}
                      className={cn('cursor-pointer hover:bg-gray-50', selected[id] && 'bg-blue-50/50')}
                      onClick={() => setSelected((s) => ({ ...s, [id]: !s[id] }))}
                    >
                      <td className="px-4 py-2.5" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={!!selected[id]}
                          onChange={() => setSelected((s) => ({ ...s, [id]: !s[id] }))}
                          className="h-4 w-4 rounded border-gray-300 text-blue-600"
                        />
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="font-medium text-gray-900">
                          {[c.first_name, c.last_name].filter(Boolean).join(' ') || '—'}
                        </div>
                        {c.title && <div className="text-xs text-gray-500">{c.title}</div>}
                      </td>
                      <td className="px-4 py-2.5 text-gray-600">{c.company || '—'}</td>
                      <td className="px-4 py-2.5 text-gray-600">{c.email}</td>
                      <td className="px-4 py-2.5">
                        {lastSent ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700">
                            <CheckCircle2 className="h-3 w-3" />
                            {timeAgo(lastSent)}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <PreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        loading={preview.isPending}
        subject={preview.data?.subject}
        body={preview.data?.body}
        contextLabel={
          previewContact
            ? [previewContact.first_name, previewContact.last_name].filter(Boolean).join(' ')
            : 'sample contact'
        }
      />
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────────

export default function Outreach() {
  const [tab, setTab] = useState('templates');

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1 className="flex items-center gap-2 text-xl font-bold text-gray-900">
          <Mail className="h-5 w-5 text-blue-500" />
          Email Campaigns
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage outreach email templates and send the Apprend demo to your contacts.
        </p>
      </div>

      <div className="flex gap-1 border-b border-gray-200">
        {[
          { id: 'templates', label: 'Templates' },
          { id: 'compose', label: 'Compose & Send' },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              '-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors',
              tab === t.id
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'templates' ? <TemplatesTab /> : <ComposeTab />}
    </div>
  );
}
