import { useMutation, useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { aiApi, sendLimiterApi } from '../api/client';

export function useGenerateEmail() {
  return useMutation({
    mutationFn: (data) => aiApi.generateEmail(data),
    onError: (e) => toast.error(e?.response?.data?.detail || 'Failed to generate email'),
  });
}

export function useImproveEmail() {
  return useMutation({
    mutationFn: (data) => aiApi.improveEmail(data),
    onError: (e) => toast.error(e?.response?.data?.detail || 'Failed to improve email'),
  });
}

export function useAIScoreLead() {
  return useMutation({
    mutationFn: (data) => aiApi.scoreLead(data),
    onError: (e) => toast.error(e?.response?.data?.detail || 'Failed to score lead'),
  });
}

export function useAnalyzeCompany() {
  return useMutation({
    mutationFn: (id) => aiApi.analyzeCompany(id),
    onError: (e) => toast.error(e?.response?.data?.detail || 'Failed to analyze company'),
  });
}

export function useGenerateFollowup() {
  return useMutation({
    mutationFn: (data) => aiApi.generateFollowup(data),
    onError: (e) => toast.error(e?.response?.data?.detail || 'Failed to generate follow-up'),
  });
}

export function useScanCard() {
  return useMutation({
    mutationFn: (file) => aiApi.scanCard(file),
    onError: (e) => toast.error(e?.response?.data?.detail || 'Failed to scan card'),
  });
}

export function useSendStats() {
  return useQuery({
    queryKey: ['send-stats'],
    queryFn: () => sendLimiterApi.getStats(),
    refetchInterval: 60000, // refresh every minute
  });
}
