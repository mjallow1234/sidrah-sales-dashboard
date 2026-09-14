import type { RepositoryDbClient } from './types';
import { BaseRepository } from './BaseRepository';

export class FactoryRecordRevisionRepository extends BaseRepository {
  async create(payload: {
    revision_id: string; record_type: 'movement_event' | 'container_movement'; event_id?: string | null;
    movement_id?: string | null; action_type: 'edit' | 'reverse'; actor_user_id: string;
    recorded_at: string; reason_comment?: string | null; operation_id?: string | null;
    before_snapshot: unknown; after_snapshot: unknown;
  }): Promise<void> {
    await this.execute(
      `INSERT INTO factory_record_revisions
       (revision_id, record_type, event_id, movement_id, action_type, actor_user_id, recorded_at, reason_comment, operation_id, before_snapshot, after_snapshot)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [payload.revision_id, payload.record_type, payload.event_id ?? null, payload.movement_id ?? null,
        payload.action_type, payload.actor_user_id, payload.recorded_at, payload.reason_comment ?? null,
        payload.operation_id ?? null, JSON.stringify(payload.before_snapshot), JSON.stringify(payload.after_snapshot)],
    );
  }

  async findForRecord(recordType: 'movement_event' | 'container_movement', recordId: string): Promise<any[]> {
    const column = recordType === 'movement_event' ? 'event_id' : 'movement_id';
    const [rows] = await this.execute<any[]>(`SELECT r.*, u.name AS actor_name FROM factory_record_revisions r INNER JOIN app_users u ON u.user_id = r.actor_user_id WHERE r.record_type = ? AND r.${column} = ? ORDER BY r.recorded_at DESC, r.revision_id DESC`, [recordType, recordId]);
    return rows.map((row) => ({ revision_id: String(row.revision_id), record_type: row.record_type, action_type: row.action_type, actor_name: row.actor_name ? String(row.actor_name) : 'User unavailable', recorded_at: row.recorded_at instanceof Date ? row.recorded_at.toISOString() : String(row.recorded_at), reason_comment: row.reason_comment ? String(row.reason_comment) : null, before_snapshot: row.before_snapshot, after_snapshot: row.after_snapshot }));
  }
}
