'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { addAcquiredByAgent, createVendorType, deleteVendorType, getAcquiredByAgents, getVendorStatuses, getVendorTypes, removeAcquiredByAgent } from '@/lib/api/vendorManagement';

export function useVendorTypesQuery(enabled = true) {
  return useQuery({ queryKey: ['vendorTypes'], queryFn: getVendorTypes, enabled, staleTime: 5 * 60 * 1000 });
}

export function useAcquiredByAgentsQuery(enabled = true) {
  return useQuery({ queryKey: ['acquiredByAgents'], queryFn: getAcquiredByAgents, enabled, staleTime: 60 * 1000 });
}

export function useVendorStatusesQuery(enabled = true) {
  return useQuery({ queryKey: ['vendorStatuses'], queryFn: getVendorStatuses, enabled, staleTime: 5 * 60 * 1000 });
}

export function useCreateVendorTypeMutation() {
  const client = useQueryClient();
  return useMutation({ mutationFn: createVendorType, onSuccess: () => { client.invalidateQueries({ queryKey: ['vendorTypes'] }); } });
}

export function useDeleteVendorTypeMutation() {
  const client = useQueryClient();
  return useMutation({ mutationFn: deleteVendorType, onSuccess: () => { client.invalidateQueries({ queryKey: ['vendorTypes'] }); } });
}

export function useAddAcquiredByAgentMutation() {
  const client = useQueryClient();
  return useMutation({ mutationFn: addAcquiredByAgent, onSuccess: () => { client.invalidateQueries({ queryKey: ['acquiredByAgents'] }); } });
}

export function useRemoveAcquiredByAgentMutation() {
  const client = useQueryClient();
  return useMutation({ mutationFn: removeAcquiredByAgent, onSuccess: () => { client.invalidateQueries({ queryKey: ['acquiredByAgents'] }); } });
}
