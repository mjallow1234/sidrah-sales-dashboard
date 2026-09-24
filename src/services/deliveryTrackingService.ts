import { getPool, transaction } from '@/lib/db';
import type { DeliveryTrackingLocation } from '@/lib/types';
import { DeliveryTrackingRepository } from '@/repositories/DeliveryTrackingRepository';

export class DeliveryTrackingError extends Error {
  public readonly status: number;
  constructor(status: number, message: string) { super(message); this.status = status; }
}

function coordinate(value: unknown, label: string, min: number, max: number): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) throw new DeliveryTrackingError(400, `${label} is invalid.`);
  return Math.round(parsed * 10_000_000) / 10_000_000;
}

export async function listActiveDeliveryLocations(): Promise<DeliveryTrackingLocation[]> {
  return new DeliveryTrackingRepository(getPool()).findActive();
}

export async function updateDeliveryLocation(deliveryId: unknown, latitude: unknown, longitude: unknown, userId: string): Promise<void> {
  if (typeof deliveryId !== 'string' || deliveryId.trim() === '') throw new DeliveryTrackingError(400, 'Delivery is required.');
  const lat = coordinate(latitude, 'Latitude', -90, 90);
  const lon = coordinate(longitude, 'Longitude', -180, 180);
  await transaction(async (connection) => {
    const repository = new DeliveryTrackingRepository(connection);
    const delivery = await repository.findDelivery(deliveryId.trim());
    if (delivery.status !== 'ongoing' || delivery.claimed_by !== userId) {
      throw new DeliveryTrackingError(403, 'Only the assigned delivery user can update location for an ongoing delivery.');
    }
    await repository.upsertLocation({ delivery_id: deliveryId.trim(), delivery_user_id: userId, latitude: lat, longitude: lon });
  });
}
