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

test('existing roles do not inherit foreman-only factory pages', () => {
  for (const role of ['super_admin', 'admin', 'supervisor', 'agent', 'delivery']) {
    assert.equal(canAccessPath(role, '/factory'), false, `${role} should not access factory`);
  }
});
