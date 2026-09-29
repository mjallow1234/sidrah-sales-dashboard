import type { RepositoryDbClient } from './types';
import { BaseRepository } from './BaseRepository';

export interface DeliveryUserLocation {
  delivery_user_id: string;
  latitude: number;
  longitude: number;
  location_updated_at: string;
  source: string;
}

export class DeliveryUserLocationRepository extends BaseRepository {
  public async findByUserId(deliveryUserId: string): Promise<DeliveryUserLocation | null> {
    const [rows] = await this.execute<any[]>(
      `SELECT delivery_user_id, latitude, longitude, location_updated_at, source
       FROM delivery_user_locations WHERE delivery_user_id = ? LIMIT 1`,
      [deliveryUserId],
    );
    if (!rows.length) return null;
    const row = rows[0];
    return {
      delivery_user_id: String(row.delivery_user_id),
      latitude: Number(row.latitude),
      longitude: Number(row.longitude),
      location_updated_at: row.location_updated_at instanceof Date ? row.location_updated_at.toISOString() : String(row.location_updated_at),
      source: String(row.source),
    };
  }

  public async upsert(payload: { delivery_user_id: string; latitude: number; longitude: number; source: string }): Promise<DeliveryUserLocation> {
    await this.execute(
      `INSERT INTO delivery_user_locations
       (delivery_user_id, latitude, longitude, location_updated_at, source)
       VALUES (?, ?, ?, NOW(), ?)
       ON DUPLICATE KEY UPDATE latitude = VALUES(latitude), longitude = VALUES(longitude), location_updated_at = NOW(), source = VALUES(source)`,
      [payload.delivery_user_id, payload.latitude, payload.longitude, payload.source],
    );
    return (await this.findByUserId(payload.delivery_user_id)) as DeliveryUserLocation;
  }
}
