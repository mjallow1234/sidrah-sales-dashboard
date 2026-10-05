import type { RepositoryDbClient } from './types';
import { BaseRepository } from './BaseRepository';

export type PermissionEffect = 'allow' | 'deny';

export interface PermissionOverride {
  override_id: string;
  user_id: string;
  permission_key: string;
  effect: PermissionEffect;
  changed_by: string;
  reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface PermissionOverrideInput {
  override_id: string;
  user_id: string;
  permission_key: string;
  effect: PermissionEffect;
  changed_by: string;
  reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface PermissionAuditInput {
  audit_id: string;
  affected_user_id: string;
  actor_user_id: string;
  permission_key: string;
  previous_effect: PermissionEffect | null;
  new_effect: PermissionEffect | null;
  reason: string | null;
  created_at: string;
}

export interface PermissionCatalogEntry {
  permission_key: string;
  module: string;
  section: string | null;
  action: string;
  display_name: string;
  description: string | null;
  active: boolean;
}

function mapOverride(row: Record<string, unknown>): PermissionOverride {
  return {
    override_id: String(row.override_id),
    user_id: String(row.user_id),
    permission_key: String(row.permission_key),
    effect: String(row.effect) as PermissionEffect,
    changed_by: String(row.changed_by),
    reason: row.reason == null ? null : String(row.reason),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

export class PermissionRepository extends BaseRepository {
  async listCatalog(): Promise<PermissionCatalogEntry[]> {
    const [rows] = await this.execute<Record<string, unknown>[]>(
      'SELECT permission_key, module, section, action, display_name, description, active FROM access_permissions WHERE active = 1 ORDER BY module ASC, section ASC, display_name ASC',
    );
    return rows.map(row => ({
      permission_key: String(row.permission_key),
      module: String(row.module),
      section: row.section == null ? null : String(row.section),
      action: String(row.action),
      display_name: String(row.display_name),
      description: row.description == null ? null : String(row.description),
      active: Boolean(row.active),
    }));
  }

  async listOverrides(userId: string): Promise<PermissionOverride[]> {
    const [rows] = await this.execute<Record<string, unknown>[]>(
      'SELECT * FROM user_permission_overrides WHERE user_id = :user_id ORDER BY permission_key ASC',
      { user_id: userId },
    );
    return rows.map(mapOverride);
  }

  async findOverride(userId: string, permissionKey: string): Promise<PermissionOverride | null> {
    const [rows] = await this.execute<Record<string, unknown>[]>(
      'SELECT * FROM user_permission_overrides WHERE user_id = :user_id AND permission_key = :permission_key LIMIT 1',
      { user_id: userId, permission_key: permissionKey },
    );
    return rows.length ? mapOverride(rows[0]) : null;
  }

  async upsertOverride(input: PermissionOverrideInput): Promise<PermissionOverride> {
    await this.execute(
      `INSERT INTO user_permission_overrides
        (override_id, user_id, permission_key, effect, changed_by, reason, created_at, updated_at)
       VALUES (:override_id, :user_id, :permission_key, :effect, :changed_by, :reason, :created_at, :updated_at)
       ON DUPLICATE KEY UPDATE effect = VALUES(effect), changed_by = VALUES(changed_by), reason = VALUES(reason), updated_at = VALUES(updated_at)`,
      {
        override_id: input.override_id,
        user_id: input.user_id,
        permission_key: input.permission_key,
        effect: input.effect,
        changed_by: input.changed_by,
        reason: input.reason ?? null,
        created_at: input.created_at,
        updated_at: input.updated_at,
      },
    );
    const result = await this.findOverride(input.user_id, input.permission_key);
    if (!result) throw new Error('Permission override was not persisted.');
    return result;
  }

  async deleteOverride(userId: string, permissionKey: string): Promise<void> {
    await this.execute(
      'DELETE FROM user_permission_overrides WHERE user_id = :user_id AND permission_key = :permission_key',
      { user_id: userId, permission_key: permissionKey },
    );
  }

  async recordAudit(input: PermissionAuditInput): Promise<void> {
    await this.execute(
      `INSERT INTO permission_audit_log
        (audit_id, affected_user_id, actor_user_id, permission_key, previous_effect, new_effect, reason, created_at)
       VALUES (:audit_id, :affected_user_id, :actor_user_id, :permission_key, :previous_effect, :new_effect, :reason, :created_at)`,
      {
        audit_id: input.audit_id,
        affected_user_id: input.affected_user_id,
        actor_user_id: input.actor_user_id,
        permission_key: input.permission_key,
        previous_effect: input.previous_effect,
        new_effect: input.new_effect,
        reason: input.reason ?? null,
        created_at: input.created_at,
      },
    );
  }
}
