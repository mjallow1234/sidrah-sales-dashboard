import { useQuery } from '@tanstack/react-query';
import { getRecommendedNextDelivery } from '@/lib/api/recommendedDeliveries';

export function useRecommendedNextDeliveryQuery(latitude?: number, longitude?: number, enabled = false) {
  return useQuery({
    queryKey: ['recommendedNextDelivery', latitude, longitude],
    queryFn: () => getRecommendedNextDelivery(latitude, longitude),
    enabled,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
}
