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
  };
}

export class FactoryMovementEventRepository extends BaseRepository {
  constructor(db: RepositoryDbClient) {
    super(db);
  }

  async findByOperationId(operationId: string, forUpdate = false): Promise<FactoryMovementEvent | null> {
    const [rows] = await this.execute<any[]>(
      `SELECT event_id, operation_id, movement_type, occurred_at, recorded_at, actor_user_id, reason_comment
       FROM factory_movement_events WHERE operation_id = ? LIMIT 1${forUpdate ? ' FOR UPDATE' : ''}`,
      [operationId],
    );
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
