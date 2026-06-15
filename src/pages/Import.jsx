import { useState } from 'react';
import {
  Upload,
  FileText,
  Check,
  AlertCircle,
  Clock,
  Download,
} from 'lucide-react';
import CSVUploader from '../components/CSVUploader';
import { useImportCSV } from '../hooks/useCompanies';
import { formatDate } from '../lib/utils';

const mockImportHistory = [
  {
    id: 1,
    filename: 'leads-batch-march.csv',
    date: new Date(Date.now() - 7 * 86400000).toISOString(),
    rows_imported: 45,
    rows_skipped: 3,
    errors: 0,
    status: 'completed',
  },
  {
    id: 2,
    filename: 'conference-contacts.csv',
    date: new Date(Date.now() - 14 * 86400000).toISOString(),
    rows_imported: 28,
    rows_skipped: 1,
    errors: 2,
    status: 'completed',
  },
  {
    id: 3,
    filename: 'linkedin-export-feb.csv',
    date: new Date(Date.now() - 30 * 86400000).toISOString(),
    rows_imported: 112,
    rows_skipped: 8,
    errors: 0,
    status: 'completed',
  },
];

const supportedColumns = [
  { name: 'name', required: true, description: 'Company name' },
  { name: 'domain', required: false, description: 'Company website domain' },
  { name: 'city', required: false, description: 'City location' },
  { name: 'state', required: false, description: 'State or province' },
  { name: 'country', required: false, description: 'Country (USA, Canada)' },
  { name: 'employees', required: false, description: 'Number of employees' },
  { name: 'industry', required: false, description: 'Industry category' },
  { name: 'naics_code', required: false, description: 'NAICS industry code' },
  { name: 'source', required: false, description: 'Lead source identifier' },
  { name: 'tags', required: false, description: 'Comma-separated tags' },
  { name: 'notes', required: false, description: 'Additional notes' },
];

function StatusBadge({ status }) {
  if (status === 'completed') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
        <Check className="h-3 w-3" />
        Completed
      </span>
    );
  }
  if (status === 'failed') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
        <AlertCircle className="h-3 w-3" />
        Failed
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">
      <Clock className="h-3 w-3" />
      Processing
    </span>
  );
}

export default function Import() {
  const importCSV = useImportCSV();
  const [importResult, setImportResult] = useState(null);

  const handleUpload = async (formData) => {
    const result = await importCSV.mutateAsync(formData);
    setImportResult(result);
  };

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
            <p className="text-sm text-gray-500">Import companies from a CSV file</p>
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
              <p className="text-sm text-green-700">Your CSV has been processed successfully.</p>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-4">
            <div className="rounded-lg bg-white p-3 text-center">
              <p className="text-2xl font-bold text-green-600">{importResult.imported || 0}</p>
              <p className="text-xs text-gray-500">Imported</p>
            </div>
            <div className="rounded-lg bg-white p-3 text-center">
              <p className="text-2xl font-bold text-yellow-600">{importResult.skipped || 0}</p>
              <p className="text-xs text-gray-500">Skipped</p>
            </div>
            <div className="rounded-lg bg-white p-3 text-center">
              <p className="text-2xl font-bold text-red-600">{importResult.errors || 0}</p>
              <p className="text-xs text-gray-500">Errors</p>
            </div>
          </div>
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
              <li className="flex items-start gap-2 text-sm text-gray-600">
                <FileText className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-400" />
                File must be in CSV (Comma-Separated Values) format
              </li>
              <li className="flex items-start gap-2 text-sm text-gray-600">
                <FileText className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-400" />
                Encoding must be UTF-8
              </li>
              <li className="flex items-start gap-2 text-sm text-gray-600">
                <FileText className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-400" />
                Maximum file size: 10MB
              </li>
              <li className="flex items-start gap-2 text-sm text-gray-600">
                <FileText className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-400" />
                First row must contain column headers
              </li>
              <li className="flex items-start gap-2 text-sm text-gray-600">
                <FileText className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-400" />
                Duplicate companies (same domain) will be skipped
              </li>
            </ul>

            <div className="mt-4 rounded-lg bg-blue-50 p-3">
              <p className="text-xs font-medium text-blue-700">Sample CSV Format:</p>
              <code className="mt-1 block text-xs text-blue-600">
                name,domain,city,state,country,employees,industry<br />
                Acme Corp,acme.com,SF,CA,USA,500,Technology
              </code>
            </div>
          </div>
        </div>
      </div>

      {/* Import History */}
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-gray-900">Import History</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">File</th>
                <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Date</th>
                <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Imported</th>
                <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Skipped</th>
                <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Errors</th>
                <th className="pb-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {mockImportHistory.map((item) => (
                <tr key={item.id}>
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-gray-400" />
                      <span className="text-sm font-medium text-gray-900">{item.filename}</span>
                    </div>
                  </td>
                  <td className="py-3 pr-4 text-sm text-gray-600">{formatDate(item.date)}</td>
                  <td className="py-3 pr-4 text-sm font-medium text-green-600">{item.rows_imported}</td>
                  <td className="py-3 pr-4 text-sm text-yellow-600">{item.rows_skipped}</td>
                  <td className="py-3 pr-4 text-sm text-red-600">{item.errors}</td>
                  <td className="py-3"><StatusBadge status={item.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
