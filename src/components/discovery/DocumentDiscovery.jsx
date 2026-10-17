import { useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  Loader2,
  Trash2,
  UploadCloud,
} from 'lucide-react';
import {
  useDeleteDocument,
  useDiscoveryAiStatus,
  useDiscoveryDocument,
  useDiscoveryDocuments,
  useUploadDocument,
} from '../../hooks/useDiscoveryDocuments';
import { cn, formatDate } from '../../lib/utils';
import ConfirmDialog from '../ConfirmDialog';
import DocumentReview from './DocumentReview';
import DocumentOutreach from './DocumentOutreach';
import GeminiKeyBanner from './GeminiKeyBanner';

const ACCEPT = '.csv,.tsv,.xlsx,.pdf,.docx,.txt';
const MAX_MB = 10;

const STEPS = ['Upload', 'Review & import', 'Draft emails', 'Send & follow up'];

function Stepper({ current }) {
  return (
    <ol className="flex flex-wrap items-center gap-2 text-sm">
      {STEPS.map((label, i) => (
        <li key={label} className="flex items-center gap-2">
          <span
            className={cn(
              'flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold',
              i < current && 'bg-green-500 text-white',
              i === current && 'bg-blue-500 text-white',
              i > current && 'bg-gray-200 text-gray-500'
            )}
          >
            {i < current ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
          </span>
          <span className={cn(i === current ? 'font-medium text-gray-900' : 'text-gray-500')}>{label}</span>
          {i < STEPS.length - 1 && <span className="mx-1 h-px w-6 bg-gray-300" />}
        </li>
      ))}
    </ol>
  );
}

function UploadZone({ onUploaded, disabled }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [localError, setLocalError] = useState(null);
  const upload = useUploadDocument();

  const handleFile = (file) => {
    if (!file) return;
    setLocalError(null);
    if (file.size > MAX_MB * 1024 * 1024) {
      setLocalError(`Files can be at most ${MAX_MB} MB.`);
      return;
    }
    upload.mutate(file, { onSuccess: (doc) => onUploaded(doc.id) });
  };

  const busy = upload.isPending;
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        if (!disabled) handleFile(e.dataTransfer.files?.[0]);
      }}
      className={cn(
        'flex flex-col items-center justify-center rounded-xl border-2 border-dashed bg-white px-6 py-12 text-center transition-colors',
        dragging ? 'border-blue-400 bg-blue-50' : 'border-gray-300',
        disabled && 'opacity-60'
      )}
    >
      {busy ? (
        <Loader2 className="h-10 w-10 animate-spin text-blue-500" />
      ) : (
        <UploadCloud className="h-10 w-10 text-gray-400" />
      )}
      <p className="mt-3 text-sm font-medium text-gray-900">
        {busy ? 'Uploading…' : 'Drop a file here, or choose one'}
      </p>
      <p className="mt-1 text-xs text-gray-500">
        CSV, XLSX, PDF, DOCX or TXT, up to {MAX_MB} MB. Scanned PDFs (images of text) aren&apos;t supported yet.
      </p>
      <button
        type="button"
        disabled={disabled || busy}
        onClick={() => inputRef.current?.click()}
        className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-600 disabled:opacity-50"
      >
        <FileText className="h-4 w-4" />
        Choose file
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => {
          handleFile(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
      {localError && <p className="mt-3 text-sm text-red-600">{localError}</p>}
    </div>
  );
}

