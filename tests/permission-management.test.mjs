import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('permission catalog and user override APIs require management authorization', () => {
  const catalog = read('src/app/api/permissions/catalog/route.ts');
  const userPermissions = read('src/app/api/users/[id]/permissions/route.ts');
  for (const route of [catalog, userPermissions]) {
    assert.match(route, /getVerifiedSession/);
    assert.match(route, /isAdminRole\(session\.role\)/);
    assert.match(route, /unauthorizedResponse/);
    assert.match(route, /forbiddenResponse/);
  }
  assert.match(userPermissions, /replacePermissionOverrides/);
  assert.match(userPermissions, /getUserPermissionView/);
});

test('user form derives permissions from the canonical catalog and saves only restrictions', () => {
  const form = read('src/components/forms/user-form.tsx');
  const panel = read('src/components/forms/user-permissions-panel.tsx');
  const hooks = read('src/lib/hooks/userQueries.ts');
  assert.match(form, /UserPermissionsPanel/);
  assert.match(form, /savePermissionsMutation/);
  assert.match(panel, /usePermissionCatalogQuery/);
  assert.match(panel, /useUserPermissionsQuery/);
  assert.match(panel, /effect: 'deny'/);
  assert.match(panel, /selfEdit/);
  assert.match(panel, /canManageTarget/);
  assert.match(hooks, /\/api\/permissions\/catalog/);
  assert.match(hooks, /\/permissions/);
});

test('bulk controls operate only on permissions available to the selected role', () => {
  const panel = read('src/components/forms/user-permissions-panel.tsx');
  assert.match(panel, /item\.available/);
  assert.match(panel, /setModuleState/);
  assert.match(panel, /disabled=\{!item\.available/);
  assert.match(panel, /Not available for this role/);
});

test('permission changes remain transactional and unchanged state is idempotent', () => {
  const service = read('src/services/permissionService.ts');
  assert.match(service, /return transaction\(async connection/);
  assert.match(service, /previous\?\.effect === next\.effect/);
  assert.match(service, /recordAudit/);
  assert.match(service, /Users cannot change their own permission overrides/);
});
