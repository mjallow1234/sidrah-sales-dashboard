import type { DeliveryItem, DeliveryRecord, DeliveryStatus } from '@/lib/types';
import type { RepositoryDbClient } from './types';
import { BaseRepository } from './BaseRepository';
import { NotFoundError } from './errors';

export interface CreateDeliveryPayload {
  delivery_id: string;
  customer_name: string;
  customer_phone: string;
  delivery_address: string;
  items: DeliveryItem[];
  notes?: string;
  status: DeliveryStatus;
  created_by: string;
  claimed_by?: string | null;
  claimed_at?: string | null;
  delivered_at?: string | null;
  date_created: string;
  last_updated: string;
  updated_by?: string | null;
}

export interface DeliverySearchFilters {
  status?: DeliveryStatus;
  deliveryUserId?: string;
}

export class DeliveryRepository extends BaseRepository {
  constructor(db: RepositoryDbClient) {
    super(db);
  }

  private parseItems(value: unknown): DeliveryItem[] {
    if (typeof value === 'string') {
      try {
        return JSON.parse(value) as DeliveryItem[];
      } catch {
        return [];
      }
    }
    if (Array.isArray(value)) {
      return value as DeliveryItem[];
    }
    return [];
  }

  private resolveUserName(userId: unknown, resolvedName: unknown): string | undefined {
    if (userId === null || userId === undefined) {
      return undefined;
    }
    return resolvedName === null || resolvedName === undefined ? 'Unknown user' : String(resolvedName);
  }

  private mapRow(row: any): DeliveryRecord {
    return {
      delivery_id: String(row.delivery_id),
      customer_name: String(row.customer_name),
      customer_phone: String(row.customer_phone),
      delivery_address: String(row.delivery_address),
      items: this.parseItems(row.items),
      notes: row.notes === null ? undefined : String(row.notes),
      status: String(row.status) as DeliveryRecord['status'],
      created_by: String(row.created_by),
      created_by_name: this.resolveUserName(row.created_by, row.created_by_name),
      date_created: String(row.date_created),
      updated_by: row.updated_by === null ? undefined : String(row.updated_by),
      last_updated: String(row.last_updated),
      claimed_by: row.claimed_by === null ? undefined : String(row.claimed_by),
      claimed_by_name: this.resolveUserName(row.claimed_by, row.claimed_by_name),
      claimed_at: row.claimed_at === null ? undefined : String(row.claimed_at),
      delivered_at: row.delivered_at === null ? undefined : String(row.delivered_at),
      cancelled_at: row.cancelled_at === null ? undefined : String(row.cancelled_at),
      cancelled_by: row.cancelled_by === null ? undefined : String(row.cancelled_by),
      cancelled_by_name: this.resolveUserName(row.cancelled_by, row.cancelled_by_name),
    };
  }

  private selectWithUserNames(whereClause: string): string {
    return `SELECT d.*,
        creator.name AS created_by_resolved_name,
        creator.username AS created_by_resolved_username,
        claimer.name AS claimed_by_resolved_name,
        claimer.username AS claimed_by_resolved_username,
        canceller.name AS cancelled_by_resolved_name,
        canceller.username AS cancelled_by_resolved_username
      FROM deliveries d
      LEFT JOIN app_users creator ON creator.user_id = d.created_by
      LEFT JOIN app_users claimer ON claimer.user_id = d.claimed_by
      LEFT JOIN app_users canceller ON canceller.user_id = d.cancelled_by
      ${whereClause}`;
  }

  private mapJoinedRow(row: any): DeliveryRecord {
    return this.mapRow({
      ...row,
      created_by_name: row.created_by_resolved_name || row.created_by_resolved_username,
      claimed_by_name: row.claimed_by_resolved_name || row.claimed_by_resolved_username,
      cancelled_by_name: row.cancelled_by_resolved_name || row.cancelled_by_resolved_username,
    });
  }

