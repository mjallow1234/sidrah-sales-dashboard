import type { AgentAccountabilityCaseSummary, AgentAccountabilitySummary, AgentCashHandoverRecord } from '@/lib/types';

async function readJson<T>(path: string): Promise<T> {
  const response = await fetch(path);
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.message || 'Unable to load accountability data.');
  return payload.data as T;
}

export function getAccountabilityManagementSummary() {
  return readJson<AgentAccountabilitySummary[]>('/api/accountability/summary');
}

export function getAccountabilityCases(agentUserId: string) {
  return readJson<AgentAccountabilityCaseSummary[]>(`/api/accountability/cases?agent_id=${encodeURIComponent(agentUserId)}`);
}

export function getAccountabilityHandoverHistory() {
  return readJson<AgentCashHandoverRecord[]>('/api/accountability/cash/handovers');
}

export function getAccountabilityBreakdown(agentUserId: string) {
  return readJson<any>(`/api/accountability/agents/${encodeURIComponent(agentUserId)}/breakdown`);
}
