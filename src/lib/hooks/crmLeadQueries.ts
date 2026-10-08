'use client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { addCrmLeadActivity, createCrmLead, getCrmLead, getCrmLeadActivities, getCrmLeads, getCrmOverview, getCrmSummary, updateCrmLead } from '@/lib/api/crmLeads';
import type { CrmLeadFilters, CrmOverviewFilters } from '@/lib/types/crm';
export const useCrmLeadsQuery = (filters?: CrmLeadFilters, enabled = true) => useQuery({ queryKey: ['crmLeads', filters], queryFn: () => getCrmLeads(filters), enabled });
export const useCrmSummaryQuery = () => useQuery({ queryKey: ['crmSummary'], queryFn: getCrmSummary });
export const useCrmOverviewQuery = (filters?: CrmOverviewFilters, enabled = true) => useQuery({ queryKey: ['crmOverview', filters], queryFn: () => getCrmOverview(filters), enabled });
export const useCrmLeadQuery = (leadId?: string) => useQuery({ queryKey: ['crmLead', leadId], queryFn: () => getCrmLead(leadId as string), enabled: !!leadId });
export const useCrmLeadActivitiesQuery = (leadId?: string) => useQuery({ queryKey: ['crmLeadActivities', leadId], queryFn: () => getCrmLeadActivities(leadId as string), enabled: !!leadId });
export function useCreateCrmLeadMutation() { const client = useQueryClient(); return useMutation({ mutationFn: createCrmLead, onSuccess: () => client.invalidateQueries({ queryKey: ['crmLeads'] }) }); }
export function useUpdateCrmLeadMutation() { const client = useQueryClient(); return useMutation({ mutationFn: ({ leadId, payload }: { leadId: string; payload: Record<string, unknown> }) => updateCrmLead(leadId, payload), onSuccess: (_data, variables) => { client.invalidateQueries({ queryKey: ['crmLeads'] }); client.invalidateQueries({ queryKey: ['crmLead', variables.leadId] }); client.invalidateQueries({ queryKey: ['crmLeadActivities', variables.leadId] }); } }); }
export function useAddCrmLeadActivityMutation() { const client = useQueryClient(); return useMutation({ mutationFn: ({ leadId, payload }: { leadId: string; payload: Record<string, unknown> }) => addCrmLeadActivity(leadId, payload), onSuccess: (_data, variables) => { client.invalidateQueries({ queryKey: ['crmLead', variables.leadId] }); client.invalidateQueries({ queryKey: ['crmLeadActivities', variables.leadId] }); } }); }
