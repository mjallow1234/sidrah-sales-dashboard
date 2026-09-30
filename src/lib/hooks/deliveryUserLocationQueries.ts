import { useMutation, useQuery } from '@tanstack/react-query';
import { getCurrentDeliveryUserLocation, saveCurrentDeliveryUserLocation } from '@/lib/api/deliveryUserLocation';

export function useCurrentDeliveryUserLocationQuery(enabled = true) {
  return useQuery({
    queryKey: ['currentDeliveryUserLocation'],
    queryFn: getCurrentDeliveryUserLocation,
    enabled,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  });
}

export function useSaveCurrentDeliveryUserLocationMutation() {
  return useMutation({
    mutationFn: ({ latitude, longitude }: { latitude: number; longitude: number }) => saveCurrentDeliveryUserLocation(latitude, longitude),
  });
}
