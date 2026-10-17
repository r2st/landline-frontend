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

export function useDiscoveryAiStatus() {
  return useQuery({
    queryKey: ['discovery-docs', 'ai-status'],
    queryFn: discoveryDocsApi.aiStatus,
    staleTime: 15000,
  });
}

export function useDiscoveryDocuments() {
  return useQuery({
    queryKey: ['discovery-docs', 'list'],
    queryFn: discoveryDocsApi.list,
    staleTime: 5000,
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
    mutationFn: (file) => discoveryDocsApi.upload(file),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['discovery-docs', 'list'] }),
    onError: (e) => {
      if (isGeminiKeyRequired(e)) {
        queryClient.invalidateQueries({ queryKey: ['discovery-docs', 'ai-status'] });
        return;
      }
      toast.error(errMsg(e, 'Upload failed'));
    },
  });
}

export function useImportCandidates(id) {
  return useMutation({
    mutationFn: (candidateIds) => discoveryDocsApi.importCandidates(id, candidateIds),
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