function RecentDocuments({ onOpen }) {
  const { data: docs = [] } = useDiscoveryDocuments();
  const remove = useDeleteDocument();
  const [confirmId, setConfirmId] = useState(null);
  if (!docs.length) return null;
  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-200 px-4 py-3">
        <h3 className="text-sm font-semibold text-gray-900">Recent uploads</h3>
      </div>
      <ul className="divide-y divide-gray-100">
        {docs.map((d) => (
          <li key={d.id} className="flex items-center justify-between gap-3 px-4 py-3">
            <button type="button" onClick={() => onOpen(d.id, Boolean(d.sequence_id))} className="min-w-0 flex-1 text-left">
              <p className="truncate text-sm font-medium text-gray-900 hover:text-blue-600">{d.filename}</p>
              <p className="text-xs text-gray-500">
                {formatDate(d.created_at)} ·{' '}
                {d.status === 'ready' && `${d.candidate_count} companies found`}
                {d.status === 'parsing' && 'Analysing…'}
                {d.status === 'failed' && <span className="text-red-600">Failed</span>}
                {d.sequence_id && ' · emails scheduled'}
              </p>
            </button>
            <button
              type="button"
              onClick={() => setConfirmId(d.id)}
              className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-red-600"
              aria-label={`Delete ${d.filename}`}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </li>
        ))}
      </ul>
      <ConfirmDialog
        open={Boolean(confirmId)}
        title="Delete this upload?"
        message="The file and its extracted results are deleted. Companies and contacts you already imported stay, and any scheduled emails keep sending."
        confirmLabel="Delete"
        onConfirm={() => {
          remove.mutate(confirmId);
          setConfirmId(null);
        }}
        onCancel={() => setConfirmId(null)}
      />
    </div>
  );
}

export default function DocumentDiscovery() {
  const [docId, setDocId] = useState(null);
  const [stage, setStage] = useState('review'); // review | outreach
  const aiStatus = useDiscoveryAiStatus();
  const { data: doc, error: docError } = useDiscoveryDocument(docId);

  const noKey = aiStatus.data && !aiStatus.data.gemini_key_configured;
  // A document that already sent opens on its follow-up status.
  const open = (id, sent = false) => {
    setDocId(id);
    setStage(sent ? 'outreach' : 'review');
  };
  const reset = () => {
    setDocId(null);
    setStage('review');
  };

  const hasImported = Boolean(
    doc?.candidates?.some((c) => c.contacts?.some((p) => p.imported_contact_id))
  );
  const current = !doc ? 0 : doc.sequence_id ? STEPS.length : stage === 'outreach' ? 2 : 1;

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
        <Stepper current={current} />
      </div>

      {noKey && <GeminiKeyBanner />}

      {!docId && (
        <>
          <UploadZone onUploaded={open} disabled={noKey} />
          <RecentDocuments onOpen={open} />
        </>
      )}

      {docId && docError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          Couldn&apos;t load this document.{' '}
          <button type="button" onClick={reset} className="font-medium underline">Back</button>
        </div>
      )}

      {docId && doc && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm text-gray-700">
              <FileText className="h-4 w-4 text-gray-400" />
              <span className="font-medium">{doc.filename}</span>
              {doc.status === 'ready' && (
                <span className="text-gray-500">· {doc.candidate_count} companies found</span>
              )}
            </div>
            <button
              type="button"
              onClick={reset}
              className="rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              Upload another file
            </button>
          </div>

          {doc.status === 'parsing' && (
            <div className="flex flex-col items-center justify-center rounded-xl border border-gray-200 bg-white py-16">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
              <p className="mt-3 text-sm font-medium text-gray-900">Finding companies and contacts…</p>
              <p className="mt-1 text-xs text-gray-500">Large PDFs can take a minute or two.</p>
            </div>
          )}

          {doc.status === 'failed' && (
            <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4">
              <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-red-600" />
              <div className="text-sm text-red-800">
                <p className="font-medium">We couldn&apos;t analyse this file</p>
                <p className="mt-1">{doc.error}</p>
              </div>
            </div>
          )}

          {doc.status === 'ready' && stage === 'review' && (
            <DocumentReview
              doc={doc}
              canContinue={hasImported}
              onContinue={() => setStage('outreach')}
            />
          )}

          {doc.status === 'ready' && stage === 'outreach' && (
            <DocumentOutreach doc={doc} onBack={() => setStage('review')} />
          )}
        </div>
      )}
    </div>
  );
}

