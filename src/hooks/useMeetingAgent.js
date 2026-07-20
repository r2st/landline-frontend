import { useMutation, useQuery } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { meetingAgentApi, queryClient } from '../api/client';

// The org's booking-agent config (lazily created server-side with defaults).
export function useMeetingAgentConfig() {
  return useQuery({
    queryKey: ['meeting-agent', 'config'],
    queryFn: () => meetingAgentApi.getConfig(),
    retry: false,
  });
}

// Save config (org_admin). Handles both the on/off toggle and the settings form;
// a rejected activation (e.g. no calendar selected) surfaces its reason.
export function useUpdateMeetingAgentConfig() {
  return useMutation({
    mutationFn: (body) => meetingAgentApi.updateConfig(body),
    onSuccess: (data) => {
      queryClient.setQueryData(['meeting-agent', 'config'], data);
      toast.success('Settings saved');
    },
    onError: (e) => toast.error(e?.response?.data?.detail || e?.message || 'Could not save settings'),
  });
}

// Booked meetings. Like the reply queue, a failed load is surfaced (not swallowed
// to an empty list) so the page can say "couldn't load" rather than "no meetings".
export function useMeetings(params = {}) {
  return useQuery({
    queryKey: ['meeting-agent', 'meetings', params],
    queryFn: () => meetingAgentApi.meetings(params),
    retry: false,
  });
}

// One meeting's full detail (proposed slots + scheduling thread). Fetched lazily
// when a row is expanded.
export function useMeetingDetail(id, enabled = true) {
  return useQuery({
    queryKey: ['meeting-agent', 'meeting', id],
    queryFn: () => meetingAgentApi.meeting(id),
    enabled: Boolean(id) && enabled,
    retry: false,
  });
}

export function useMeetingStats() {
  return useQuery({
    queryKey: ['meeting-agent', 'stats'],
    queryFn: () => meetingAgentApi.stats(),
    retry: false,
  });
}

// Cancel a meeting, then refresh the list + stats.
export function useCancelMeeting() {
  return useMutation({
    mutationFn: (id) => meetingAgentApi.cancel(id),
    onSuccess: () => {
      toast.success('Meeting cancelled');
      queryClient.invalidateQueries({ queryKey: ['meeting-agent', 'meetings'] });
      queryClient.invalidateQueries({ queryKey: ['meeting-agent', 'stats'] });
    },
    onError: (e) => toast.error(e?.response?.data?.detail || e?.message || 'Could not cancel meeting'),
  });
}
