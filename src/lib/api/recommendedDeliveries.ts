import type { RecommendedDelivery } from '@/lib/types/recommended-delivery';

export async function getRecommendedNextDelivery(latitude?: number, longitude?: number): Promise<RecommendedDelivery | null> {
  const params = new URLSearchParams();
  if (latitude !== undefined && longitude !== undefined) {
    params.set('latitude', String(latitude));
    params.set('longitude', String(longitude));
  }
  const response = await fetch(`/api/deliveries/recommended-next${params.toString() ? `?${params}` : ''}`);
  const body = await response.json();
  if (!response.ok) throw new Error(body?.message || `Request failed: ${response.status}`);
  return body.data as RecommendedDelivery | null;
}
