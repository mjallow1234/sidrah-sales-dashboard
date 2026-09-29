import { useMutation } from '@tanstack/react-query';
import { saveCurrentDeliveryUserLocation } from '@/lib/api/deliveryUserLocation';

export function useSaveCurrentDeliveryUserLocationMutation() {
  return useMutation({
    mutationFn: ({ latitude, longitude }: { latitude: number; longitude: number }) => saveCurrentDeliveryUserLocation(latitude, longitude),
  });
}
