import type { DeliveryPriority } from './index';

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
  recommendation_reason: string;
}
