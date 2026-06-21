import { useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { tacticsApi, queryClient } from '../api/client';

function errMsg(error, fallback) {
  return error?.response?.data?.detail || error?.message || fallback;
}

export function useDiscoverExecutives() {
  return useMutation({
    mutationFn: (companyId) => tacticsApi.discoverExecutives(companyId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      const count = data.executives_found ?? data.contacts_created ?? 0;
      toast.success(`Found ${count} executive${count !== 1 ? 's' : ''}`);
    },
    onError: (e) => toast.error(errMsg(e, 'Failed to discover executives')),
  });
}

export function useLinkedinDraft() {
  return useMutation({
    mutationFn: (data) => tacticsApi.linkedinDraft(data),
    onError: (e) => toast.error(errMsg(e, 'Failed to generate LinkedIn draft')),
  });
}

export function usePhoneScript() {
  return useMutation({
    mutationFn: (data) => tacticsApi.phoneScript(data),
    onError: (e) => toast.error(errMsg(e, 'Failed to generate phone script')),
  });
}

export function useReferralDraft() {
  return useMutation({
    mutationFn: (data) => tacticsApi.referralDraft(data),
    onError: (e) => toast.error(errMsg(e, 'Failed to generate referral draft')),
  });
}

export function useEventOutreach() {
  return useMutation({
    mutationFn: (data) => tacticsApi.eventOutreach(data),
    onError: (e) => toast.error(errMsg(e, 'Failed to generate event outreach')),
  });
}

export function useMultiTouchPlan() {
  return useMutation({
    mutationFn: (companyId) => tacticsApi.multiTouchPlan(companyId),
    onError: (e) => toast.error(errMsg(e, 'Failed to generate multi-touch plan')),
  });
}
