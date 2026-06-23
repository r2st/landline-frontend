import { useState, useMemo, useCallback } from 'react';
import {
  Upload,
  FileText,
  Check,
  AlertCircle,
  Download,
  ArrowRight,
  ArrowLeft,
  AlertTriangle,
  Table,
  Loader2,
  RotateCcw,
} from 'lucide-react';
import toast from 'react-hot-toast';
import CSVUploader from '../components/CSVUploader';
import { useImportCSV } from '../hooks/useCompanies';

// Target fields the backend CSV importer accepts.
const TARGET_FIELDS = [
  { value: '', label: '-- Skip --' },
  { value: 'company_name', label: 'Company Name', required: true },
  { value: 'domain', label: 'Domain' },
  { value: 'city', label: 'City' },
  { value: 'state', label: 'State' },
  { value: 'country', label: 'Country' },
  { value: 'employee_count', label: 'Employee Count' },
  { value: 'contact_name', label: 'Contact Name' },
  { value: 'contact_email', label: 'Contact Email' },
  { value: 'contact_title', label: 'Contact Title' },
];

const TEMPLATE_HEADERS = [
  'company_name',
  'domain',
  'city',
  'state',
  'country',
  'employee_count',
  'contact_name',
  'contact_email',
  'contact_title',
];

const TEMPLATE_EXAMPLE_ROW = [
  'Acme Corp',
  'acme.com',
  'Detroit',
  'MI',
  'US',
  '500',
  'Jane Doe',
  'jane@acme.com',
  'VP Ops',
];

const STEPS = [
  { key: 'upload', label: 'Upload' },
  { key: 'preview', label: 'Preview' },
  { key: 'import', label: 'Import' },
];

// ---------------------------------------------------------------------------
// CSV Parsing (client-side, no dependencies)
// ---------------------------------------------------------------------------
function parseCSV(text) {
  const lines = text.split('\n').filter((l) => l.trim());
  if (lines.length === 0) return { headers: [], rows: [] };
  const headers = parseLine(lines[0]);
  const rows = lines.slice(1).map(parseLine);
  return { headers, rows };
}

function parseLine(line) {
  const values = [];
  let current = '';
  let inQuotes = false;
  for (const char of line) {
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current.trim());
  return values;
}

// ---------------------------------------------------------------------------
// Auto-map a CSV header to the best matching target field
// ---------------------------------------------------------------------------
function autoMapHeader(header) {
  const normalized = header.toLowerCase().replace(/[\s_-]+/g, '_').trim();
  for (const field of TARGET_FIELDS) {
    if (!field.value) continue;
    if (normalized === field.value) return field.value;
  }
  // Fuzzy fallbacks
  const aliases = {
    company: 'company_name',
    company_name: 'company_name',
    name: 'company_name',
    website: 'domain',
    url: 'domain',
    domain: 'domain',
    city: 'city',
    state: 'state',
    province: 'state',
    country: 'country',
    employees: 'employee_count',
    employee_count: 'employee_count',
    size: 'employee_count',
    contact: 'contact_name',
    contact_name: 'contact_name',
    email: 'contact_email',
    contact_email: 'contact_email',
    title: 'contact_title',
    contact_title: 'contact_title',
    job_title: 'contact_title',
    role: 'contact_title',
  };
  return aliases[normalized] || '';
}

// ---------------------------------------------------------------------------
// Duplicate email detection
// ---------------------------------------------------------------------------
function findDuplicateEmails(rows, emailColIndex) {
  if (emailColIndex < 0) return 0;
  const seen = new Map();
  let count = 0;
  for (const row of rows) {
    const email = (row[emailColIndex] || '').toLowerCase().trim();
    if (!email) continue;
    if (seen.has(email)) {
      count++;
    } else {
      seen.set(email, true);
    }
  }
  return count;
}

