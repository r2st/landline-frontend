import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { emailTestingApi } from '../api/client';
import toast from 'react-hot-toast';

const errMsg = (error) =>
  error?.response?.data?.detail || error?.message || 'Something went wrong';

export function useTestScenarios() {
  return useQuery({
    queryKey: ['email-testing', 'scenarios'],
    queryFn: () => emailTestingApi.getScenarios().then((r) => r.data),
  });
}

export function useTestPersonas() {
  return useQuery({
    queryKey: ['email-testing', 'personas'],
    queryFn: () => emailTestingApi.getPersonas().then((r) => r.data),
  });
}

export function useTestExchanges(params = {}) {
  return useQuery({
    queryKey: ['email-testing', 'exchanges', params],
    queryFn: () => emailTestingApi.getExchanges(params).then((r) => r.data),
  });
}

export function useTestExchange(id) {
  return useQuery({
    queryKey: ['email-testing', 'exchange', id],
    queryFn: () => emailTestingApi.getExchange(id).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreateTestExchange() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => emailTestingApi.createExchange(data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['email-testing', 'exchanges'] });
      toast.success('Test exchange created');
    },
    onError: (err) => toast.error(errMsg(err)),
  });
}

export function useContinueTestExchange() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) =>
      emailTestingApi.continueExchange(id, data).then((r) => r.data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['email-testing'] });
      toast.success('Follow-up sent and reply generated');
    },
    onError: (err) => toast.error(errMsg(err)),
  });
}

export function useDeleteTestExchange() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => emailTestingApi.deleteExchange(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['email-testing', 'exchanges'] });
      toast.success('Test exchange deleted');
    },
    onError: (err) => toast.error(errMsg(err)),
  });
}
