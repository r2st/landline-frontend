import { useState } from 'react';
import {
  Upload,
  FileText,
  Check,
  AlertCircle,
} from 'lucide-react';
import CSVUploader from '../components/CSVUploader';
import { useImportCSV } from '../hooks/useCompanies';

// These mirror the columns the backend CSV importer actually reads.
const supportedColumns = [
  { name: 'company_name', required: true, description: 'Company name' },
  { name: 'domain', required: false, description: 'Company website domain (used for dedupe)' },
  { name: 'city', required: false, description: 'City location' },
  { name: 'state', required: false, description: 'State or province' },
  { name: 'country', required: false, description: 'Country (US or CA)' },
  { name: 'employee_count', required: false, description: 'Number of employees' },
  { name: 'contact_name', required: false, description: 'Primary contact full name' },
  { name: 'contact_email', required: false, description: 'Primary contact email' },
  { name: 'contact_title', required: false, description: 'Primary contact job title' },
];

export default function Import() {
  const importCSV = useImportCSV();
  const [importResult, setImportResult] = useState(null);

  const handleUpload = async (formData) => {
    try {
      const result = await importCSV.mutateAsync(formData);
      setImportResult(result);
    } catch {
      // Error toast is shown by the mutation's onError handler
    }
  };

  const errors = importResult?.errors || [];

  return (
    <div className="mx-auto max-w-4xl space-y-8">
      {/* Upload Section */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
            <Upload className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Upload CSV</h2>
            <p className="text-sm text-gray-500">Bulk-import companies and their primary contacts</p>
          </div>
        </div>
        <CSVUploader onUpload={handleUpload} isLoading={importCSV.isPending} />
      </div>

      {/* Import Result */}
      {importResult && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
              <Check className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-green-900">Import Complete</h3>
              <p className="text-sm text-green-700">Your CSV has been processed.</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div className="rounded-lg bg-white p-3 text-center">
              <p className="text-2xl font-bold text-green-600">{importResult.imported_companies ?? 0}</p>
              <p className="text-xs text-gray-500">Companies</p>
            </div>
            <div className="rounded-lg bg-white p-3 text-center">
              <p className="text-2xl font-bold text-blue-600">{importResult.imported_contacts ?? 0}</p>
              <p className="text-xs text-gray-500">Contacts</p>
            </div>
            <div className="rounded-lg bg-white p-3 text-center">
              <p className="text-2xl font-bold text-yellow-600">{importResult.skipped ?? 0}</p>
              <p className="text-xs text-gray-500">Skipped</p>
            </div>
            <div className="rounded-lg bg-white p-3 text-center">
              <p className="text-2xl font-bold text-red-600">{errors.length}</p>
              <p className="text-xs text-gray-500">Errors</p>
            </div>
          </div>
          {errors.length > 0 && (
            <div className="mt-4 max-h-40 overflow-y-auto rounded-lg bg-white p-3">
              <p className="mb-1 text-xs font-semibold text-red-600">Row errors</p>
              <ul className="space-y-0.5 text-xs text-gray-600">
                {errors.slice(0, 50).map((e, i) => (
                  <li key={i} className="font-mono">{e}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Instructions */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Import Instructions</h2>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Supported Columns */}
          <div>
            <h3 className="mb-2 text-sm font-semibold text-gray-700">Supported Columns</h3>
            <div className="space-y-1.5">
              {supportedColumns.map((col) => (
                <div key={col.name} className="flex items-center justify-between rounded-md bg-gray-50 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <code className="rounded bg-gray-200 px-1.5 py-0.5 text-xs font-mono text-gray-700">{col.name}</code>
                    {col.required && (
                      <span className="text-xs font-medium text-red-500">required</span>
                    )}
                  </div>
                  <span className="text-xs text-gray-500">{col.description}</span>
                </div>
              ))}
            </div>
          </div>

          {/* File Requirements */}
          <div>
            <h3 className="mb-2 text-sm font-semibold text-gray-700">File Requirements</h3>
            <ul className="space-y-2">
              {[
                'File must be in CSV (Comma-Separated Values) format',
                'Encoding should be UTF-8',
                'Maximum file size: 10MB',
                'First row must contain column headers',
                'Duplicate companies (same domain or name) are skipped',
              ].map((req) => (
                <li key={req} className="flex items-start gap-2 text-sm text-gray-600">
                  <FileText className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-400" />
                  {req}
                </li>
              ))}
            </ul>

            <div className="mt-4 rounded-lg bg-blue-50 p-3">
              <p className="text-xs font-medium text-blue-700">Sample CSV Format:</p>
              <code className="mt-1 block text-xs text-blue-600">
                company_name,domain,city,state,country,employee_count,contact_name,contact_email,contact_title<br />
                Acme Corp,acme.com,Detroit,MI,US,500,Jane Doe,jane@acme.com,VP Ops
              </code>
            </div>

            <div className="mt-4 flex items-start gap-2 rounded-lg bg-yellow-50 px-3 py-2 text-xs text-yellow-700">
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
              Only <code className="mx-1 font-mono">company_name</code> is required; every other column is optional.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
