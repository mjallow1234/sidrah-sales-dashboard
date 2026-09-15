import type { DeliveryActivity, DeliveryActivityType, DeliveryItem, DeliveryPreparationSummary, DeliveryRecord, DeliveryStatus } from '@/lib/types';
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

export interface DeliveryActivityPayload {
  activity_id: string;
  delivery_id: string;
  activity_type: DeliveryActivityType;
  previous_status?: DeliveryStatus | null;
  new_status?: DeliveryStatus | null;
  comment?: string | null;
  actor_user_id: string;
  related_user_id?: string | null;
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

  public async getPreparationSummary(): Promise<DeliveryPreparationSummary> {
    const [rows] = await this.execute<any[]>(
      `SELECT
         item.product_id,
         p.product_name,
         p.sku,
         p.unit,
         SUM(item.quantity) AS quantity,
         COUNT(DISTINCT d.delivery_id) AS request_count
       FROM deliveries d
       JOIN JSON_TABLE(
         d.items,
         '$[*]' COLUMNS (
           product_id VARCHAR(64) PATH '$.product_id',
           quantity DECIMAL(18, 3) PATH '$.quantity'
         )
       ) AS item ON TRUE
       JOIN products p ON p.product_id = item.product_id
       WHERE d.status IN ('pending', 'ongoing')
       GROUP BY item.product_id, p.product_name, p.sku, p.unit
       ORDER BY p.product_name ASC, item.product_id ASC`
    );
    const [totals] = await this.execute<any[]>(
      `SELECT COUNT(DISTINCT d.delivery_id) AS request_count, COALESCE(SUM(item.quantity), 0) AS total_quantity
       FROM deliveries d
       JOIN JSON_TABLE(
         d.items,
         '$[*]' COLUMNS (quantity DECIMAL(18, 3) PATH '$.quantity')
       ) AS item ON TRUE
       WHERE d.status IN ('pending', 'ongoing')`
    );
    return {
      items: (Array.isArray(rows) ? rows : []).map((row) => ({
        product_id: String(row.product_id),
        product_name: String(row.product_name),
        sku: row.sku === null || row.sku === undefined ? undefined : String(row.sku),
        unit: String(row.unit),
        quantity: Number(row.quantity),
        request_count: Number(row.request_count),
      })),
      total_quantity: Number(totals?.[0]?.total_quantity ?? 0),
      request_count: Number(totals?.[0]?.request_count ?? 0),
    };
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

  private async lockDelivery(deliveryId: string): Promise<any> {
    const [rows] = await (this.db.execute as any)(
      `SELECT * FROM deliveries WHERE delivery_id = :delivery_id LIMIT 1 FOR UPDATE`,
      { delivery_id: deliveryId }
    );
    if (!Array.isArray(rows) || rows.length === 0) throw new NotFoundError('Delivery', deliveryId);
    return rows[0];
  }

  public async createActivity(payload: DeliveryActivityPayload): Promise<void> {
    await (this.db.execute as any)(
      `INSERT INTO delivery_activity (
        activity_id, delivery_id, activity_type, previous_status, new_status,
        comment, actor_user_id, related_user_id, occurred_at
      ) VALUES (:activity_id, :delivery_id, :activity_type, :previous_status, :new_status,
        :comment, :actor_user_id, :related_user_id, NOW())`,
      {
        activity_id: payload.activity_id,
        delivery_id: payload.delivery_id,
        activity_type: payload.activity_type,
        previous_status: payload.previous_status ?? null,
        new_status: payload.new_status ?? null,
        comment: payload.comment ?? null,
        actor_user_id: payload.actor_user_id,
        related_user_id: payload.related_user_id ?? null,
      }
    );
  }

  public async createStandaloneComment(deliveryId: string, activityId: string, actorUserId: string, comment: string): Promise<void> {
    await this.findById(deliveryId);
    await this.createActivity({
      activity_id: activityId,
      delivery_id: deliveryId,
      activity_type: 'comment',
      comment,
      actor_user_id: actorUserId,
    });
  }

  public async findActivity(deliveryId: string): Promise<DeliveryActivity[]> {
    const [rows] = await this.execute<any[]>(
      `SELECT a.activity_id, a.delivery_id, a.activity_type, a.previous_status, a.new_status,
          a.comment, a.actor_user_id, a.related_user_id, a.occurred_at,
          actor.name AS actor_name, actor.username AS actor_username,
          related.name AS related_user_name, related.username AS related_user_username
       FROM delivery_activity a
       LEFT JOIN app_users actor ON actor.user_id = a.actor_user_id
       LEFT JOIN app_users related ON related.user_id = a.related_user_id
       WHERE a.delivery_id = ?
       ORDER BY a.occurred_at ASC, a.activity_id ASC`,
      [deliveryId]
    );
    return (Array.isArray(rows) ? rows : []).map((row) => ({
      activity_id: String(row.activity_id),
      delivery_id: String(row.delivery_id),
      activity_type: String(row.activity_type) as DeliveryActivityType,
      previous_status: row.previous_status == null ? undefined : String(row.previous_status) as DeliveryStatus,
      new_status: row.new_status == null ? undefined : String(row.new_status) as DeliveryStatus,
      comment: row.comment == null ? undefined : String(row.comment),
      actor_user_id: String(row.actor_user_id),
      actor_name: row.actor_name || row.actor_username || 'Unknown user',
      related_user_id: row.related_user_id == null ? undefined : String(row.related_user_id),
      related_user_name: row.related_user_id == null ? undefined : (row.related_user_name || row.related_user_username || 'Unknown user'),
      occurred_at: String(row.occurred_at),
    }));
  }

  public async claim(deliveryId: string, deliveryUserId: string, updatedBy: string, activityId: string, comment?: string): Promise<DeliveryRecord> {
    const current = await this.lockDelivery(deliveryId);
    if (String(current.status) !== 'pending') {
      throw new Error('Delivery is not pending or has already been claimed.');
    }
    const [result] = await (this.db.execute as any)(
      `UPDATE deliveries SET status = 'ongoing', claimed_by = :claimed_by, claimed_at = NOW(), updated_by = :updated_by, last_updated = NOW()
       WHERE delivery_id = :delivery_id AND status = 'pending'`,
      { claimed_by: deliveryUserId, updated_by: updatedBy, delivery_id: deliveryId }
    );

    if ((result as import('mysql2/promise').OkPacket).affectedRows === 0) throw new Error('Delivery is not pending or has already been claimed.');
    await this.createActivity({ activity_id: activityId, delivery_id: deliveryId, activity_type: 'claimed', previous_status: 'pending', new_status: 'ongoing', comment, actor_user_id: updatedBy, related_user_id: deliveryUserId });

    return this.findById(deliveryId);
  }

  public async deliver(deliveryId: string, claimedBy: string, updatedBy: string, activityId: string, comment?: string): Promise<DeliveryRecord> {
    const current = await this.lockDelivery(deliveryId);
    if (String(current.status) !== 'ongoing' || String(current.claimed_by) !== claimedBy) throw new Error('Delivery cannot be marked as delivered by this user.');
    const [result] = await (this.db.execute as any)(
      `UPDATE deliveries SET status = 'delivered', delivered_at = NOW(), updated_by = :updated_by, last_updated = NOW()
       WHERE delivery_id = :delivery_id AND status = 'ongoing' AND claimed_by = :claimed_by`,
      { updated_by: updatedBy, delivery_id: deliveryId, claimed_by: claimedBy }
    );

    if ((result as import('mysql2/promise').OkPacket).affectedRows === 0) throw new Error('Delivery cannot be marked as delivered by this user.');
    await this.createActivity({ activity_id: activityId, delivery_id: deliveryId, activity_type: 'delivered', previous_status: 'ongoing', new_status: 'delivered', comment, actor_user_id: updatedBy });

    return this.findById(deliveryId);
  }

  public async reassign(deliveryId: string, newDeliveryUserId: string, updatedBy: string, activityId: string, comment?: string): Promise<DeliveryRecord> {
    const current = await this.lockDelivery(deliveryId);
    if (!['pending', 'ongoing'].includes(String(current.status))) throw new Error('Delivery cannot be reassigned in its current status.');
    const activityType: DeliveryActivityType = current.claimed_by ? 'reassigned' : 'assigned';
    const [result] = await (this.db.execute as any)(
      `UPDATE deliveries SET status = 'ongoing', claimed_by = :claimed_by, claimed_at = NOW(), updated_by = :updated_by, last_updated = NOW()
       WHERE delivery_id = :delivery_id AND status IN ('pending', 'ongoing')`,
      { claimed_by: newDeliveryUserId, updated_by: updatedBy, delivery_id: deliveryId }
    );

    if ((result as import('mysql2/promise').OkPacket).affectedRows === 0) throw new Error('Delivery cannot be reassigned in its current status.');
    await this.createActivity({ activity_id: activityId, delivery_id: deliveryId, activity_type: activityType, previous_status: current.status as DeliveryStatus, new_status: 'ongoing', comment, actor_user_id: updatedBy, related_user_id: newDeliveryUserId });

    return this.findById(deliveryId);
  }

  public async completeAsAdmin(deliveryId: string, updatedBy: string, activityId: string, comment?: string): Promise<DeliveryRecord> {
    const current = await this.lockDelivery(deliveryId);
    if (!['pending', 'ongoing'].includes(String(current.status))) throw new Error('Delivery cannot be marked as delivered in its current status.');
    const [result] = await (this.db.execute as any)(
      `UPDATE deliveries SET status = 'delivered', delivered_at = NOW(), updated_by = :updated_by, last_updated = NOW()
       WHERE delivery_id = :delivery_id AND status IN ('pending', 'ongoing')`,
      { updated_by: updatedBy, delivery_id: deliveryId }
    );

    if ((result as import('mysql2/promise').OkPacket).affectedRows === 0) throw new Error('Delivery cannot be marked as delivered in its current status.');
    await this.createActivity({ activity_id: activityId, delivery_id: deliveryId, activity_type: 'delivered', previous_status: current.status as DeliveryStatus, new_status: 'delivered', comment, actor_user_id: updatedBy });

    return this.findById(deliveryId);
  }

  public async cancel(deliveryId: string, updatedBy: string, activityId: string, comment?: string): Promise<DeliveryRecord> {
    const current = await this.lockDelivery(deliveryId);
    if (!['pending', 'ongoing'].includes(String(current.status))) throw new Error('Delivery cannot be cancelled in its current status.');
    const [result] = await (this.db.execute as any)(
      `UPDATE deliveries SET status = 'cancelled', cancelled_at = NOW(), cancelled_by = :cancelled_by, updated_by = :updated_by, last_updated = NOW()
       WHERE delivery_id = :delivery_id AND status IN ('pending', 'ongoing')`,
      { cancelled_by: updatedBy, updated_by: updatedBy, delivery_id: deliveryId }
    );

    if ((result as import('mysql2/promise').OkPacket).affectedRows === 0) throw new Error('Delivery cannot be cancelled in its current status.');
    await this.createActivity({ activity_id: activityId, delivery_id: deliveryId, activity_type: 'cancelled', previous_status: current.status as DeliveryStatus, new_status: 'cancelled', comment, actor_user_id: updatedBy });

    return this.findById(deliveryId);
  }
}