  public async findAll(filters: DeliverySearchFilters = {}): Promise<DeliveryRecord[]> {
    const conditions: string[] = [];
    const params: Record<string, unknown> = {};

    if (filters.deliveryUserId && filters.status) {
      if (filters.status === 'pending') {
        conditions.push('d.status = :status');
        params.status = filters.status;
      } else {
        conditions.push('d.status = :status AND d.claimed_by = :deliveryUserId');
        params.status = filters.status;
        params.deliveryUserId = filters.deliveryUserId;
      }
    } else if (filters.deliveryUserId) {
      conditions.push('(d.status = :pendingStatus OR d.claimed_by = :deliveryUserId)');
      params.pendingStatus = 'pending';
      params.deliveryUserId = filters.deliveryUserId;
    } else if (filters.status) {
      conditions.push('d.status = :status');
      params.status = filters.status;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const [rows] = await this.execute<any[]>(
      `${this.selectWithUserNames(whereClause)} ORDER BY d.date_created DESC, d.delivery_id DESC`,
      params
    );
    const records = Array.isArray(rows) ? rows : [];
    return records.map((row) => this.mapJoinedRow(row));
  }

  public async findById(deliveryId: string): Promise<DeliveryRecord> {
    const [rows] = await this.execute<any[]>(`${this.selectWithUserNames('WHERE d.delivery_id = ?')} LIMIT 1`, [deliveryId]);
    if (rows.length === 0) {
      throw new NotFoundError('Delivery', deliveryId);
    }
    return this.mapJoinedRow(rows[0]);
  }

  public async create(payload: CreateDeliveryPayload): Promise<DeliveryRecord> {
    await (this.db.execute as any)(
      `INSERT INTO deliveries (
        delivery_id,
        customer_name,
        customer_phone,
        delivery_address,
        items,
        notes,
        status,
        created_by,
        claimed_by,
        claimed_at,
        delivered_at,
        date_created,
        last_updated,
        updated_by
      ) VALUES (
        :delivery_id,
        :customer_name,
        :customer_phone,
        :delivery_address,
        :items,
        :notes,
        :status,
        :created_by,
        :claimed_by,
        :claimed_at,
        :delivered_at,
        :date_created,
        :last_updated,
        :updated_by
      )`,
      {
        delivery_id: payload.delivery_id,
        customer_name: payload.customer_name,
        customer_phone: payload.customer_phone,
        delivery_address: payload.delivery_address,
        items: JSON.stringify(payload.items),
        notes: payload.notes ?? null,
        status: payload.status,
        created_by: payload.created_by,
        claimed_by: payload.claimed_by ?? null,
        claimed_at: payload.claimed_at ?? null,
        delivered_at: payload.delivered_at ?? null,
        date_created: payload.date_created,
        last_updated: payload.last_updated,
        updated_by: payload.updated_by ?? null,
      }
    );

    return this.findById(payload.delivery_id);
  }

  public async claim(deliveryId: string, deliveryUserId: string, updatedBy: string): Promise<DeliveryRecord> {
    const [result] = await (this.db.execute as any)(
      `UPDATE deliveries SET status = 'ongoing', claimed_by = :claimed_by, claimed_at = NOW(), updated_by = :updated_by, last_updated = NOW()
       WHERE delivery_id = :delivery_id AND status = 'pending'`,
      { claimed_by: deliveryUserId, updated_by: updatedBy, delivery_id: deliveryId }
    );

    if ((result as import('mysql2/promise').OkPacket).affectedRows === 0) {
      await this.findById(deliveryId);
      throw new Error('Delivery is not pending or has already been claimed.');
    }

    return this.findById(deliveryId);
  }

  public async deliver(deliveryId: string, claimedBy: string, updatedBy: string): Promise<DeliveryRecord> {
    const [result] = await (this.db.execute as any)(
      `UPDATE deliveries SET status = 'delivered', delivered_at = NOW(), updated_by = :updated_by, last_updated = NOW()
       WHERE delivery_id = :delivery_id AND status = 'ongoing' AND claimed_by = :claimed_by`,
      { updated_by: updatedBy, delivery_id: deliveryId, claimed_by: claimedBy }
    );

    if ((result as import('mysql2/promise').OkPacket).affectedRows === 0) {
      await this.findById(deliveryId);
      throw new Error('Delivery cannot be marked as delivered by this user.');
    }

    return this.findById(deliveryId);
  }

  public async reassign(deliveryId: string, newDeliveryUserId: string, updatedBy: string): Promise<DeliveryRecord> {
    const [result] = await (this.db.execute as any)(
      `UPDATE deliveries SET status = 'ongoing', claimed_by = :claimed_by, claimed_at = NOW(), updated_by = :updated_by, last_updated = NOW()
       WHERE delivery_id = :delivery_id AND status IN ('pending', 'ongoing')`,
      { claimed_by: newDeliveryUserId, updated_by: updatedBy, delivery_id: deliveryId }
    );

    if ((result as import('mysql2/promise').OkPacket).affectedRows === 0) {
      await this.findById(deliveryId);
      throw new Error('Delivery cannot be reassigned in its current status.');
    }

    return this.findById(deliveryId);
  }

  public async completeAsAdmin(deliveryId: string, updatedBy: string): Promise<DeliveryRecord> {
    const [result] = await (this.db.execute as any)(
      `UPDATE deliveries SET status = 'delivered', delivered_at = NOW(), updated_by = :updated_by, last_updated = NOW()
       WHERE delivery_id = :delivery_id AND status IN ('pending', 'ongoing')`,
      { updated_by: updatedBy, delivery_id: deliveryId }
    );

    if ((result as import('mysql2/promise').OkPacket).affectedRows === 0) {
      await this.findById(deliveryId);
      throw new Error('Delivery cannot be marked as delivered in its current status.');
    }

    return this.findById(deliveryId);
  }

  public async cancel(deliveryId: string, updatedBy: string): Promise<DeliveryRecord> {
    const [result] = await (this.db.execute as any)(
      `UPDATE deliveries SET status = 'cancelled', cancelled_at = NOW(), cancelled_by = :cancelled_by, updated_by = :updated_by, last_updated = NOW()
       WHERE delivery_id = :delivery_id AND status IN ('pending', 'ongoing')`,
      { cancelled_by: updatedBy, updated_by: updatedBy, delivery_id: deliveryId }
    );

    if ((result as import('mysql2/promise').OkPacket).affectedRows === 0) {
      await this.findById(deliveryId);
      throw new Error('Delivery cannot be cancelled in its current status.');
    }

    return this.findById(deliveryId);
  }
}
