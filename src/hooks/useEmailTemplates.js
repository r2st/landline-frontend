import { useQuery, useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { emailApi, queryClient } from '../api/client';

function errMsg(error, fallback) {
  return error?.response?.data?.detail || error?.message || fallback;
}

// ─── Templates ──────────────────────────────────────────────────────────────────

export function useEmailTemplates() {
  return useQuery({
    queryKey: ['email-templates'],
    queryFn: async () => await emailApi.getTemplates(),
  });
}

export function useCreateTemplate() {
  return useMutation({
    mutationFn: async (data) => await emailApi.createTemplate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
      toast.success('Template created');
    },
    onError: (e) => toast.error(errMsg(e, 'Failed to create template')),
  });
}

export function useUpdateTemplate() {
  return useMutation({
    mutationFn: async ({ id, data }) => await emailApi.updateTemplate(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
      toast.success('Template updated');
    },
    onError: (e) => toast.error(errMsg(e, 'Failed to update template')),
  });
}

export function useDeleteTemplate() {
  return useMutation({
    mutationFn: async (id) => await emailApi.deleteTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
      toast.success('Template deleted');
    },
    onError: (e) => toast.error(errMsg(e, 'Failed to delete template')),
  });
}

export function useSetDefaultTemplate() {
  return useMutation({
    mutationFn: async (id) => await emailApi.setDefault(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-templates'] });
      toast.success('Default template updated');
    },
    onError: (e) => toast.error(errMsg(e, 'Failed to set default')),
  });
}

// ─── Preview ────────────────────────────────────────────────────────────────────

export function usePreviewTemplate() {
  return useMutation({
    mutationFn: async ({ template_id, subject, body, contact_id }) => {
      const payload = {};
      if (template_id) payload.template_id = template_id;
      if (subject != null) payload.subject = subject;
      if (body != null) payload.body = body;
      if (contact_id) payload.contact_id = contact_id;
      return await emailApi.preview(payload);
    },
    onError: (e) => toast.error(errMsg(e, 'Failed to render preview')),
  });
}

// ─── Compose / Send ───────────────────────────────────────────────────────────

export function useComposeEmail() {
  return useMutation({
    mutationFn: async ({ contact_ids, template_id, sender_account_id }) => {
      const payload = { contact_ids, template_id };
      if (sender_account_id) payload.sender_account_id = sender_account_id;
      return await emailApi.compose(payload);
    },
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['email-sends'] });
      const parts = [];
      if (res.sent) parts.push(`${res.sent} sent`);
      if (res.skipped) parts.push(`${res.skipped} skipped`);
      if (res.errors) parts.push(`${res.errors} failed`);
      const via = res.sender ? ` via ${res.sender}` : '';
      toast.success(`Compose complete${via}: ${parts.join(', ') || 'no contacts'}`);
    },
    onError: (e) => toast.error(errMsg(e, 'Failed to send')),
  });
}

export function useEmailSends() {
  return useQuery({
    queryKey: ['email-sends'],
    queryFn: async () => await emailApi.getSends({}),
  });
}
