import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { ACCESS_CATALOG, roleAllowsAccess } from '../src/lib/authorization.ts';

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('CRM pages and navigation enforce crm.view/create', () => {
  assert.match(read('src/app/crm/leads/page.tsx'), /getPagePermission\('crm\.view'\)/);
  assert.match(read('src/app/crm/leads/new/page.tsx'), /getPagePermission\('crm\.create'\)/);
  assert.match(read('src/app/crm/leads/[leadId]/page.tsx'), /getPagePermission\('crm\.view'\)/);
  assert.match(read('src/components/layout/admin-layout.tsx'), /useEffectivePermissionQuery\('crm\.view'/);
});

test('CRM APIs use the existing permission catalog', () => {
  assert.match(read('src/app/api/crm/leads/route.ts'), /crm\.view/);
  assert.match(read('src/app/api/crm/leads/route.ts'), /crm\.create/);
  assert.match(read('src/app/api/crm/leads/[leadId]/route.ts'), /crm\.view/);
  assert.match(read('src/app/api/crm/leads/[leadId]/route.ts'), /crm\.edit/);
  assert.match(read('src/app/api/crm/leads/[leadId]/route.ts'), /crm\.follow_up\.manage/);
  assert.match(read('src/app/api/crm/leads/[leadId]/route.ts'), /crm\.assign/);
  assert.match(read('src/app/api/crm/leads/[leadId]/route.ts'), /crm\.status\.change/);
  assert.match(read('src/app/api/crm/leads/[leadId]/activities/route.ts'), /crm\.view/);
  assert.match(read('src/app/api/crm/leads/[leadId]/activities/route.ts'), /crm\.follow_up\.manage/);
});

test('CRM role ceiling preserves existing boundaries', () => {
  assert.equal(roleAllowsAccess('agent', ACCESS_CATALOG.crmView), true);
  assert.equal(roleAllowsAccess('agent', ACCESS_CATALOG.crmCreate), true);
  assert.equal(roleAllowsAccess('agent', ACCESS_CATALOG.crmEdit), true);
  assert.equal(roleAllowsAccess('agent', ACCESS_CATALOG.crmAssign), false);
  assert.equal(roleAllowsAccess('delivery', ACCESS_CATALOG.crmView), false);
  assert.equal(roleAllowsAccess('foreman', ACCESS_CATALOG.crmView), false);
  assert.equal(roleAllowsAccess('supervisor', ACCESS_CATALOG.crmView), true);
});

test('CRM ownership remains enforced by the service layer', () => {
  const service = read('src/services/crmLeadService.ts');
  assert.match(service, /lead\.assigned_agent_user_id !== session\.userId/);
  assert.match(service, /session\.role === 'agent'/);
});

test('CRM status-only and mixed updates require crm.status.change independently', () => {
  const route = read('src/app/api/crm/leads/[leadId]/route.ts');
  assert.match(route, /permissions\.add\('crm\.status\.change'\)/);
  assert.match(route, /permissions\.add\('crm\.edit'\)/);
  assert.match(route, /for \(const permission of permissions\)/);
});

test('CRM conversion remains CRM-only', () => {
  const isolation = read('tests/crm-lead-isolation.test.mjs');
  assert.match(isolation, /conversion is status-only|CRM conversion is status-only/i);
  assert.doesNotMatch(read('src/services/crmLeadService.ts'), /createVendor|createDelivery|inventory/i);
});

test('No CRM permission migration was created', () => {
  assert.equal(fs.existsSync(new URL('../db/migrations/0041_crm_permissions.sql', import.meta.url)), false);
});
