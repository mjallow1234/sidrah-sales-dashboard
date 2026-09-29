import type { RepositoryDbClient } from './types';
import { BaseRepository } from './BaseRepository';

export interface RecommendedDeliveryCandidate {
  delivery_id: string;
  vendor_id: string;
  vendor_name: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  delivery_date?: string;
  cooking_location?: 'Home' | 'Workplace';
  delivery_address: string;
  vendor_latitude: number | null;
  vendor_longitude: number | null;
  date_created: string;
}

export class RecommendedDeliveryRepository extends BaseRepository {
  public async findEligible(): Promise<RecommendedDeliveryCandidate[]> {
    const [rows] = await this.execute<any[]>(
      `SELECT d.delivery_id, d.vendor_id, v.vendor_name, d.priority, d.delivery_date,
              d.cooking_location, d.delivery_address, v.location_latitude AS vendor_latitude,
              v.location_longitude AS vendor_longitude, d.date_created
       FROM deliveries d
       JOIN vendors v ON v.vendor_id = d.vendor_id
       WHERE d.status = 'pending' AND d.claimed_by IS NULL AND d.vendor_id IS NOT NULL
       ORDER BY d.date_created ASC, d.delivery_id ASC`
    );
    return (Array.isArray(rows) ? rows : []).map((row) => ({
      delivery_id: String(row.delivery_id),
      vendor_id: String(row.vendor_id),
      vendor_name: String(row.vendor_name),
      priority: String(row.priority || 'normal') as RecommendedDeliveryCandidate['priority'],
      delivery_date: row.delivery_date instanceof Date
        ? `${row.delivery_date.getUTCFullYear()}-${String(row.delivery_date.getUTCMonth() + 1).padStart(2, '0')}-${String(row.delivery_date.getUTCDate()).padStart(2, '0')}`
        : typeof row.delivery_date === 'string' ? row.delivery_date.slice(0, 10) : undefined,
      cooking_location: row.cooking_location === 'Home' || row.cooking_location === 'Workplace' ? row.cooking_location : undefined,
      delivery_address: String(row.delivery_address),
      vendor_latitude: row.vendor_latitude == null ? null : Number(row.vendor_latitude),
      vendor_longitude: row.vendor_longitude == null ? null : Number(row.vendor_longitude),
      date_created: row.date_created instanceof Date ? row.date_created.toISOString() : String(row.date_created),
    }));
  }
}
