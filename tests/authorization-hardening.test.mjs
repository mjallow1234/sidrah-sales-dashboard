import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { ACCESS_CATALOG, ROLE_CEILING, canAccessPath, roleAllowsAccess } from '../src/lib/authorization.ts';

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('the role ceiling is explicit without granting specialized roles new access', () => {
  assert.equal(roleAllowsAccess('super_admin', ACCESS_CATALOG.usersEdit), true);
  assert.equal(roleAllowsAccess('admin', ACCESS_CATALOG.usersEdit), true);
  assert.equal(roleAllowsAccess('supervisor', ACCESS_CATALOG.usersEdit), false);
  assert.equal(roleAllowsAccess('agent', ACCESS_CATALOG.accountabilityView), false);
  assert.equal(roleAllowsAccess('delivery', ACCESS_CATALOG.vendorsView), false);
  assert.equal(roleAllowsAccess('foreman', ACCESS_CATALOG.factoryView), true);
  assert.equal(roleAllowsAccess('foreman', ACCESS_CATALOG.dashboardView), false);
  assert.ok(ROLE_CEILING.super_admin.includes(ACCESS_CATALOG.formsPublish));
});

test('protected page families preserve their current role boundaries', () => {
  assert.equal(canAccessPath('admin', '/users'), true);
  assert.equal(canAccessPath('supervisor', '/users'), false);
  assert.equal(canAccessPath('admin', '/outlets'), true);
  assert.equal(canAccessPath('supervisor', '/outlets'), false);
  assert.equal(canAccessPath('supervisor', '/accountability'), true);
  assert.equal(canAccessPath('agent', '/accountability'), false);
  assert.equal(canAccessPath('foreman', '/factory'), true);
  assert.equal(canAccessPath('foreman', '/dashboard'), false);
  assert.equal(canAccessPath('delivery', '/deliveries'), true);
  assert.equal(canAccessPath('delivery', '/crm/leads'), false);
});

test('user-management routes enforce authorization independently of navigation', () => {
  const createRoute = read('src/app/api/users/route.ts');
  const detailRoute = read('src/app/api/users/[id]/route.ts');
  for (const route of [createRoute, detailRoute]) {
    assert.match(route, /getVerifiedSession/);
    assert.match(route, /isAdminRole\(session\.role\)/);
    assert.match(route, /unauthorizedResponse/);
    assert.match(route, /forbiddenResponse/);
  }
});

test('app-user lookup routes retain explicit authenticated management/ownership checks', () => {
  const collectionRoute = read('src/app/api/appusers/route.ts');
  const detailRoute = read('src/app/api/appusers/[id]/route.ts');
  for (const route of [collectionRoute, detailRoute]) {
    assert.match(route, /getVerifiedSession/);
    assert.match(route, /isAdminOrSupervisorRole/);
    assert.match(route, /forbiddenResponse/);
  }
});

test('middleware matches outlets and accountability page families', () => {
  const middleware = read('src/middleware.ts');
  assert.match(middleware, /'\/outlets\/:path\*'/);
  assert.match(middleware, /'\/accountability\/:path\*'/);
});
