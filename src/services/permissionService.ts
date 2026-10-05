import { randomUUID } from 'crypto';
import { getPool, transaction } from '@/lib/db';
import { isAdminRole, isAccessKey, roleAllowsAccess, type AccessKey, type AppUserRole } from '@/lib/authorization';
import { AppUserRepository } from '@/repositories/AppUserRepository';
import { PermissionRepository, type PermissionCatalogEntry, type PermissionEffect, type PermissionOverride } from '@/repositories/PermissionRepository';

const id = (prefix: string) => `${prefix}_${randomUUID().replace(/-/g, '').slice(0, 20)}`;
const now = () => new Date().toISOString().slice(0, 19).replace('T', ' ');

export class PermissionServiceError extends Error {
  readonly statusCode: number;

  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = 'PermissionServiceError';
    this.statusCode = statusCode;
  }
}

function assertPermissionKey(permissionKey: string): asserts permissionKey is AccessKey {
  if (!isAccessKey(permissionKey)) throw new PermissionServiceError('Unknown permission key.', 400);
}

function assertCanManage(actorUserId: string, actorRole: string | undefined, targetRole: AppUserRole, targetUserId: string): void {
  if (!isAdminRole(actorRole)) throw new PermissionServiceError('Only administrators can manage permission overrides.', 403);
  if (actorUserId === targetUserId) throw new PermissionServiceError('Users cannot change their own permission overrides.', 403);
  if (targetRole === 'super_admin' && actorRole !== 'super_admin') throw new PermissionServiceError('Only a Super Admin can manage a Super Admin account.', 403);
}

export interface PermissionChangeInput {
  actorUserId: string;
  actorRole?: string;
  targetUserId: string;
  permissionKey: string;
  effect: PermissionEffect;
  reason?: string | null;
}

export async function setPermissionOverride(input: PermissionChangeInput): Promise<PermissionOverride> {
  assertPermissionKey(input.permissionKey);
  const permissionKey = input.permissionKey;
  if (input.effect !== 'allow' && input.effect !== 'deny') throw new PermissionServiceError('Invalid permission effect.', 400);

  return transaction(async connection => {
    const users = new AppUserRepository(connection);
    const target = await users.findById(input.targetUserId);
    assertCanManage(input.actorUserId, input.actorRole, target.role, input.targetUserId);
    if (!roleAllowsAccess(target.role, permissionKey)) {
      throw new PermissionServiceError('The requested permission is outside the target role ceiling.', 403);
    }

    const repository = new PermissionRepository(connection);
    const previous = await repository.findOverride(input.targetUserId, permissionKey);
    const timestamp = now();
    const reason = input.reason == null ? null : String(input.reason).trim() || null;

    if (previous?.effect === input.effect) return previous;

    const override = await repository.upsertOverride({
      override_id: previous?.override_id ?? id('PO'),
      user_id: input.targetUserId,
      permission_key: permissionKey,
      effect: input.effect,
      changed_by: input.actorUserId,
      reason,
      created_at: previous?.created_at ?? timestamp,
      updated_at: timestamp,
    });
    await repository.recordAudit({
      audit_id: id('PA'),
      affected_user_id: input.targetUserId,
      actor_user_id: input.actorUserId,
      permission_key: permissionKey,
      previous_effect: previous?.effect ?? null,
      new_effect: input.effect,
      reason,
      created_at: timestamp,
    });
    return override;
  });
}

export async function clearPermissionOverride(input: Omit<PermissionChangeInput, 'effect'>): Promise<void> {
  assertPermissionKey(input.permissionKey);
  const permissionKey = input.permissionKey;
  return transaction(async connection => {
    const users = new AppUserRepository(connection);
    const target = await users.findById(input.targetUserId);
    assertCanManage(input.actorUserId, input.actorRole, target.role, input.targetUserId);
    const repository = new PermissionRepository(connection);
    const previous = await repository.findOverride(input.targetUserId, permissionKey);
    if (!previous) return;
    const timestamp = now();
    await repository.deleteOverride(input.targetUserId, permissionKey);
    await repository.recordAudit({
      audit_id: id('PA'),
      affected_user_id: input.targetUserId,
      actor_user_id: input.actorUserId,
      permission_key: permissionKey,
      previous_effect: previous.effect,
      new_effect: null,
      reason: input.reason == null ? null : String(input.reason).trim() || null,
      created_at: timestamp,
    });
  });
}

