import type { CrmLead, CrmLeadActivity, CrmLeadFilters } from '@/lib/types/crm';

async function request<T>(path: string, options?: RequestInit): Promise<T> { const response = await fetch(path, { ...options, headers: { 'Content-Type': 'application/json', ...(options?.headers ?? {}) } }); const body = await response.json(); if (!response.ok) throw new Error(body?.message || `Request failed: ${response.status}`); return body.data as T; }
function query(filters?: CrmLeadFilters) { if (!filters) return ''; const params = new URLSearchParams(); const values: Record<string, string | undefined> = { status: filters.status, assignedAgentUserId: filters.assignedAgentUserId, search: filters.search, capturedFrom: filters.capturedFrom, capturedTo: filters.capturedTo, followUpDate: filters.followUpDate }; Object.entries(values).forEach(([key, value]) => { if (value) params.set(key, value); }); const result = params.toString(); return result ? `?${result}` : ''; }
export const getCrmLeads = (filters?: CrmLeadFilters) => request<CrmLead[]>(`/api/crm/leads${query(filters)}`);
export const createCrmLead = (payload: Record<string, unknown>) => request<CrmLead>('/api/crm/leads', { method: 'POST', body: JSON.stringify(payload) });
export const getCrmLead = (leadId: string) => request<CrmLead>(`/api/crm/leads/${encodeURIComponent(leadId)}`);
export const updateCrmLead = (leadId: string, payload: Record<string, unknown>) => request<CrmLead>(`/api/crm/leads/${encodeURIComponent(leadId)}`, { method: 'PATCH', body: JSON.stringify(payload) });
export const getCrmLeadActivities = (leadId: string) => request<CrmLeadActivity[]>(`/api/crm/leads/${encodeURIComponent(leadId)}/activities`);
export const addCrmLeadActivity = (leadId: string, payload: Record<string, unknown>) => request<CrmLeadActivity>(`/api/crm/leads/${encodeURIComponent(leadId)}/activities`, { method: 'POST', body: JSON.stringify(payload) });
