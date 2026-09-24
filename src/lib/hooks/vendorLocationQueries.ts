'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { decideVendorLocationRequest, getPendingVendorLocationRequests, getVendorLocation, submitVendorLocation } from '@/lib/api/vendorLocations';

export function useVendorLocationQuery(vendorId: string, enabled = true) {
  return useQuery({ queryKey: ['vendorLocation', vendorId], queryFn: () => getVendorLocation(vendorId), enabled: Boolean(vendorId) && enabled });
}

export function useSubmitVendorLocationMutation() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: ({ vendorId, latitude, longitude }: { vendorId: string; latitude: number; longitude: number }) => submitVendorLocation(vendorId, latitude, longitude), onSuccess: (_data, variables) => {
    queryClient.invalidateQueries({ queryKey: ['vendorLocation', variables.vendorId] });
    queryClient.invalidateQueries({ queryKey: ['vendor', variables.vendorId] });
    queryClient.invalidateQueries({ queryKey: ['vendors'] });
    queryClient.invalidateQueries({ queryKey: ['vendorLocationRequests'] });
  } });
}

export function usePendingVendorLocationRequestsQuery(enabled = true) {
  return useQuery({ queryKey: ['vendorLocationRequests'], queryFn: getPendingVendorLocationRequests, enabled });
}

export function useDecideVendorLocationRequestMutation() {
  const queryClient = useQueryClient();
  return useMutation({ mutationFn: ({ requestId, action, reason }: { requestId: string; action: 'approve' | 'reject'; reason?: string }) => decideVendorLocationRequest(requestId, action, reason), onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['vendorLocationRequests'] });
  } });
}