// ---------------------------------------------------------------------------
// CSV generation helpers
// ---------------------------------------------------------------------------
function downloadCSV(filename, headerRow, dataRows) {
  const escape = (v) => {
    const s = String(v ?? '');
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  const lines = [headerRow.map(escape).join(',')];
  for (const row of dataRows) {
    lines.push(row.map(escape).join(','));
  }
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function downloadTemplate() {
  downloadCSV('landline_import_template.csv', TEMPLATE_HEADERS, [TEMPLATE_EXAMPLE_ROW]);
  toast.success('Template downloaded');
}

// ---------------------------------------------------------------------------
// Remap CSV file using field mappings, then wrap in FormData
// ---------------------------------------------------------------------------
function buildMappedFormData(file, headers, rows, mappings) {
  // Build header row from mappings
  const mappedHeaders = headers.map((_, i) => mappings[i] || '');
  const escape = (v) => {
    const s = String(v ?? '');
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const lines = [mappedHeaders.map(escape).join(',')];
  for (const row of rows) {
    const mapped = mappedHeaders.map((fieldName, i) => {
      if (!fieldName) return '';
      return escape(row[i] ?? '');
    });
    lines.push(mapped.join(','));
  }

  const csvContent = lines.join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const mappedFile = new File([blob], file.name, { type: 'text/csv' });

  const formData = new FormData();
  formData.append('file', mappedFile);
  return formData;
}

// ---------------------------------------------------------------------------
// Step Indicator Component
// ---------------------------------------------------------------------------
function StepIndicator({ currentStep }) {
  return (
    <div className="flex items-center justify-center gap-0">
      {STEPS.map((step, idx) => {
        const isActive = idx === currentStep;
        const isCompleted = idx < currentStep;
        return (
          <div key={step.key} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-semibold transition-colors ${
                  isActive
                    ? 'border-blue-500 bg-blue-500 text-white'
                    : isCompleted
                      ? 'border-blue-500 bg-blue-50 text-blue-600'
                      : 'border-gray-300 bg-white text-gray-400'
                }`}
              >
                {isCompleted ? <Check className="h-4 w-4" /> : idx + 1}
              </div>
              <span
                className={`mt-1.5 text-xs font-medium ${
                  isActive ? 'text-blue-600' : isCompleted ? 'text-blue-500' : 'text-gray-400'
                }`}
              >
                {step.label}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div
                className={`mx-3 mb-5 h-0.5 w-16 sm:w-24 ${
                  isCompleted ? 'bg-blue-500' : 'bg-gray-200'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ===========================================================================
// Main Import Component
// ===========================================================================
export default function Import() {
  const importCSV = useImportCSV();

  // Wizard state
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedFile, setSelectedFile] = useState(null);
  const [parsedData, setParsedData] = useState(null); // { headers, rows }
  const [mappings, setMappings] = useState({}); // { colIndex: targetField }
  const [importResult, setImportResult] = useState(null);
  const [lastImportResult, setLastImportResult] = useState(null);

  // -----------------------------------------------------------------------
  // Step 1: File selected via CSVUploader
  // -----------------------------------------------------------------------
  const handleFileSelected = useCallback((formData) => {
    const file = formData.get('file');
    if (!file) return;

    setSelectedFile(file);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target.result;
      const { headers, rows } = parseCSV(text);

      if (headers.length === 0) {
        toast.error('CSV appears to be empty');
        return;
      }

      setParsedData({ headers, rows });

      // Auto-map columns
      const autoMappings = {};
      const usedTargets = new Set();
      headers.forEach((header, idx) => {
        const mapped = autoMapHeader(header);
        // Prevent mapping the same target field twice
        if (mapped && !usedTargets.has(mapped)) {
          autoMappings[idx] = mapped;
          usedTargets.add(mapped);
        } else {
          autoMappings[idx] = '';
        }
      });
      setMappings(autoMappings);
      setCurrentStep(1);
    };
    reader.onerror = () => {
      toast.error('Failed to read the file');
    };
    reader.readAsText(file);
  }, []);

  // -----------------------------------------------------------------------
  // Step 2: Column mapping
  // -----------------------------------------------------------------------
  const handleMappingChange = useCallback(
    (colIndex, targetField) => {
      setMappings((prev) => {
        const next = { ...prev };
        // If another column was already mapped to this target, clear it
        if (targetField) {
          for (const key in next) {
            if (String(key) !== String(colIndex) && next[key] === targetField) {
              next[key] = '';
            }
          }
        }
        next[colIndex] = targetField;
        return next;
      });
    },
    [],
  );

  const isCompanyNameMapped = useMemo(() => {
    return Object.values(mappings).includes('company_name');
  }, [mappings]);

  const duplicateEmailCount = useMemo(() => {
    if (!parsedData) return 0;
    const emailColIndex = Object.entries(mappings).find(
      ([, v]) => v === 'contact_email',
    );
    if (!emailColIndex) return 0;
    return findDuplicateEmails(parsedData.rows, Number(emailColIndex[0]));
  }, [parsedData, mappings]);

  const previewRows = useMemo(() => {
    if (!parsedData) return [];
    return parsedData.rows.slice(0, 5);
  }, [parsedData]);

  // -----------------------------------------------------------------------
  // Step 3: Run Import
  // -----------------------------------------------------------------------
  const handleImport = useCallback(async () => {
    if (!selectedFile || !parsedData) return;

    const formData = buildMappedFormData(
      selectedFile,
      parsedData.headers,
      parsedData.rows,
      mappings,
    );

    try {
      const result = await importCSV.mutateAsync(formData);
      setImportResult(result);
      setLastImportResult(result);
      setCurrentStep(2);
    } catch {
      // Error toast is shown by the mutation's onError handler
    }
  }, [selectedFile, parsedData, mappings, importCSV]);

  // -----------------------------------------------------------------------
  // Error report download
  // -----------------------------------------------------------------------
  const errors = importResult?.errors || [];

  const handleDownloadErrors = useCallback(() => {
    if (errors.length === 0) return;
    // Parse errors into row number + message where possible
    const errorRows = errors.map((err) => {
      const match = err.match(/^(?:Row\s+)?(\d+):?\s*(.*)$/i);
      if (match) return [match[1], match[2]];
      return ['', err];
    });
    downloadCSV('import_errors.csv', ['Row', 'Error'], errorRows);
    toast.success('Error report downloaded');
  }, [errors]);

  // -----------------------------------------------------------------------
  // Reset wizard
  // -----------------------------------------------------------------------
  const resetWizard = useCallback(() => {
    setCurrentStep(0);
    setSelectedFile(null);
    setParsedData(null);
    setMappings({});
    setImportResult(null);
  }, []);

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------
  return (
    <div className="mx-auto max-w-4xl space-y-8">
      {/* Step Indicator */}
      <div className="rounded-xl border border-gray-200 bg-white px-6 py-5 shadow-sm">
        <StepIndicator currentStep={currentStep} />
      </div>

      {/* ================================================================= */}
      {/* Step 1: Upload                                                     */}
      {/* ================================================================= */}
      {currentStep === 0 && (
        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                <Upload className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Upload CSV</h2>
                <p className="text-sm text-gray-500">
                  Bulk-import companies and their primary contacts
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={downloadTemplate}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
            >
              <Download className="h-4 w-4" />
              Download Template
            </button>
          </div>
          <CSVUploader onUpload={handleFileSelected} isLoading={false} />

          {/* Instructions */}
          <div className="mt-6 border-t border-gray-100 pt-5">
            <h3 className="mb-3 text-sm font-semibold text-gray-700">Import Instructions</h3>
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <div>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Supported Columns
                </h4>
                <div className="space-y-1">
                  {TARGET_FIELDS.filter((f) => f.value).map((col) => (
                    <div
                      key={col.value}
                      className="flex items-center justify-between rounded-md bg-gray-50 px-3 py-1.5"
                    >
                      <div className="flex items-center gap-2">
                        <code className="rounded bg-gray-200 px-1.5 py-0.5 text-xs font-mono text-gray-700">
                          {col.value}
                        </code>
                        {col.required && (
                          <span className="text-xs font-medium text-red-500">required</span>
                        )}
                      </div>
                      <span className="text-xs text-gray-500">{col.label}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">
                  File Requirements
                </h4>
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
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* Step 2: Preview & Map                                              */}
      {/* ================================================================= */}
      {currentStep === 1 && parsedData && (
        <div className="space-y-5">
          {/* File info bar */}
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <FileText className="h-5 w-5 text-blue-500" />
                <div>
                  <p className="text-sm font-medium text-gray-900">{selectedFile?.name}</p>
                  <p className="text-xs text-gray-500">
                    {parsedData.rows.length} row{parsedData.rows.length !== 1 ? 's' : ''} detected
                    {' / '}
                    {parsedData.headers.length} column
                    {parsedData.headers.length !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={resetWizard}
                className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-100"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Change file
              </button>
            </div>
          </div>

          {/* Duplicate warning */}
          {duplicateEmailCount > 0 && (
            <div className="flex items-center gap-3 rounded-xl border border-yellow-200 bg-yellow-50 px-4 py-3">
              <AlertTriangle className="h-5 w-5 flex-shrink-0 text-yellow-600" />
              <p className="text-sm text-yellow-800">
                <span className="font-semibold">{duplicateEmailCount} duplicate email{duplicateEmailCount !== 1 ? 's' : ''}</span> found
                in your CSV — duplicates will be skipped.
              </p>
            </div>
          )}

          {/* Required field warning */}
          {!isCompanyNameMapped && (
            <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
              <AlertCircle className="h-5 w-5 flex-shrink-0 text-red-500" />
              <p className="text-sm text-red-700">
                <span className="font-semibold">company_name</span> is required but not mapped to
                any column. Map it below to continue.
              </p>
            </div>
          )}

          {/* Column Mapping */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100">
                <Table className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Column Mapping</h2>
                <p className="text-sm text-gray-500">
                  Map your CSV columns to Landline fields
                </p>
              </div>
            </div>

            <div className="space-y-2">
              {parsedData.headers.map((header, idx) => {
                const mapped = mappings[idx] || '';
                const targetField = TARGET_FIELDS.find((f) => f.value === mapped);
                const isRequired = targetField?.required;
                return (
                  <div
                    key={idx}
                    className="flex items-center gap-3 rounded-lg border border-gray-100 bg-gray-50 px-4 py-2.5"
                  >
                    <code className="min-w-0 flex-1 truncate rounded bg-white px-2 py-1 text-sm font-mono text-gray-700 border border-gray-200">
                      {header}
                    </code>
                    <ArrowRight className="h-4 w-4 flex-shrink-0 text-gray-400" />
                    <select
                      value={mapped}
                      onChange={(e) => handleMappingChange(idx, e.target.value)}
                      className={`flex-1 rounded-lg border px-3 py-2 text-sm ${
                        isRequired
                          ? 'border-blue-300 bg-blue-50 font-medium text-blue-700'
                          : mapped
                            ? 'border-gray-300 bg-white text-gray-700'
                            : 'border-gray-200 bg-white text-gray-400'
                      }`}
                    >
                      {TARGET_FIELDS.map((field) => (
                        <option key={field.value} value={field.value}>
                          {field.label}
                          {field.required ? ' (required)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Preview Table */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold text-gray-700">
              Preview (first {Math.min(previewRows.length, 5)} rows)
            </h3>
            <div className="overflow-x-auto rounded-lg border border-gray-200">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="whitespace-nowrap border-b border-gray-200 px-3 py-2 text-xs font-semibold text-gray-500">
                      #
                    </th>
                    {parsedData.headers.map((header, idx) => {
                      const mapped = mappings[idx] || '';
                      const targetField = TARGET_FIELDS.find((f) => f.value === mapped);
                      return (
                        <th
                          key={idx}
                          className="whitespace-nowrap border-b border-gray-200 px-3 py-2 text-xs font-semibold text-gray-500"
                        >
                          <div>{header}</div>
                          {mapped && (
                            <div
                              className={`mt-0.5 text-xs font-normal ${
                                targetField?.required ? 'text-blue-600' : 'text-green-600'
                              }`}
                            >
                              {'→'} {targetField?.label || mapped}
                            </div>
                          )}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row, rowIdx) => (
                    <tr key={rowIdx} className={rowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                      <td className="whitespace-nowrap border-b border-gray-100 px-3 py-2 text-xs text-gray-400">
                        {rowIdx + 1}
                      </td>
                      {parsedData.headers.map((_, colIdx) => (
                        <td
                          key={colIdx}
                          className="whitespace-nowrap border-b border-gray-100 px-3 py-2 text-sm text-gray-700"
                        >
                          {row[colIdx] || ''}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {parsedData.rows.length > 5 && (
              <p className="mt-2 text-xs text-gray-400">
                ...and {parsedData.rows.length - 5} more row
                {parsedData.rows.length - 5 !== 1 ? 's' : ''}
              </p>
            )}
          </div>

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={resetWizard}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
            <button
              type="button"
              onClick={handleImport}
              disabled={!isCompanyNameMapped || importCSV.isPending}
              className="inline-flex items-center gap-2 rounded-lg bg-blue-500 px-5 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {importCSV.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  Start Import
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* Step 3: Import Results                                             */}
      {/* ================================================================= */}
      {currentStep === 2 && importResult && (
        <div className="space-y-5">
          {/* Success banner */}
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

            {/* Stats grid */}
            <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="rounded-lg bg-white p-3 text-center">
                <p className="text-2xl font-bold text-green-600">
                  {importResult.imported_companies ?? 0}
                </p>
                <p className="text-xs text-gray-500">Companies</p>
              </div>
              <div className="rounded-lg bg-white p-3 text-center">
                <p className="text-2xl font-bold text-blue-600">
                  {importResult.imported_contacts ?? 0}
                </p>
                <p className="text-xs text-gray-500">Contacts</p>
              </div>
              <div className="rounded-lg bg-white p-3 text-center">
                <p className="text-2xl font-bold text-yellow-600">
                  {importResult.skipped ?? 0}
                </p>
                <p className="text-xs text-gray-500">Skipped</p>
              </div>
              <div className="rounded-lg bg-white p-3 text-center">
                <p className="text-2xl font-bold text-red-600">{errors.length}</p>
                <p className="text-xs text-gray-500">Errors</p>
              </div>
            </div>
          </div>

          {/* Error table */}
          {errors.length > 0 && (
            <div className="rounded-xl border border-red-200 bg-white p-6 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-red-500" />
                  <h3 className="text-sm font-semibold text-red-700">
                    {errors.length} Error{errors.length !== 1 ? 's' : ''}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={handleDownloadErrors}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download Error Report
                </button>
              </div>
              <div className="max-h-64 overflow-y-auto rounded-lg border border-gray-200">
                <table className="w-full text-left text-sm">
                  <thead className="sticky top-0">
                    <tr className="bg-gray-50">
                      <th className="whitespace-nowrap border-b border-gray-200 px-3 py-2 text-xs font-semibold text-gray-500">
                        Row
                      </th>
                      <th className="border-b border-gray-200 px-3 py-2 text-xs font-semibold text-gray-500">
                        Error
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {errors.slice(0, 100).map((err, i) => {
                      const match = err.match(/^(?:Row\s+)?(\d+):?\s*(.*)$/i);
                      const rowNum = match ? match[1] : '-';
                      const message = match ? match[2] : err;
                      return (
                        <tr
                          key={i}
                          className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}
                        >
                          <td className="whitespace-nowrap border-b border-gray-100 px-3 py-2 font-mono text-xs text-gray-500">
                            {rowNum}
                          </td>
                          <td className="border-b border-gray-100 px-3 py-2 text-sm text-red-700">
                            {message}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              {errors.length > 100 && (
                <p className="mt-2 text-xs text-gray-400">
                  Showing first 100 of {errors.length} errors. Download the full report above.
                </p>
              )}
            </div>
          )}

          {/* Import another */}
          <div className="flex justify-center">
            <button
              type="button"
              onClick={resetWizard}
              className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
            >
              <RotateCcw className="h-4 w-4" />
              Import Another File
            </button>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* Last Import Summary (persists across wizard resets)                */}
      {/* ================================================================= */}
      {currentStep === 0 && lastImportResult && (
        <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-700">
            <Check className="h-4 w-4 text-green-500" />
            Last Import
          </h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-lg bg-gray-50 p-2.5 text-center">
              <p className="text-lg font-bold text-green-600">
                {lastImportResult.imported_companies ?? 0}
              </p>
              <p className="text-xs text-gray-500">Companies</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-2.5 text-center">
              <p className="text-lg font-bold text-blue-600">
                {lastImportResult.imported_contacts ?? 0}
              </p>
              <p className="text-xs text-gray-500">Contacts</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-2.5 text-center">
              <p className="text-lg font-bold text-yellow-600">
                {lastImportResult.skipped ?? 0}
              </p>
              <p className="text-xs text-gray-500">Skipped</p>
            </div>
            <div className="rounded-lg bg-gray-50 p-2.5 text-center">
              <p className="text-lg font-bold text-red-600">
                {(lastImportResult.errors || []).length}
              </p>
              <p className="text-xs text-gray-500">Errors</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
