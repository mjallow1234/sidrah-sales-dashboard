import { getPool, transaction } from '@/lib/db';
import { DeliveryUserLocationRepository, type DeliveryUserLocation } from '@/repositories/DeliveryUserLocationRepository';

export const DELIVERY_LOCATION_STALE_MINUTES = 15;

export class DeliveryUserLocationError extends Error {
  public readonly status: number;
  constructor(status: number, message: string) { super(message); this.status = status; }
}

function coordinate(value: unknown, label: string, minimum: number, maximum: number): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed < minimum || parsed > maximum) {
    throw new DeliveryUserLocationError(400, `${label} is invalid.`);
  }
  return Number(parsed.toFixed(7));
}

function isFresh(location: DeliveryUserLocation, now = Date.now()): boolean {
  const timestamp = new Date(location.location_updated_at).getTime();
  return Number.isFinite(timestamp) && now - timestamp <= DELIVERY_LOCATION_STALE_MINUTES * 60_000;
}

export async function getCurrentDeliveryUserLocation(userId: string): Promise<DeliveryUserLocation | null> {
  const location = await new DeliveryUserLocationRepository(getPool()).findByUserId(userId);
  return location && isFresh(location) ? location : null;
}

export async function saveCurrentDeliveryUserLocation(userId: string, latitudeValue: unknown, longitudeValue: unknown): Promise<DeliveryUserLocation> {
  const latitude = coordinate(latitudeValue, 'Latitude', -90, 90);
  const longitude = coordinate(longitudeValue, 'Longitude', -180, 180);
  return transaction(async (connection) => new DeliveryUserLocationRepository(connection).upsert({
    delivery_user_id: userId,
    latitude,
    longitude,
    source: 'browser',
  }));
}
