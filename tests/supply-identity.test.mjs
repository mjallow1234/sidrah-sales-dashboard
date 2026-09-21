import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('supply API derives registrar identity from the authenticated session', () => {
  const route = read('src/app/api/supply/route.ts');
  assert.match(route, /actor_user_id: _clientActorUserId/);
  assert.match(route, /created_by: _clientCreatedBy/);
  assert.match(route, /actor_user_id: session\.userId/);
  assert.match(route, /actor_role: session\.role/);
});

test('supply service persists the authenticated actor separately from sales representative assignment', () => {
  const service = read('src/services/supplyService.ts');
  assert.match(service, /actor_user_id\?: string/);
  assert.match(service, /created_by: payload\.actor_user_id/);
  assert.match(service, /updated_by: payload\.actor_user_id/);
  assert.match(service, /const actor = payload\.actor_user_id/);
  assert.doesNotMatch(service, /created_by: payload\.sales_rep_id/);
});

test('client identity fields cannot override the authenticated supply actor', () => {
  const route = read('src/app/api/supply/route.ts');
  assert.match(route, /actor_user_id: _clientActorUserId/);
  assert.match(route, /created_by: _clientCreatedBy/);
  assert.match(route, /\.\.\.clientPayload/);
});

test('selected sales representative remains a separate supply field', () => {
  const service = read('src/services/supplyService.ts');
  assert.match(service, /sales_rep_id: salesRepId \?\? null/);
  assert.match(service, /actor_sales_rep_id\?: string/);
  assert.doesNotMatch(service, /created_by: salesRepId/);
});

test('normal visit identity path remains session-bound', () => {
  const route = read('src/app/api/visit/route.ts');
  const service = read('src/services/visitService.ts');
  assert.match(route, /actor_user_id: session\.userId/);
  assert.match(service, /created_by: payload\.actor_user_id/);
});
