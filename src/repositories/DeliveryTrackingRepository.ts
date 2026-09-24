import type { DeliveryTrackingLocation } from '@/lib/types';
import { BaseRepository } from './BaseRepository';

export class DeliveryTrackingRepository extends BaseRepository {
  public async findActive(): Promise<DeliveryTrackingLocation[]> {
    const [rows] = await this.execute<any[]>(
      `SELECT t.delivery_id, t.delivery_user_id, u.name AS delivery_user_name, u.username AS delivery_user_username,
              d.customer_name AS vendor_name, d.delivery_address, t.latitude, t.longitude, t.location_updated_at
       FROM delivery_tracking_locations t
       JOIN deliveries d ON d.delivery_id = t.delivery_id AND d.status = 'ongoing' AND d.claimed_by = t.delivery_user_id
       LEFT JOIN app_users u ON u.user_id = t.delivery_user_id
       ORDER BY t.location_updated_at DESC`
    );
    return (Array.isArray(rows) ? rows : []).map((row) => {
      const updatedAt = row.location_updated_at instanceof Date
        ? row.location_updated_at.toISOString()
        : String(row.location_updated_at);
      const parsedUpdatedAt = row.location_updated_at instanceof Date
        ? row.location_updated_at.getTime()
        : new Date(`${updatedAt.replace(' ', 'T')}Z`).getTime();
      const ageMinutes = (Date.now() - parsedUpdatedAt) / 60000;
      return {
        delivery_id: String(row.delivery_id),
        delivery_user_id: String(row.delivery_user_id),
        delivery_user_name: row.delivery_user_name ? String(row.delivery_user_name) : undefined,
        delivery_user_username: row.delivery_user_username ? String(row.delivery_user_username) : undefined,
        vendor_name: String(row.vendor_name),
        delivery_address: String(row.delivery_address),
        latitude: Number(row.latitude),
        longitude: Number(row.longitude),
        location_updated_at: updatedAt,
        is_stale: ageMinutes > 10,
      } satisfies DeliveryTrackingLocation;
    });
  }

  public async findDelivery(deliveryId: string): Promise<{ status: string; claimed_by: string | null }> {
    const [rows] = await this.execute<any[]>(`SELECT status, claimed_by FROM deliveries WHERE delivery_id = ? LIMIT 1`, [deliveryId]);
    if (!rows.length) throw new Error('Delivery not found.');
    return { status: String(rows[0].status), claimed_by: rows[0].claimed_by === null ? null : String(rows[0].claimed_by) };
  }

  public async upsertLocation(payload: { delivery_id: string; delivery_user_id: string; latitude: number; longitude: number }): Promise<void> {
    await this.execute(
      `INSERT INTO delivery_tracking_locations (delivery_id, delivery_user_id, latitude, longitude, location_updated_at)
       VALUES (:delivery_id, :delivery_user_id, :latitude, :longitude, NOW())
       ON DUPLICATE KEY UPDATE delivery_user_id = VALUES(delivery_user_id), latitude = VALUES(latitude), longitude = VALUES(longitude), location_updated_at = NOW()`,
      payload
    );
  }
}
