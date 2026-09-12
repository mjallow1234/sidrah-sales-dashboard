import test from 'node:test';
import assert from 'node:assert/strict';
import { canAccessPath, canViewLink } from '../src/lib/authorization.ts';

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
