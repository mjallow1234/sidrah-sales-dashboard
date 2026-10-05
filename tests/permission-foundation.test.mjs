import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { ACCESS_CATALOG, roleAllowsAccess } from '../src/lib/authorization.ts';

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('role ceiling is checked before any user override', () => {
  assert.equal(roleAllowsAccess('agent', ACCESS_CATALOG.crmEdit), true);
  assert.equal(roleAllowsAccess('agent', ACCESS_CATALOG.factoryView), false);
  const evaluator = read('src/lib/server/permissionEvaluator.ts');
  assert.match(evaluator, /roleAllowsAccess\(role, permissionKey\)/);
  assert.match(evaluator, /effect === 'deny'/);
  assert.match(evaluator, /outside_role_ceiling/);
});

test('authentication and super-admin behavior remain explicit', () => {
  const evaluator = read('src/lib/server/permissionEvaluator.ts');
  assert.match(evaluator, /unauthenticated/);
  assert.equal(roleAllowsAccess('super_admin', ACCESS_CATALOG.usersAssignPermissions), true);
  assert.match(evaluator, /effect === 'deny'/);
});

test('permission persistence is normalized, unique, and audited', () => {
  const migration = read('db/migrations/0040_create_permission_foundation.sql');
  const repository = read('src/repositories/PermissionRepository.ts');
  const service = read('src/services/permissionService.ts');
  assert.match(migration, /CREATE TABLE IF NOT EXISTS access_permissions/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS user_permission_overrides/);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS permission_audit_log/);
  assert.match(migration, /UNIQUE KEY ux_user_permission_override/);
  assert.match(repository, /ON DUPLICATE KEY UPDATE/);
  assert.match(service, /recordAudit/);
  assert.match(service, /roleAllowsAccess\(target\.role/);
});

test('permission changes cannot be self-managed or used to exceed a role ceiling', () => {
  const service = read('src/services/permissionService.ts');
  assert.match(service, /Users cannot change their own permission overrides/);
  assert.match(service, /outside the target role ceiling/);
  assert.match(service, /targetRole === 'super_admin'/);
});

test('server evaluator keeps domain ownership checks outside the generic capability check', () => {
  const evaluator = read('src/lib/server/permissionEvaluator.ts');
  assert.match(evaluator, /requirePermission/);
  assert.match(evaluator, /getVerifiedSession/);
  assert.match(evaluator, /forbiddenResponse/);
  assert.doesNotMatch(evaluator, /vendor_id|lead_id|delivery_id/);
});

test('CRM status change is a known catalog permission without changing existing validation', () => {
  assert.equal(ACCESS_CATALOG.crmStatusChange, 'crm.status.change');
  assert.equal(roleAllowsAccess('agent', ACCESS_CATALOG.crmStatusChange), true);
  assert.equal(roleAllowsAccess('supervisor', ACCESS_CATALOG.crmStatusChange), true);
  assert.equal(roleAllowsAccess('delivery', ACCESS_CATALOG.crmStatusChange), false);
  assert.equal(roleAllowsAccess('foreman', ACCESS_CATALOG.crmStatusChange), false);
  assert.match(read('db/migrations/0041_add_crm_status_change_permission.sql'), /INSERT IGNORE INTO access_permissions/);
  assert.match(read('db/migrations/0041_add_crm_status_change_permission.sql'), /crm\.status\.change/);
  assert.match(read('src/lib/server/permissionEvaluator.ts'), /isAccessKey\(permissionKey\)/);
});
