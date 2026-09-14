import type { FactoryMovementType, FactoryStockMovement } from '@/lib/types';
import type { RepositoryDbClient } from './types';
import { BaseRepository } from './BaseRepository';

function mapMovement(row: any): FactoryStockMovement {
  return {
    movement_id: String(row.movement_id),
    event_id: row.event_id === null || row.event_id === undefined ? undefined : String(row.event_id),
    operation_id: String(row.operation_id),
    movement_type: row.movement_type as FactoryMovementType,
    product_id: String(row.product_id),
    product_name: row.product_name === null || row.product_name === undefined ? undefined : String(row.product_name),
    unit: row.unit === null || row.unit === undefined ? undefined : String(row.unit),
    quantity: Number(row.quantity),
    occurred_at: row.occurred_at instanceof Date ? row.occurred_at.toISOString() : String(row.occurred_at ?? ''),
    recorded_at: row.recorded_at instanceof Date ? row.recorded_at.toISOString() : String(row.recorded_at ?? ''),
    actor_user_id: String(row.actor_user_id),
    actor_name: row.actor_name === null || row.actor_name === undefined ? undefined : String(row.actor_name),
    raw_material: row.raw_material === null ? null : String(row.raw_material ?? ''),
    temperature_c: row.temperature_c === null ? null : Number(row.temperature_c),
    processing_duration_hours: row.processing_duration_hours === null ? null : Number(row.processing_duration_hours),
    processing_duration_minutes: row.processing_duration_minutes === null ? null : Number(row.processing_duration_minutes),
    reason_comment: row.event_reason_comment === null && row.reason_comment === null
      ? null : String(row.event_reason_comment ?? row.reason_comment ?? ''),
    batch_reference: row.batch_reference === null ? null : String(row.batch_reference ?? ''),
    input_quantity: row.input_quantity === null ? null : Number(row.input_quantity),
    input_unit: row.input_unit === null ? null : String(row.input_unit ?? ''),
    status: row.status === 'reversed' ? 'reversed' : 'active',
    reversed_by: row.reversed_by === null ? null : String(row.reversed_by ?? ''),
    reversed_by_name: row.reversed_by_name === null ? null : String(row.reversed_by_name ?? ''),
    reversed_at: row.reversed_at === null ? null : (row.reversed_at instanceof Date ? row.reversed_at.toISOString() : String(row.reversed_at ?? '')),
    reversal_reason: row.reversal_reason === null ? null : String(row.reversal_reason ?? ''),
    reversal_operation_id: row.reversal_operation_id === null ? null : String(row.reversal_operation_id ?? ''),
    edited_by: row.edited_by === null ? null : String(row.edited_by ?? ''),
    edited_at: row.edited_at === null ? null : (row.edited_at instanceof Date ? row.edited_at.toISOString() : String(row.edited_at ?? '')),
    has_edits: Boolean(row.has_edits),
  };
}

const movementSelect = `SELECT m.*, e.reason_comment AS event_reason_comment, e.status, e.reversed_by, e.reversed_at, e.reversal_reason, e.reversal_operation_id, e.edited_by, e.edited_at,
  reversal_user.name AS reversed_by_name, p.product_name, p.unit, u.name AS actor_name,
  EXISTS (SELECT 1 FROM factory_record_revisions fr WHERE fr.record_type = 'movement_event' AND fr.event_id = m.event_id AND fr.action_type = 'edit') AS has_edits
  FROM factory_stock_movements m
  INNER JOIN factory_movement_events e ON e.event_id = m.event_id
  INNER JOIN products p ON p.product_id = m.product_id
  INNER JOIN app_users u ON u.user_id = m.actor_user_id
  LEFT JOIN app_users reversal_user ON reversal_user.user_id = e.reversed_by`;

export class FactoryStockMovementRepository extends BaseRepository {
  constructor(db: RepositoryDbClient) {
    super(db);
  }

  async findByOperationId(operationId: string, forUpdate = false): Promise<FactoryStockMovement | null> {
    const rows = await this.findItemsByOperationId(operationId, forUpdate);
    return rows[0] ?? null;
  }

  async findItemsByOperationId(operationId: string, forUpdate = false): Promise<FactoryStockMovement[]> {
    const [rows] = await this.execute<any[]>(
      `${movementSelect} WHERE m.operation_id = ? ORDER BY m.movement_id ASC${forUpdate ? ' FOR UPDATE' : ''}`,
      [operationId],
    );
    return rows.map(mapMovement);
  }

  async findItemsByEventId(eventId: string, forUpdate = false): Promise<FactoryStockMovement[]> {
    const [rows] = await this.execute<any[]>(`${movementSelect} WHERE m.event_id = ? ORDER BY m.movement_id ASC${forUpdate ? ' FOR UPDATE' : ''}`, [eventId]);
    return rows.map(mapMovement);
  }

  async findAll(limit = 100): Promise<FactoryStockMovement[]> {
    const safeLimit = Math.max(1, Math.min(500, Math.trunc(limit)));
    const [rows] = await this.execute<any[]>(`${movementSelect} ORDER BY e.recorded_at DESC, e.event_id DESC, m.movement_id DESC LIMIT ${safeLimit}`);
    return rows.map(mapMovement);
  }

  async create(payload: {
    movement_id: string;
    event_id: string;
    operation_id: string;
    movement_type: FactoryMovementType;
    product_id: string;
    quantity: number;
    occurred_at: string;
    recorded_at: string;
    actor_user_id: string;
    raw_material?: string | null;
    temperature_c?: number | null;
    processing_duration_hours?: number | null;
    processing_duration_minutes?: number | null;
    reason_comment?: string | null;
    batch_reference?: string | null;
    input_quantity?: number | null;
    input_unit?: string | null;
  }): Promise<FactoryStockMovement> {
    await this.execute(
      `INSERT INTO factory_stock_movements
       (movement_id, event_id, operation_id, movement_type, product_id, quantity, occurred_at, recorded_at, actor_user_id,
        raw_material, temperature_c, processing_duration_hours, processing_duration_minutes,
        reason_comment, batch_reference, input_quantity, input_unit)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [payload.movement_id, payload.event_id, payload.operation_id, payload.movement_type, payload.product_id, payload.quantity,
        payload.occurred_at, payload.recorded_at, payload.actor_user_id, payload.raw_material ?? null,
        payload.temperature_c ?? null, payload.processing_duration_hours ?? null, payload.processing_duration_minutes ?? null,
        payload.reason_comment ?? null,
        payload.batch_reference ?? null, payload.input_quantity ?? null, payload.input_unit ?? null],
    );
    return (await this.findByOperationId(payload.operation_id)) as FactoryStockMovement;
  }
}
