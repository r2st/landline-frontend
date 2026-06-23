import { useQuery, useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { api, queryClient } from '../api/client';

function errMsg(error, fallback) {
  return error?.response?.data?.detail || error?.message || fallback;
}

export function useEmailSignatures() {
  return useQuery({
    queryKey: ['email-signatures'],
    queryFn: async () => {
      const res = await api.get('/email-signatures');
      return res.data;
    },
  });
}

export function useCreateSignature() {
  return useMutation({
    mutationFn: async (data) => {
      const res = await api.post('/email-signatures', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-signatures'] });
      toast.success('Signature created');
    },
    onError: (e) => toast.error(errMsg(e, 'Failed to create signature')),
  });
}

export function useUpdateSignature() {
  return useMutation({
    mutationFn: async ({ id, ...data }) => {
      const res = await api.put(`/email-signatures/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-signatures'] });
      toast.success('Signature updated');
    },
    onError: (e) => toast.error(errMsg(e, 'Failed to update signature')),
  });
}

export function useDeleteSignature() {
  return useMutation({
    mutationFn: async (id) => {
      const res = await api.delete(`/email-signatures/${id}`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-signatures'] });
      toast.success('Signature deleted');
    },
    onError: (e) => toast.error(errMsg(e, 'Failed to delete signature')),
  });
}

export function useSetDefaultSignature() {
  return useMutation({
    mutationFn: async (id) => {
      const res = await api.post(`/email-signatures/${id}/set-default`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['email-signatures'] });
      toast.success('Default signature updated');
    },
    onError: (e) => toast.error(errMsg(e, 'Failed to set default signature')),
  });
}
