import { useQuery, useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { discoveryDocsApi, queryClient } from '../api/client';

// The backend answers "no Gemini key" with 409 {detail: {code, message}}.
export function isGeminiKeyRequired(error) {
  return error?.response?.data?.detail?.code === 'gemini_key_required';
}

export function errMsg(error, fallback) {
  const detail = error?.response?.data?.detail;
  if (typeof detail === 'string') return detail;
  if (detail?.message) return detail.message;
  if (Array.isArray(detail)) return detail.map((d) => d.msg).filter(Boolean).join('; ') || fallback;
  return error?.message || fallback;
}

// Any saved Discovery key (Gemini, Groq or OpenRouter) unlocks the features;
// `gemini_key_configured` alone is what backends before the fallbacks sent.
export function hasDiscoveryAiKey(status) {
  if (!status) return true;
  return status.ai_key_configured ?? status.gemini_key_configured;
}

export function useDiscoveryAiStatus() {
  return useQuery({
    queryKey: ['discovery-docs', 'ai-status'],
    queryFn: discoveryDocsApi.aiStatus,
    staleTime: 15000,
  });
}

// Polls every 3s while any upload is still being analysed (a batch leaves
// several parsing at once).
export function useDiscoveryDocuments() {
  return useQuery({
    queryKey: ['discovery-docs', 'list'],
    queryFn: discoveryDocsApi.list,
    staleTime: 5000,
    refetchInterval: (query) =>
      query.state.data?.some((d) => d.status === 'parsing') ? 3000 : false,
  });
}

// Polls every 2s while the document is still being analysed.
export function useDiscoveryDocument(id) {
  return useQuery({
    queryKey: ['discovery-docs', 'detail', id],
    queryFn: () => discoveryDocsApi.get(id),
    enabled: Boolean(id),
    refetchInterval: (query) => (query.state.data?.status === 'parsing' ? 2000 : false),
  });
}

export function useUploadDocument() {
  return useMutation({
    mutationFn: ({ file, onProgress }) => discoveryDocsApi.upload(file, onProgress),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['discovery-docs', 'list'] }),
    onError: (e) => {
      if (isGeminiKeyRequired(e)) {
        queryClient.invalidateQueries({ queryKey: ['discovery-docs', 'ai-status'] });
      }
      // Other failures are shown inline next to the file that failed.
    },
  });
}

export function useUploadDocuments() {
  return useMutation({
    mutationFn: ({ files, onProgress }) => discoveryDocsApi.uploadMany(files, onProgress),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['discovery-docs', 'list'] }),
    onError: (e) => {
      if (isGeminiKeyRequired(e)) {
        queryClient.invalidateQueries({ queryKey: ['discovery-docs', 'ai-status'] });
      }
      // Other failures are shown inline next to the file that failed.
    },
  });
}

export function useImportCandidates(id) {
  return useMutation({
    mutationFn: ({ candidateIds, contactIds }) =>
      discoveryDocsApi.importCandidates(id, candidateIds, contactIds),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['discovery-docs', 'detail', id] });
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      toast.success(
        `Imported: ${res.companies_created} new companies, ${res.companies_matched} matched, ${res.contacts_created} new contacts`
      );
    },
    onError: (e) => toast.error(errMsg(e, 'Import failed')),
  });
}

export function useDraftEmails(id) {
  return useMutation({
    mutationFn: (data) => discoveryDocsApi.draft(id, data),
    onError: (e) => {
      if (!isGeminiKeyRequired(e)) toast.error(errMsg(e, 'Could not draft emails'));
    },
  });
}

export function usePreviewEmails(id) {
  return useMutation({
    mutationFn: (data) => discoveryDocsApi.preview(id, data),
    onError: (e) => toast.error(errMsg(e, 'Preview failed')),
  });
}

export function useSendEmails(id) {
  return useMutation({
    mutationFn: (data) => discoveryDocsApi.send(id, data),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['discovery-docs'] });
      queryClient.invalidateQueries({ queryKey: ['sequences'] });
      toast.success(
        `${res.enrolled_count} contact(s) enrolled${res.skipped_count ? `, ${res.skipped_count} skipped` : ''}`
      );
    },
    onError: (e) => toast.error(errMsg(e, 'Send failed')),
  });
}

export function useDeleteDocument() {
  return useMutation({
    mutationFn: (id) => discoveryDocsApi.remove(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['discovery-docs', 'list'] }),
    onError: (e) => toast.error(errMsg(e, 'Delete failed')),
  });
}

// Follow-up status; refreshes every minute while the sequence is running.
export function useDocumentOutreach(id, enabled = true) {
  return useQuery({
    queryKey: ['discovery-docs', 'outreach', id],
    queryFn: () => discoveryDocsApi.outreach(id),
    enabled: Boolean(id) && enabled,
    refetchInterval: (query) => (query.state.data?.totals?.active ? 60000 : false),
  });
}

export function useSetSequenceStatus(docId) {
  return useMutation({
    mutationFn: ({ sequenceId, status }) => discoveryDocsApi.setSequenceStatus(sequenceId, status),
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ['discovery-docs', 'outreach', docId] });
      queryClient.invalidateQueries({ queryKey: ['sequences'] });
      toast.success(status === 'paused' ? 'Follow-ups paused' : 'Follow-ups resumed');
    },
    onError: (e) => toast.error(errMsg(e, 'Could not update the sequence')),
  });
}
