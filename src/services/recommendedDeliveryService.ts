import { getPool } from '@/lib/db';
import type { RecommendedDelivery } from '@/lib/types/recommended-delivery';
import { RecommendedDeliveryRepository, type RecommendedDeliveryCandidate } from '@/repositories/RecommendedDeliveryRepository';
import { DELIVERY_LOCATION_STALE_MINUTES } from '@/services/deliveryUserLocationService';

const priorityRank: Record<RecommendedDeliveryCandidate['priority'], number> = { urgent: 0, high: 1, normal: 2, low: 3 };

export function haversineDistanceKm(latitudeA: number, longitudeA: number, latitudeB: number, longitudeB: number): number {
  const radians = (value: number) => value * Math.PI / 180;
  const earthRadiusKm = 6371;
  const deltaLatitude = radians(latitudeB - latitudeA);
  const deltaLongitude = radians(longitudeB - longitudeA);
  const a = Math.sin(deltaLatitude / 2) ** 2
    + Math.cos(radians(latitudeA)) * Math.cos(radians(latitudeB)) * Math.sin(deltaLongitude / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function validCoordinate(value: unknown, minimum: number, maximum: number): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= minimum && value <= maximum;
}

function compareDate(left?: string, right?: string): number {
  if (left && right) return left.localeCompare(right);
  if (left) return -1;
  if (right) return 1;
  return 0;
}

export function rankRecommendedDeliveries(candidates: RecommendedDeliveryCandidate[], latitude?: number, longitude?: number): RecommendedDelivery[] {
  const hasDriverLocation = validCoordinate(latitude, -90, 90) && validCoordinate(longitude, -180, 180);
  return candidates
    .map((candidate) => {
      const hasVendorLocation = validCoordinate(candidate.vendor_latitude, -90, 90) && validCoordinate(candidate.vendor_longitude, -180, 180);
      const distance = hasDriverLocation && hasVendorLocation
        ? haversineDistanceKm(latitude as number, longitude as number, candidate.vendor_latitude as number, candidate.vendor_longitude as number)
        : null;
      return { candidate, distance };
    })
    .sort((left, right) => {
      const priorityDifference = priorityRank[left.candidate.priority] - priorityRank[right.candidate.priority];
      if (priorityDifference !== 0) return priorityDifference;
      if (left.distance !== null && right.distance !== null && left.distance !== right.distance) return left.distance - right.distance;
      if (left.distance !== null && right.distance === null) return -1;
      if (left.distance === null && right.distance !== null) return 1;
      const dateDifference = compareDate(left.candidate.delivery_date, right.candidate.delivery_date);
      if (dateDifference !== 0) return dateDifference;
      const createdDifference = left.candidate.date_created.localeCompare(right.candidate.date_created);
      if (createdDifference !== 0) return createdDifference;
      return left.candidate.delivery_id.localeCompare(right.candidate.delivery_id);
    })
    .map(({ candidate, distance }) => ({
      delivery_id: candidate.delivery_id,
      vendor_id: candidate.vendor_id,
      vendor_name: candidate.vendor_name,
      priority: candidate.priority,
      delivery_date: candidate.delivery_date,
      cooking_location: candidate.cooking_location,
      delivery_address: candidate.delivery_address,
      distance_km: distance === null ? null : Number(distance.toFixed(2)),
      distance_available: distance !== null,
      recommendation_reason: distance === null
        ? `Highest priority available; proximity unavailable, then delivery date and request time.`
        : `Highest priority available; nearest vendor within priority at ${distance.toFixed(2)} km.`,
    }));
}

export async function getRecommendedNextDelivery(deliveryUserId: string, latitude?: number, longitude?: number): Promise<RecommendedDelivery | null> {
  const repository = new RecommendedDeliveryRepository(getPool());
  if (latitude === undefined || longitude === undefined) {
    const stored = await repository.findCurrentLocation(deliveryUserId);
    if (stored && Date.now() - new Date(stored.location_updated_at).getTime() <= DELIVERY_LOCATION_STALE_MINUTES * 60_000) {
      latitude = stored.latitude;
      longitude = stored.longitude;
    }
  }
  const candidates = await repository.findEligible();
  return rankRecommendedDeliveries(candidates, latitude, longitude)[0] ?? null;
}
