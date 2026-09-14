import type { FactoryMovementType } from '@/lib/types';
import type { RepositoryDbClient } from './types';
import { BaseRepository } from './BaseRepository';

export interface FactoryMovementEvent {
  event_id: string;
  operation_id: string;
  movement_type: FactoryMovementType;
  occurred_at: string;
  recorded_at: string;
  actor_user_id: string;
  reason_comment: string | null;
  status?: 'active' | 'reversed';
  reversed_by?: string | null;
  reversed_at?: string | null;
  reversal_reason?: string | null;
  reversal_operation_id?: string | null;
  edited_by?: string | null;
  edited_at?: string | null;
}

function mapEvent(row: any): FactoryMovementEvent {
  return {
    event_id: String(row.event_id),
    operation_id: String(row.operation_id),
    movement_type: row.movement_type as FactoryMovementType,
    occurred_at: row.occurred_at instanceof Date ? row.occurred_at.toISOString() : String(row.occurred_at ?? ''),
    recorded_at: row.recorded_at instanceof Date ? row.recorded_at.toISOString() : String(row.recorded_at ?? ''),
    actor_user_id: String(row.actor_user_id),
    reason_comment: row.reason_comment === null ? null : String(row.reason_comment ?? ''),
    status: row.status === 'reversed' ? 'reversed' : 'active',
    reversed_by: row.reversed_by === null ? null : String(row.reversed_by ?? ''),
    reversed_at: row.reversed_at === null ? null : (row.reversed_at instanceof Date ? row.reversed_at.toISOString() : String(row.reversed_at ?? '')),
    reversal_reason: row.reversal_reason === null ? null : String(row.reversal_reason ?? ''),
    reversal_operation_id: row.reversal_operation_id === null ? null : String(row.reversal_operation_id ?? ''),
    edited_by: row.edited_by === null ? null : String(row.edited_by ?? ''),
    edited_at: row.edited_at === null ? null : (row.edited_at instanceof Date ? row.edited_at.toISOString() : String(row.edited_at ?? '')),
  };
}

export class FactoryMovementEventRepository extends BaseRepository {
  constructor(db: RepositoryDbClient) {
    super(db);
  }

  async findByOperationId(operationId: string, forUpdate = false): Promise<FactoryMovementEvent | null> {
    const [rows] = await this.execute<any[]>(
      `SELECT event_id, operation_id, movement_type, occurred_at, recorded_at, actor_user_id, reason_comment, status, reversed_by, reversed_at, reversal_reason, reversal_operation_id, edited_by, edited_at
       FROM factory_movement_events WHERE operation_id = ? LIMIT 1${forUpdate ? ' FOR UPDATE' : ''}`,
      [operationId],
    );
    return rows.length > 0 ? mapEvent(rows[0]) : null;
  }

  async findById(eventId: string, forUpdate = false): Promise<FactoryMovementEvent | null> {
    const [rows] = await this.execute<any[]>(`SELECT event_id, operation_id, movement_type, occurred_at, recorded_at, actor_user_id, reason_comment, status, reversed_by, reversed_at, reversal_reason, reversal_operation_id, edited_by, edited_at FROM factory_movement_events WHERE event_id = ? LIMIT 1${forUpdate ? ' FOR UPDATE' : ''}`, [eventId]);
    return rows.length > 0 ? mapEvent(rows[0]) : null;
  }

  async create(payload: FactoryMovementEvent): Promise<FactoryMovementEvent> {
    await this.execute(
      `INSERT INTO factory_movement_events
       (event_id, operation_id, movement_type, occurred_at, recorded_at, actor_user_id, reason_comment)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [payload.event_id, payload.operation_id, payload.movement_type, payload.occurred_at, payload.recorded_at,
        payload.actor_user_id, payload.reason_comment],
    );
    return payload;
  }
}