export interface PermissionViewEntry extends PermissionCatalogEntry {
  available: boolean;
  effect: PermissionEffect | null;
  enabled: boolean;
}

export async function listPermissionCatalog(): Promise<PermissionCatalogEntry[]> {
  return new PermissionRepository(getPool()).listCatalog();
}

export async function hasEffectivePermission(userId: string, role: string | undefined, permissionKey: string): Promise<boolean> {
  if (!userId || !isAccessKey(permissionKey) || !roleAllowsAccess(role, permissionKey)) return false;
  const override = await new PermissionRepository(getPool()).findOverride(userId, permissionKey);
  return override?.effect !== 'deny';
}

export async function getUserPermissionView(actorUserId: string, actorRole: string | undefined, targetUserId: string): Promise<{ role: AppUserRole; permissions: PermissionViewEntry[] }> {
  const users = new AppUserRepository(getPool());
  const target = await users.findById(targetUserId);
  assertCanManage(actorUserId, actorRole, target.role, targetUserId);
  const repository = new PermissionRepository(getPool());
  const [catalog, overrides] = await Promise.all([repository.listCatalog(), repository.listOverrides(targetUserId)]);
  const byKey = new Map(overrides.map(item => [item.permission_key, item.effect]));
  return {
    role: target.role,
    permissions: catalog.map(item => {
      const available = roleAllowsAccess(target.role, item.permission_key as AccessKey);
      const effect = byKey.get(item.permission_key) ?? null;
      return { ...item, available, effect, enabled: available && effect !== 'deny' };
    }),
  };
}

export interface ReplacePermissionOverridesInput {
  actorUserId: string;
  actorRole?: string;
  targetUserId: string;
  overrides: Array<{ permission_key: string; effect: PermissionEffect; reason?: string | null }>;
}

export async function replacePermissionOverrides(input: ReplacePermissionOverridesInput): Promise<PermissionOverride[]> {
  const requested = new Map<string, { effect: PermissionEffect; reason: string | null }>();
  for (const item of input.overrides) {
    assertPermissionKey(item.permission_key);
    if (item.effect !== 'allow' && item.effect !== 'deny') throw new PermissionServiceError('Invalid permission effect.', 400);
    if (requested.has(item.permission_key)) throw new PermissionServiceError('Duplicate permission override.', 400);
    requested.set(item.permission_key, { effect: item.effect, reason: item.reason == null ? null : String(item.reason).trim() || null });
  }

  return transaction(async connection => {
    const users = new AppUserRepository(connection);
    const target = await users.findById(input.targetUserId);
    assertCanManage(input.actorUserId, input.actorRole, target.role, input.targetUserId);
    for (const permissionKey of requested.keys()) {
      if (!roleAllowsAccess(target.role, permissionKey as AccessKey)) {
        throw new PermissionServiceError('The requested permission is outside the target role ceiling.', 403);
      }
    }

    const repository = new PermissionRepository(connection);
    const existing = await repository.listOverrides(input.targetUserId);
    const existingByKey = new Map(existing.map(item => [item.permission_key, item]));
    const timestamp = now();

    for (const previous of existing) {
      const next = requested.get(previous.permission_key);
      if (!next || !roleAllowsAccess(target.role, previous.permission_key as AccessKey)) {
        await repository.deleteOverride(input.targetUserId, previous.permission_key);
        await repository.recordAudit({
          audit_id: id('PA'), affected_user_id: input.targetUserId, actor_user_id: input.actorUserId,
          permission_key: previous.permission_key, previous_effect: previous.effect, new_effect: null,
          reason: next?.reason ?? null, created_at: timestamp,
        });
      }
    }

    for (const [permissionKey, next] of requested) {
      const previous = existingByKey.get(permissionKey);
      if (previous?.effect === next.effect) continue;
      await repository.upsertOverride({
        override_id: previous?.override_id ?? id('PO'), user_id: input.targetUserId, permission_key: permissionKey,
        effect: next.effect, changed_by: input.actorUserId, reason: next.reason,
        created_at: previous?.created_at ?? timestamp, updated_at: timestamp,
      });
      await repository.recordAudit({
        audit_id: id('PA'), affected_user_id: input.targetUserId, actor_user_id: input.actorUserId,
        permission_key: permissionKey, previous_effect: previous?.effect ?? null, new_effect: next.effect,
        reason: next.reason, created_at: timestamp,
      });
    }

    return repository.listOverrides(input.targetUserId);
  });
}
