import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { getDeliveryTracking, updateDeliveryTracking } from '@/lib/api/deliveryTracking';
import type { DeliveryTrackingLocation } from '@/lib/types';

export function useDeliveryTrackingQuery(enabled = true) {
  return useQuery<DeliveryTrackingLocation[]>({
    queryKey: ['deliveryTracking'],
    queryFn: getDeliveryTracking,
    enabled,
    refetchInterval: enabled ? 30_000 : false,
  });
}

export function useUpdateDeliveryTrackingMutation() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: ({ deliveryId, latitude, longitude }: { deliveryId: string; latitude: number; longitude: number }) => updateDeliveryTracking(deliveryId, latitude, longitude),
    onSuccess: () => { client.invalidateQueries({ queryKey: ['deliveryTracking'] }); },
  });
}
