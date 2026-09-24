import type { VendorLocationRequest } from '@/lib/types';
import type { RepositoryDbClient } from './types';
import { BaseRepository } from './BaseRepository';
import { NotFoundError } from './errors';

type LocationRow = {
  vendor_id: string;
  location_latitude: number | null;
  location_longitude: number | null;
  location_updated_at: string | Date | null;
  location_updated_by: string | null;
  location_updated_by_name?: string | null;
};

export class VendorLocationRepository extends BaseRepository {
  constructor(db: RepositoryDbClient) {
    super(db);
  }

  private mapRequest(row: any): VendorLocationRequest {
    return {
      request_id: String(row.request_id),
      vendor_id: String(row.vendor_id),
      vendor_name: row.vendor_name == null ? undefined : String(row.vendor_name),
      proposed_latitude: Number(row.proposed_latitude),
      proposed_longitude: Number(row.proposed_longitude),
      current_latitude: row.current_latitude == null ? null : Number(row.current_latitude),
      current_longitude: row.current_longitude == null ? null : Number(row.current_longitude),
      requested_by: String(row.requested_by),
      requested_by_name: row.requested_by_name == null ? undefined : String(row.requested_by_name),
      requested_at: row.requested_at instanceof Date ? row.requested_at.toISOString() : String(row.requested_at),
      status: String(row.status) as VendorLocationRequest['status'],
      reviewed_by: row.reviewed_by == null ? null : String(row.reviewed_by),
      reviewed_by_name: row.reviewed_by_name == null ? undefined : String(row.reviewed_by_name),
      reviewed_at: row.reviewed_at == null ? null : row.reviewed_at instanceof Date ? row.reviewed_at.toISOString() : String(row.reviewed_at),
      decision_reason: row.decision_reason == null ? null : String(row.decision_reason),
    };
  }

  public async findLocation(vendorId: string): Promise<LocationRow> {
    const [rows] = await this.execute<LocationRow[]>(
      `SELECT v.vendor_id, v.location_latitude, v.location_longitude, v.location_updated_at,
              v.location_updated_by, u.name AS location_updated_by_name
       FROM vendors v LEFT JOIN app_users u ON u.user_id = v.location_updated_by
       WHERE v.vendor_id = ? LIMIT 1`,
      [vendorId],
    );
    if (rows.length === 0) throw new NotFoundError('Vendor', vendorId);
    return rows[0];
  }

  public async findPendingForVendor(vendorId: string): Promise<VendorLocationRequest | null> {
    const [rows] = await this.execute<any[]>(
      `SELECT r.*, v.vendor_name, v.location_latitude AS current_latitude, v.location_longitude AS current_longitude, requester.name AS requested_by_name, reviewer.name AS reviewed_by_name
       FROM vendor_location_update_requests r
       JOIN vendors v ON v.vendor_id = r.vendor_id
       LEFT JOIN app_users requester ON requester.user_id = r.requested_by
       LEFT JOIN app_users reviewer ON reviewer.user_id = r.reviewed_by
       WHERE r.vendor_id = ? AND r.status = 'pending'
       ORDER BY r.requested_at DESC, r.request_id DESC LIMIT 1`,
      [vendorId],
    );
    return rows.length === 0 ? null : this.mapRequest(rows[0]);
  }

  public async listPending(): Promise<VendorLocationRequest[]> {
    const [rows] = await this.execute<any[]>(
      `SELECT r.*, v.vendor_name, v.location_latitude AS current_latitude, v.location_longitude AS current_longitude, requester.name AS requested_by_name, reviewer.name AS reviewed_by_name
       FROM vendor_location_update_requests r
       JOIN vendors v ON v.vendor_id = r.vendor_id
       LEFT JOIN app_users requester ON requester.user_id = r.requested_by
       LEFT JOIN app_users reviewer ON reviewer.user_id = r.reviewed_by
       WHERE r.status = 'pending'
       ORDER BY r.requested_at ASC, r.request_id ASC`,
    );
    return rows.map((row) => this.mapRequest(row));
  }

  public async lockVendor(vendorId: string): Promise<LocationRow> {
    const [rows] = await this.execute<LocationRow[]>(
      `SELECT vendor_id, location_latitude, location_longitude, location_updated_at, location_updated_by
       FROM vendors WHERE vendor_id = ? LIMIT 1 FOR UPDATE`,
      [vendorId],
    );
    if (rows.length === 0) throw new NotFoundError('Vendor', vendorId);
    return rows[0];
  }

  public async updateLocation(vendorId: string, latitude: number, longitude: number, actorUserId: string, occurredAt: string): Promise<void> {
    await this.execute(
      `UPDATE vendors
       SET location_latitude = ?, location_longitude = ?, location_updated_at = ?, location_updated_by = ?, last_updated = ?, updated_by = ?
       WHERE vendor_id = ?`,
      [latitude, longitude, occurredAt, actorUserId, occurredAt, actorUserId, vendorId],
    );
  }

  public async createRequest(payload: { request_id: string; vendor_id: string; latitude: number; longitude: number; requested_by: string }): Promise<VendorLocationRequest> {
    await this.execute(
      `INSERT INTO vendor_location_update_requests
       (request_id, vendor_id, proposed_latitude, proposed_longitude, requested_by, requested_at, status)
       VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
      [payload.request_id, payload.vendor_id, payload.latitude, payload.longitude, payload.requested_by, new Date().toISOString().slice(0, 19).replace('T', ' ')],
    );
    const [rows] = await this.execute<any[]>(
      `SELECT r.*, v.vendor_name, v.location_latitude AS current_latitude, v.location_longitude AS current_longitude, requester.name AS requested_by_name
       FROM vendor_location_update_requests r JOIN vendors v ON v.vendor_id = r.vendor_id
       LEFT JOIN app_users requester ON requester.user_id = r.requested_by
       WHERE r.request_id = ? LIMIT 1`,
      [payload.request_id],
    );
    return this.mapRequest(rows[0]);
  }

  public async lockRequest(requestId: string): Promise<VendorLocationRequest> {
    const [rows] = await this.execute<any[]>(
      `SELECT r.*, v.vendor_name, requester.name AS requested_by_name, reviewer.name AS reviewed_by_name
       FROM vendor_location_update_requests r JOIN vendors v ON v.vendor_id = r.vendor_id
       LEFT JOIN app_users requester ON requester.user_id = r.requested_by
       LEFT JOIN app_users reviewer ON reviewer.user_id = r.reviewed_by
       WHERE r.request_id = ? LIMIT 1 FOR UPDATE`,
      [requestId],
    );
    if (rows.length === 0) throw new NotFoundError('VendorLocationRequest', requestId);
    return this.mapRequest(rows[0]);
  }

  public async markRequest(requestId: string, status: 'approved' | 'rejected', actorUserId: string, reason: string | null): Promise<void> {
    await this.execute(
      `UPDATE vendor_location_update_requests
       SET status = ?, reviewed_by = ?, reviewed_at = ?, decision_reason = ?
       WHERE request_id = ? AND status = 'pending'`,
      [status, actorUserId, new Date().toISOString().slice(0, 19).replace('T', ' '), reason, requestId],
    );
  }
}
