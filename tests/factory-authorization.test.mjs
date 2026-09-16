import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { canAccessPath, canReverseFactoryRecords, canViewLink, isFactoryRole } from '../src/lib/authorization.ts';

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('foreman can access only factory pages and links', () => {
  assert.equal(canAccessPath('foreman', '/factory'), true);
  assert.equal(canAccessPath('foreman', '/factory/production'), true);
  assert.equal(canViewLink('foreman', '/factory/movements'), true);
  assert.equal(canAccessPath('foreman', '/vendors'), false);
  assert.equal(canAccessPath('foreman', '/dashboard'), false);
  assert.equal(canViewLink('foreman', '/deliveries'), false);
});

test('admin can access all factory pages and links', () => {
  for (const role of ['super_admin', 'admin']) {
    for (const pathname of ['/factory', '/factory/production', '/factory/movements']) {
      assert.equal(canAccessPath(role, pathname), true, `${role} should access ${pathname}`);
    }
    assert.equal(canViewLink(role, '/factory'), true, `${role} should see factory`);
  }
});

test('foreman remains factory-only and other roles remain denied', () => {
  assert.equal(canAccessPath('foreman', '/factory'), true);
  assert.equal(canAccessPath('foreman', '/factory/production'), true);
  assert.equal(canAccessPath('foreman', '/factory/movements'), true);
  assert.equal(canAccessPath('foreman', '/dashboard'), false);
  assert.equal(canAccessPath('foreman', '/vendors'), false);
  assert.equal(canAccessPath('foreman', '/deliveries'), false);
  for (const role of ['supervisor', 'agent', 'delivery']) {
    assert.equal(canAccessPath(role, '/factory'), false, `${role} should not access factory`);
    assert.equal(canViewLink(role, '/factory'), false, `${role} should not see factory`);
  }
});

test('foreman retains factory edit access but cannot reverse Factory records', () => {
  assert.equal(isFactoryRole('foreman'), true);
  assert.equal(canReverseFactoryRecords('foreman'), false);
  assert.equal(canReverseFactoryRecords('admin'), true);
  assert.equal(canReverseFactoryRecords('super_admin'), true);
});

test('Factory reversal routes and detail UI apply the admin-only reverse rule consistently', () => {
  const productReverse = read('src/app/api/factory/movements/reverse/route.ts');
  const containerReverse = read('src/app/api/factory/containers/movements/reverse/route.ts');
  const history = read('src/components/factory/factory-history.tsx');
  const containers = read('src/components/factory/factory-container-section.tsx');
  for (const route of [productReverse, containerReverse]) {
    assert.match(route, /canReverseFactoryRecords\(session\.role\)/);
    assert.match(route, /forbiddenResponse\(\)/);
  }
  assert.match(history, /canReverseFactoryRecords\(auth\.data\?\.role\)/);
  assert.match(containers, /canReverseFactoryRecords\(auth\.data\?\.role\)/);
  assert.match(history, /setEditing\(true\)/);
  assert.match(containers, /setEditing\(true\)/);
});
