import { Star, Eye, Pencil, Copy, Trash2 } from 'lucide-react';
import { useSetDefaultTemplate, useDeleteTemplate } from '../../hooks/useEmailTemplates';
import { cn } from '../../lib/utils';

export default function TemplateCard({ template, onEdit, onPreview, onDuplicate }) {
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
