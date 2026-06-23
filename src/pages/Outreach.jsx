import { useState, useMemo, useRef, useEffect } from 'react';
import DOMPurify from 'dompurify';
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
  Copy,
  UserPlus,
  Filter,
  TestTube,
  History,
  Clock,
  Bold,
  Italic,
  Link2,
  List,
  ListOrdered,
  Heading2,
  Pilcrow,
  Minus,
} from 'lucide-react';
import EmptyState from '../components/EmptyState';
import ConfirmDialog from '../components/ConfirmDialog';
import {
  useEmailTemplates,
  useCreateTemplate,
  useUpdateTemplate,
  useDeleteTemplate,
  useSetDefaultTemplate,
  usePreviewTemplate,
  useComposeEmail,
  useEmailSends,
  useSendTestEmail,
} from '../hooks/useEmailTemplates';
import { useContacts, useQuickAddContact } from '../hooks/useContacts';
import { useGmailStatus } from '../hooks/useGmail';
import { MERGE_FIELDS, DEMO_LINK } from '../lib/mockData';
import { cn, timeAgo, formatDate } from '../lib/utils';
import { Link } from 'react-router-dom';

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

function FormatToolbar({ textareaRef, value, onChange }) {
  const wrap = (tag, fallback) => {
    const el = textareaRef.current;
    if (!el) return;
    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;
    const selected = value.slice(start, end);
    let snippet;
    if (tag === 'a') {
      const url = selected.startsWith('http') ? selected : 'https://';
      const linkText = selected.startsWith('http') ? 'link text' : (selected || 'link text');
      snippet = `<a href="${url}">${linkText}</a>`;
    } else if (tag === 'ul') {
      snippet = selected
        ? `<ul>\n${selected.split('\n').map(l => `  <li>${l.trim()}</li>`).join('\n')}\n</ul>`
        : '<ul>\n  <li>Item</li>\n</ul>';
    } else if (tag === 'ol') {
      snippet = selected
        ? `<ol>\n${selected.split('\n').map(l => `  <li>${l.trim()}</li>`).join('\n')}\n</ol>`
        : '<ol>\n  <li>Item</li>\n</ol>';
    } else if (tag === 'hr') {
      snippet = '\n<hr>\n';
    } else {
      snippet = `<${tag}>${selected || fallback || ''}</${tag}>`;
    }
    onChange(value.slice(0, start) + snippet + value.slice(end));
    requestAnimationFrame(() => {
      el.focus();
      el.selectionStart = start;
      el.selectionEnd = start + snippet.length;
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-0.5 rounded-t-lg border border-b-0 border-gray-300 bg-gray-50 px-2 py-1.5">
      <span className="mr-1.5 text-[10px] font-medium uppercase tracking-wide text-gray-400">Format:</span>
      {[
        { icon: Bold, tag: 'strong', label: 'Bold' },
        { icon: Italic, tag: 'em', label: 'Italic' },
        { icon: Heading2, tag: 'h2', label: 'Heading' },
        { icon: Link2, tag: 'a', label: 'Link' },
        { icon: List, tag: 'ul', label: 'Bullet List' },
        { icon: ListOrdered, tag: 'ol', label: 'Numbered List' },
        { icon: Pilcrow, tag: 'p', label: 'Paragraph' },
        { icon: Minus, tag: 'hr', label: 'Divider' },
      ].map((btn) => (
        <button
          key={btn.tag}
          type="button"
          title={btn.label}
          onClick={() => wrap(btn.tag)}
          className="rounded p-1.5 text-gray-500 hover:bg-gray-200 hover:text-gray-700"
        >
          <btn.icon className="h-3.5 w-3.5" />
        </button>
      ))}
    </div>
  );
}

const EMAIL_BODY_STYLES = `
  .email-preview p { margin: 0 0 16px 0; line-height: 1.6; }
  .email-preview p:last-child { margin-bottom: 0; }
  .email-preview strong, .email-preview b { font-weight: 700; color: #111827; }
  .email-preview em, .email-preview i { font-style: italic; }
  .email-preview a { color: #2563eb; text-decoration: underline; }
  .email-preview a:hover { color: #1d4ed8; }
  .email-preview ul { list-style-type: disc; margin: 0 0 16px 0; padding-left: 24px; }
  .email-preview ol { list-style-type: decimal; margin: 0 0 16px 0; padding-left: 24px; }
  .email-preview li { margin: 0 0 8px 0; line-height: 1.5; }
  .email-preview li:last-child { margin-bottom: 0; }
  .email-preview h1 { font-size: 1.5rem; font-weight: 700; color: #111827; margin: 24px 0 12px 0; line-height: 1.3; }
  .email-preview h2 { font-size: 1.25rem; font-weight: 700; color: #111827; margin: 24px 0 12px 0; line-height: 1.3; }
  .email-preview h3 { font-size: 1.1rem; font-weight: 600; color: #111827; margin: 20px 0 10px 0; line-height: 1.3; }
  .email-preview h4 { font-size: 1rem; font-weight: 600; color: #111827; margin: 16px 0 8px 0; }
  .email-preview blockquote { border-left: 3px solid #d1d5db; padding-left: 16px; margin: 0 0 16px 0; color: #6b7280; font-style: italic; }
  .email-preview hr { border: none; border-top: 1px solid #e5e7eb; margin: 24px 0; }
  .email-preview br { display: block; content: ""; margin-top: 4px; }
  .email-preview table { border-collapse: collapse; width: 100%; margin: 0 0 16px 0; }
  .email-preview td, .email-preview th { border: 1px solid #e5e7eb; padding: 8px 12px; text-align: left; }
  .email-preview th { background: #f9fafb; font-weight: 600; }
  .email-preview img { max-width: 100%; height: auto; }
  .email-preview pre { background: #f3f4f6; padding: 12px; border-radius: 6px; overflow-x: auto; margin: 0 0 16px 0; font-size: 0.85em; }
  .email-preview code { background: #f3f4f6; padding: 2px 4px; border-radius: 3px; font-size: 0.9em; }
`;

const EMAIL_BODY_CLASSES = `email-preview max-w-none text-sm leading-relaxed text-gray-700`;

function PreviewModal({ open, onClose, loading, subject, body, contextLabel, templateId, templateName, onSaved }) {
  const [editing, setEditing] = useState(false);
  const [editSubject, setEditSubject] = useState('');
  const [editBody, setEditBody] = useState('');
  const [saveName, setSaveName] = useState('');
  const bodyRef = useRef(null);
  const updateTemplate = useUpdateTemplate();
  const createTemplate = useCreateTemplate();

  // Sync when preview data loads
  useEffect(() => {
    if (subject) setEditSubject(subject);
    if (body) setEditBody(body);
    if (templateName) setSaveName(templateName);
  }, [subject, body, templateName]);

  // Reset edit mode when modal closes
  useEffect(() => {
    if (!open) setEditing(false);
  }, [open]);

  if (!open) return null;

  const saving = updateTemplate.isPending || createTemplate.isPending;

  const handleSave = () => {
    if (!templateId) return;
    updateTemplate.mutate(
      { id: templateId, data: { subject: editSubject, body: editBody } },
      { onSuccess: () => { setEditing(false); if (onSaved) onSaved(); } }
    );
  };

  const handleSaveAsNew = () => {
    const name = saveName.trim();
    if (!name) return;
    createTemplate.mutate(
      { name, subject: editSubject, body: editBody },
      { onSuccess: () => { setEditing(false); if (onSaved) onSaved(); onClose(); } }
    );
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
      <style>{EMAIL_BODY_STYLES}</style>
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-xl bg-white shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-gray-400" />
            <h3 className="text-sm font-semibold text-gray-900">
              {editing ? 'Edit & Preview' : 'Email Preview'}
            </h3>
            {contextLabel && !editing && (
              <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-500">
                {contextLabel}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {!loading && !editing && (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                <Pencil className="h-3.5 w-3.5" />
                Edit
              </button>
            )}
            {editing && (
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                <Eye className="h-3.5 w-3.5" />
                Preview
              </button>
            )}
            <button type="button" onClick={onClose} className="rounded p-1 text-gray-400 hover:bg-gray-100">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-5">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-blue-600" />
            </div>
          ) : editing ? (
            /* ─── Edit mode ─── */
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">Subject</label>
                <input
                  type="text"
                  value={editSubject}
                  onChange={(e) => setEditSubject(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-gray-500">Body</label>
                <FormatToolbar textareaRef={bodyRef} value={editBody} onChange={setEditBody} />
                <textarea
                  ref={bodyRef}
                  value={editBody}
                  onChange={(e) => setEditBody(e.target.value)}
                  rows={10}
                  className="w-full rounded-b-lg rounded-t-none border border-gray-300 px-3 py-2 font-mono text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>
              {/* Live preview */}
              <div>
                <p className="mb-1 text-xs font-medium text-gray-500">Live Preview</p>
                <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                  <p className="mb-2 text-sm font-semibold text-gray-900">{editSubject}</p>
                  <div
                    className={EMAIL_BODY_CLASSES}
                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(editBody || '') }}
                  />
                </div>
              </div>
              {/* Save actions */}
              <div className="flex flex-col gap-3 border-t border-gray-200 pt-4 sm:flex-row sm:items-end sm:justify-between">
                <div className="flex-1">
                  <label className="mb-1 block text-xs font-medium text-gray-500">Save as new template (name)</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={saveName}
                      onChange={(e) => setSaveName(e.target.value)}
                      placeholder="New template name..."
                      className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <button
                      type="button"
                      onClick={handleSaveAsNew}
                      disabled={!saveName.trim() || saving}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-blue-300 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100 disabled:opacity-50"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Save New
                    </button>
                  </div>
                </div>
                {templateId && (
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="inline-flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-600 disabled:opacity-50"
                  >
                    {saving ? 'Saving…' : 'Update Template'}
                  </button>
                )}
              </div>
            </div>
          ) : (
            /* ─── Preview mode ─── */
            <>
              <div className="mb-4 border-b border-gray-100 pb-3">
                <p className="text-xs uppercase tracking-wide text-gray-400">Subject</p>
                <p className="mt-0.5 text-sm font-semibold text-gray-900">{subject}</p>
              </div>
              <div className="rounded-lg border border-gray-200 bg-white p-6">
                <div
                  className={EMAIL_BODY_CLASSES}
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(body || '') }}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Template editor ─────────────────────────────────────────────────────────────

function TemplateEditor({ template, onClose }) {
  const isEdit = Boolean(template) && Boolean(template.id);
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
            <label className="block text-sm font-medium text-gray-700">Body *</label>
          </div>
          <FormatToolbar textareaRef={bodyRef} value={body} onChange={(v) => { setBody(v); setActiveField('body'); }} />
          <textarea
            ref={bodyRef}
            value={body}
            onFocus={() => setActiveField('body')}
            onChange={(e) => setBody(e.target.value)}
            rows={12}
            placeholder="<p>Hi {{first_name}},</p>\n\n<p>I wanted to reach out about...</p>"
            className="w-full rounded-b-lg rounded-t-none border border-gray-300 px-3 py-2 font-mono text-xs focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
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

        <div className="flex flex-col gap-3 border-t border-gray-200 pt-4 sm:flex-row sm:justify-between">
          <button
            type="button"
            onClick={handlePreview}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
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
        templateId={isEdit ? template.id : undefined}
        templateName={name}
        contextLabel="sample contact"
      />
    </div>
  );
}

// ─── Template card ───────────────────────────────────────────────────────────────

function TemplateCard({ template, onEdit, onPreview, onDuplicate }) {
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
          onClick={() => onDuplicate(template)}
          className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100"
        >
          <Copy className="h-3.5 w-3.5" />
          Duplicate
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
  const [templateSearch, setTemplateSearch] = useState('');
  const preview = usePreviewTemplate();
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState(null);

  const handlePreview = (template) => {
    setPreviewTemplate(template);
    setPreviewOpen(true);
    preview.mutate({ template_id: template.id });
  };

  const handleDuplicate = (template) => {
    // Open editor pre-filled with the template's content, but without an id so it creates a new one.
    setEditing({
      name: `${template.name} (Copy)`,
      subject: template.subject,
      body: template.body,
      _duplicate: true, // flag so TemplateEditor treats it as new
    });
  };

  const filteredTemplates = useMemo(() => {
    const q = templateSearch.trim().toLowerCase();
    if (!q || !templates?.length) return templates || [];
    return templates.filter((t) =>
      [t.name, t.subject].filter(Boolean).some((v) => v.toLowerCase().includes(q))
    );
  }, [templates, templateSearch]);

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
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={templateSearch}
              onChange={(e) => setTemplateSearch(e.target.value)}
              placeholder="Search templates by name or subject..."
              className="w-full rounded-lg border border-gray-300 py-2 pl-8 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
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

      {!editing && (filteredTemplates.length ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {filteredTemplates.map((t) => (
            <TemplateCard key={t.id} template={t} onEdit={setEditing} onPreview={handlePreview} onDuplicate={handleDuplicate} />
          ))}
        </div>
      ) : templates?.length ? (
        <EmptyState
          title="No matching templates"
          description="Try a different search term."
          icon={Search}
        />
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
        templateId={previewTemplate?.id}
        templateName={previewTemplate?.name}
        contextLabel="sample contact"
      />
    </div>
  );
}

// ─── Quick-add contact modal ────────────────────────────────────────────────────

function QuickAddModal({ open, onClose }) {
  const [companyName, setCompanyName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [title, setTitle] = useState('');
  const quickAdd = useQuickAddContact();

  const reset = () => {
    setCompanyName('');
    setFirstName('');
    setLastName('');
    setEmail('');
    setTitle('');
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!companyName.trim() || !email.trim()) return;
    quickAdd.mutate(
      {
        company_name: companyName.trim(),
        first_name: firstName.trim() || undefined,
        last_name: lastName.trim() || undefined,
        email: email.trim(),
        title: title.trim() || undefined,
      },
      {
        onSuccess: () => {
          reset();
          onClose();
        },
      }
    );
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
          <div className="flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-blue-500" />
            <h3 className="text-sm font-semibold text-gray-900">Quick Add Contact</h3>
          </div>
          <button type="button" onClick={onClose} className="rounded p-1 text-gray-400 hover:bg-gray-100">
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3 p-5">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Company Name *</label>
            <input
              type="text"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Acme Corp"
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <p className="mt-0.5 text-xs text-gray-400">If the company already exists, the contact will be added to it.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">First Name</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Jane"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700">Last Name</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Doe"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Email *</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jane@acme.com"
              required
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="VP of Marketing"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div className="flex justify-end gap-3 border-t border-gray-100 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!companyName.trim() || !email.trim() || quickAdd.isPending}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-600 disabled:opacity-50"
            >
              <UserPlus className="h-4 w-4" />
              {quickAdd.isPending ? 'Adding…' : 'Add Contact'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Send Test modal ────────────────────────────────────────────────────────────

function SendTestModal({ open, onClose, templateId, senderAccountId, defaultEmail }) {
  const [testEmail, setTestEmail] = useState(defaultEmail || '');
  const sendTest = useSendTestEmail();

  useEffect(() => {
    if (open && defaultEmail) setTestEmail(defaultEmail);
  }, [open, defaultEmail]);

  const handleSend = () => {
    if (!testEmail.trim() || !templateId) return;
    sendTest.mutate(
      { template_id: templateId, test_email: testEmail.trim(), sender_account_id: senderAccountId || undefined },
      { onSuccess: () => onClose() }
    );
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-sm rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
          <div className="flex items-center gap-2">
            <TestTube className="h-4 w-4 text-blue-500" />
            <h3 className="text-sm font-semibold text-gray-900">Send Test Email</h3>
          </div>
          <button type="button" onClick={onClose} className="rounded p-1 text-gray-400 hover:bg-gray-100">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="space-y-3 p-5">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">Recipient Email</label>
            <input
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
            <p className="mt-1 text-xs text-gray-400">
              A test email will be sent using sample merge fields.
            </p>
          </div>
          <div className="flex justify-end gap-3 border-t border-gray-100 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSend}
              disabled={!testEmail.trim() || sendTest.isPending}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-600 disabled:opacity-50"
            >
              <Send className="h-4 w-4" />
              {sendTest.isPending ? 'Sending...' : 'Send Test'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Compose tab ─────────────────────────────────────────────────────────────────

function ComposeTab() {
  const { data: templates } = useEmailTemplates();
  const { data: contacts, isLoading: contactsLoading } = useContacts();
  const { data: sends } = useEmailSends();
  const { data: gmail } = useGmailStatus();
  const preview = usePreviewTemplate();
  const compose = useComposeEmail();

  const [templateId, setTemplateId] = useState('');
  const [senderId, setSenderId] = useState(''); // '' = active / fallback
  const [selected, setSelected] = useState({}); // id -> true
  const [search, setSearch] = useState('');
  const [industryFilter, setIndustryFilter] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [sendTestOpen, setSendTestOpen] = useState(false);
  const [sendConfirmOpen, setSendConfirmOpen] = useState(false);

  // Default-select the default template once templates load.
  useEffect(() => {
    if (!templateId && templates?.length) {
      const def = templates.find((t) => t.is_default) || templates[0];
      setTemplateId(def.id);
    }
  }, [templates, templateId]);

  // Default the sender to the active connected Gmail account.
  useEffect(() => {
    if (!senderId && gmail?.active_account_id) {
      setSenderId(gmail.active_account_id);
    }
  }, [gmail, senderId]);

  const gmailAccounts = gmail?.accounts?.filter((a) => a.status === 'connected') || [];
  const sendingEnabledAccounts = gmailAccounts.filter((a) => a.sending_enabled);
  const fromEmail = senderId === 'rotate'
    ? null
    : senderId
      ? gmailAccounts.find((a) => a.id === senderId)?.email
      : gmail?.active_email;
  const sendingVia = fromEmail || gmail?.fallback_sender;

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

  const uniqueIndustries = useMemo(
    () => [...new Set(withEmail.map((c) => c.industry_segment).filter(Boolean))].sort(),
    [withEmail]
  );

  const uniqueCompanies = useMemo(
    () => [...new Set(withEmail.map((c) => c.company).filter(Boolean))].sort(),
    [withEmail]
  );

  const filtered = useMemo(() => {
    let result = withEmail;
    if (industryFilter) {
      result = result.filter((c) => c.industry_segment === industryFilter);
    }
    if (companyFilter) {
      result = result.filter((c) => c.company === companyFilter);
    }
    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter((c) =>
        [c.first_name, c.last_name, c.email, c.company, c.title]
          .filter(Boolean)
          .some((v) => v.toLowerCase().includes(q))
      );
    }
    return result;
  }, [withEmail, search, industryFilter, companyFilter]);

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
    setSendConfirmOpen(true);
  };

  const handleSendConfirmed = () => {
    setSendConfirmOpen(false);
    compose.mutate(
      {
        contact_ids: selectedIds,
        template_id: templateId,
        sender_account_id: senderId === 'rotate' ? undefined : senderId || undefined,
        contacts: withEmail,
      },
      { onSuccess: () => setSelected({}) }
    );
  };

  const selectedTemplateName = (templates || []).find((t) => t.id === templateId)?.name || 'Selected template';

  const previewContact = selectedContacts[0] || withEmail[0];

  return (
    <div className="space-y-5">
      {/* Controls */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        {/* From / sender */}
        <div className="mb-4">
          <label className="mb-1 block text-sm font-medium text-gray-700">From</label>
          {gmailAccounts.length > 0 ? (
            <select
              value={senderId}
              onChange={(e) => setSenderId(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              {sendingEnabledAccounts.length > 1 && (
                <option value="rotate">
                  Auto-rotate ({sendingEnabledAccounts.length} accounts)
                </option>
              )}
              {gmailAccounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.email}{a.is_active ? ' (primary)' : ''}{!a.sending_enabled ? ' (disabled)' : ''}
                </option>
              ))}
            </select>
          ) : (
            <div className="flex flex-wrap items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
              <Mail className="h-4 w-4 flex-shrink-0" />
              <span>
                Sending from <span className="font-medium">{sendingVia}</span> (shared).
              </span>
              <Link to="/settings" className="font-medium text-blue-600 hover:underline">
                Connect your Gmail →
              </Link>
            </div>
          )}
          {gmailAccounts.length > 0 && (
            <div className="mt-1 flex items-center justify-between">
              <p className="flex items-center gap-1 text-xs text-green-600">
                <CheckCircle2 className="h-3.5 w-3.5" />
                {senderId === 'rotate'
                  ? `Emails will rotate across ${sendingEnabledAccounts.length} accounts for better deliverability.`
                  : 'Recipients will see this as the sender — authenticated, inbox-safe.'}
              </p>
              <Link to="/settings" className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline">
                <Plus className="h-3 w-3" />
                Add account
              </Link>
            </div>
          )}
        </div>

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
          <div className="flex flex-wrap items-end gap-2">
            <button
              type="button"
              onClick={handlePreview}
              disabled={!templateId || !previewContact}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 sm:px-4"
            >
              <Eye className="h-4 w-4" />
              Preview
            </button>
            <button
              type="button"
              onClick={() => setSendTestOpen(true)}
              disabled={!templateId}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 sm:px-4"
            >
              <TestTube className="h-4 w-4" />
              Test
            </button>
            <button
              type="button"
              onClick={handleSend}
              disabled={!selectedIds.length || !templateId || compose.isPending}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-600 disabled:opacity-50 sm:w-auto sm:flex-1"
            >
              <Send className="h-4 w-4" />
              {compose.isPending ? 'Sending…' : `Send to ${selectedIds.length}`}
            </button>
          </div>
        </div>
      </div>

      {/* Contact selector */}
      <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-gray-100 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-gray-900">
            <Users className="h-4 w-4 text-gray-400" />
            Select Contacts
            <span className="text-xs font-normal text-gray-400">
              ({selectedIds.length} selected · {withEmail.length} with email)
            </span>
            <button
              type="button"
              onClick={() => setQuickAddOpen(true)}
              className="inline-flex items-center gap-1 rounded-md bg-green-50 px-2.5 py-1 text-xs font-medium text-green-700 hover:bg-green-100"
            >
              <UserPlus className="h-3.5 w-3.5" />
              Quick Add
            </button>
          </div>
          <div className="relative w-full sm:w-64">
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

        {/* Industry & Company filters */}
        {(uniqueIndustries.length > 0 || uniqueCompanies.length > 0) && (
          <div className="flex flex-wrap items-center gap-3 border-b border-gray-100 px-4 py-3">
            <Filter className="h-4 w-4 text-gray-400" />
            {uniqueIndustries.length > 0 && (
              <select
                value={industryFilter}
                onChange={(e) => setIndustryFilter(e.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">All Industries</option>
                {uniqueIndustries.map((ind) => (
                  <option key={ind} value={ind}>{ind}</option>
                ))}
              </select>
            )}
            {uniqueCompanies.length > 0 && (
              <select
                value={companyFilter}
                onChange={(e) => setCompanyFilter(e.target.value)}
                className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">All Companies</option>
                {uniqueCompanies.map((co) => (
                  <option key={co} value={co}>{co}</option>
                ))}
              </select>
            )}
            {(industryFilter || companyFilter) && (
              <button
                type="button"
                onClick={() => { setIndustryFilter(''); setCompanyFilter(''); }}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-gray-500 hover:bg-gray-100"
              >
                <X className="h-3 w-3" />
                Clear filters
              </button>
            )}
          </div>
        )}

        {contactsLoading ? (
          <div className="flex justify-center py-12">
            <div className="h-6 w-6 animate-spin rounded-full border-b-2 border-blue-600" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState title="No contacts found" description="Try a different search." icon={Users} />
        ) : (
          <div className="max-h-[28rem] overflow-auto">
            <table className="w-full min-w-[640px] text-sm">
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
        templateId={templateId}
        templateName={(templates || []).find((t) => t.id === templateId)?.name}
        contextLabel={
          previewContact
            ? [previewContact.first_name, previewContact.last_name].filter(Boolean).join(' ')
            : 'sample contact'
        }
      />

      <QuickAddModal open={quickAddOpen} onClose={() => setQuickAddOpen(false)} />

      <SendTestModal
        open={sendTestOpen}
        onClose={() => setSendTestOpen(false)}
        templateId={templateId}
        senderAccountId={senderId}
        defaultEmail={fromEmail || ''}
      />

      <ConfirmDialog
        open={sendConfirmOpen}
        title="Confirm Email Send"
        message={`You're about to send emails to ${selectedIds.length} contact${selectedIds.length === 1 ? '' : 's'} using the '${selectedTemplateName}' template. This cannot be undone. Continue?`}
        confirmLabel="Send Emails"
        variant="warning"
        onConfirm={handleSendConfirmed}
        onCancel={() => setSendConfirmOpen(false)}
      />
    </div>
  );
}

// ─── History tab ────────────────────────────────────────────────────────────────

function HistoryTab() {
  const { data: sends, isLoading } = useEmailSends();
  const [historySearch, setHistorySearch] = useState('');

  const sorted = useMemo(() => {
    const items = [...(sends || [])];
    items.sort((a, b) => new Date(b.sent_at) - new Date(a.sent_at));
    return items;
  }, [sends]);

  const filtered = useMemo(() => {
    const q = historySearch.trim().toLowerCase();
    if (!q) return sorted;
    return sorted.filter((s) =>
      [s.to_email, s.subject].filter(Boolean).some((v) => v.toLowerCase().includes(q))
    );
  }, [sorted, historySearch]);

  const statusBadge = (status) => {
    const styles = {
      sent: 'bg-gray-100 text-gray-700',
      delivered: 'bg-gray-100 text-gray-700',
      opened: 'bg-blue-50 text-blue-700',
      clicked: 'bg-yellow-50 text-yellow-700',
      replied: 'bg-green-50 text-green-700',
      bounced: 'bg-red-50 text-red-700',
      failed: 'bg-red-50 text-red-700',
    };
    const label = status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Unknown';
    return (
      <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', styles[status] || 'bg-gray-100 text-gray-600')}>
        {label}
      </span>
    );
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
      <div className="relative w-full sm:w-72">
        <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
        <input
          type="text"
          value={historySearch}
          onChange={(e) => setHistorySearch(e.target.value)}
          placeholder="Search by recipient or subject..."
          className="w-full rounded-lg border border-gray-300 py-2 pl-8 pr-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title={sends?.length ? 'No matching sends' : 'No emails sent yet'}
          description={sends?.length ? 'Try a different search term.' : 'Compose and send your first email campaign to see history here.'}
          icon={History}
        />
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
          <div className="max-h-[36rem] overflow-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="sticky top-0 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-2">Recipient</th>
                  <th className="px-4 py-2">Subject</th>
                  <th className="px-4 py-2">Status</th>
                  <th className="px-4 py-2">Opened At</th>
                  <th className="px-4 py-2">Sent At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 text-gray-900">{s.to_email || '—'}</td>
                    <td className="px-4 py-2.5 text-gray-600">{s.subject || '—'}</td>
                    <td className="px-4 py-2.5">{statusBadge(s.status)}</td>
                    <td className="px-4 py-2.5">
                      {s.opened_at ? (
                        <span className="inline-flex items-center gap-1 text-xs text-blue-600">
                          <Eye className="h-3 w-3" />
                          {formatDate(s.opened_at)}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      {s.sent_at ? (
                        <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                          <Clock className="h-3 w-3" />
                          {formatDate(s.sent_at)}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
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
          { id: 'history', label: 'History' },
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

      {tab === 'templates' && <TemplatesTab />}
      {tab === 'compose' && <ComposeTab />}
      {tab === 'history' && <HistoryTab />}
    </div>
  );
}
