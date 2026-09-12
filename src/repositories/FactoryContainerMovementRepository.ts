import type { FactoryContainerMovement, FactoryContainerMovementType, FactoryContainerType } from '@/lib/types';
import type { RepositoryDbClient } from './types';
import { BaseRepository } from './BaseRepository';

function mapMovement(row: any): FactoryContainerMovement {
  return {
    movement_id: String(row.movement_id), operation_id: String(row.operation_id),
    container_type: row.container_type as FactoryContainerType,
    movement_type: row.movement_type as FactoryContainerMovementType, quantity: Number(row.quantity),
    occurred_at: row.occurred_at instanceof Date ? row.occurred_at.toISOString() : String(row.occurred_at ?? ''),
    recorded_at: row.recorded_at instanceof Date ? row.recorded_at.toISOString() : String(row.recorded_at ?? ''),
    actor_user_id: String(row.actor_user_id), actor_name: row.actor_name === null ? undefined : String(row.actor_name ?? ''),
    reason_comment: row.reason_comment === null ? null : String(row.reason_comment ?? ''),
  };
}

const movementSelect = `SELECT m.*, u.name AS actor_name
  FROM factory_container_movements m INNER JOIN app_users u ON u.user_id = m.actor_user_id`;

export class FactoryContainerMovementRepository extends BaseRepository {
  async findByOperationId(operationId: string, forUpdate = false): Promise<FactoryContainerMovement | null> {
    const [rows] = await this.execute<any[]>(`${movementSelect} WHERE m.operation_id = ? LIMIT 1${forUpdate ? ' FOR UPDATE' : ''}`, [operationId]);
    return rows.length > 0 ? mapMovement(rows[0]) : null;
  }

  async findAll(limit = 100): Promise<FactoryContainerMovement[]> {
    const safeLimit = Math.max(1, Math.min(500, Math.trunc(limit)));
    const [rows] = await this.execute<any[]>(`${movementSelect} ORDER BY m.recorded_at DESC, m.movement_id DESC LIMIT ${safeLimit}`);
    return rows.map(mapMovement);
  }

  async create(payload: Omit<FactoryContainerMovement, 'actor_name'>): Promise<FactoryContainerMovement> {
    await this.execute(
      `INSERT INTO factory_container_movements
       (movement_id, operation_id, container_type, movement_type, quantity, occurred_at, recorded_at, actor_user_id, reason_comment)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [payload.movement_id, payload.operation_id, payload.container_type, payload.movement_type, payload.quantity,
        payload.occurred_at, payload.recorded_at, payload.actor_user_id, payload.reason_comment ?? null],
    );
    return (await this.findByOperationId(payload.operation_id)) as FactoryContainerMovement;
  }
}
