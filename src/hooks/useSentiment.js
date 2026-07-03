import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sentimentApi } from '../api/client';
import toast from 'react-hot-toast';

const errMsg = (error) =>
  error?.response?.data?.detail || error?.message || 'Something went wrong';

export function useSentimentSummary(days = 30) {
  return useQuery({
    queryKey: ['sentiment', 'summary', days],
    queryFn: () => sentimentApi.getSummary(days).then((r) => r.data),
  });
}

export function useSentimentScores(params = {}) {
  return useQuery({
    queryKey: ['sentiment', 'scores', params],
    queryFn: () => sentimentApi.getScores(params).then((r) => r.data),
  });
}

export function useAnalyzeSentiment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => sentimentApi.analyze(data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sentiment'] });
      toast.success('Sentiment analyzed');
    },
    onError: (err) => toast.error(errMsg(err)),
  });
}

export function useAnalyzeReplySentiment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (replyId) => sentimentApi.analyzeReply(replyId).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sentiment'] });
      toast.success('Reply sentiment analyzed');
    },
    onError: (err) => toast.error(errMsg(err)),
  });
}
