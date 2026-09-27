import { useQuery } from '@tanstack/react-query';
import { getAccountabilityBreakdown, getAccountabilityCases, getAccountabilityHandoverHistory, getAccountabilityManagementSummary } from '@/lib/api/accountability';

export function useAccountabilityManagementSummary(enabled = true) {
  return useQuery({ queryKey: ['accountabilityManagementSummary'], queryFn: getAccountabilityManagementSummary, enabled, staleTime: 30 * 1000 });
}

export function useAccountabilityCases(agentUserId?: string, enabled = true) {
  return useQuery({ queryKey: ['accountabilityCases', agentUserId], queryFn: () => getAccountabilityCases(agentUserId ?? ''), enabled: enabled && !!agentUserId, staleTime: 30 * 1000 });
}

export function useAccountabilityHandoverHistory(enabled = true) {
  return useQuery({ queryKey: ['accountabilityHandoverHistory'], queryFn: getAccountabilityHandoverHistory, enabled, staleTime: 30 * 1000 });
}

export function useAccountabilityBreakdown(agentUserId?: string, enabled = true) {
  return useQuery({ queryKey: ['accountabilityBreakdown', agentUserId], queryFn: () => getAccountabilityBreakdown(agentUserId ?? ''), enabled: enabled && !!agentUserId, staleTime: 30 * 1000 });
}
