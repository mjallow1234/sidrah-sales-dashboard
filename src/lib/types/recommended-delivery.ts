import type { DeliveryPriority } from './index';

export type RecommendationLocationState = 'fresh' | 'stale' | 'unavailable';
export type RecommendationDistanceUnavailableReason = 'location_stale' | 'location_unavailable' | 'vendor_coordinates_unavailable';

export interface RecommendedDelivery {
  delivery_id: string;
  vendor_id: string;
  vendor_name: string;
  priority: DeliveryPriority;
  delivery_date?: string;
  cooking_location?: 'Home' | 'Workplace';
  delivery_address: string;
  distance_km: number | null;
  distance_available: boolean;
  location_state: RecommendationLocationState;
  distance_unavailable_reason?: RecommendationDistanceUnavailableReason;
  recommendation_reason: string;
}
