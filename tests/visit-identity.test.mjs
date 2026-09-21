import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('visit API owns the recorded-by identity and strips client identity fields', () => {
  const route = read('src/app/api/visit/route.ts');
  assert.match(route, /created_by: _clientCreatedBy/);
  assert.match(route, /actor_user_id: _clientActorUserId/);
  assert.match(route, /actor_user_id: session\.userId/);
  assert.match(route, /actor_role: session\.role/);
});

test('visit service persists the authenticated actor separately from sales representative assignment', () => {
  const service = read('src/services/visitService.ts');
  assert.match(service, /const salesRepIdValue = typeof payload\.sales_rep_id === 'string'/);
  assert.match(service, /created_by: payload\.actor_user_id/);
  assert.match(service, /updated_by: payload\.actor_user_id/);
  assert.doesNotMatch(service, /created_by: payload\.sales_rep_id/);
});

test('non-agent visit form requires an explicit representative instead of defaulting the first one', () => {
  const form = read('src/components/forms/visit-form.tsx');
  assert.match(form, /Sales Representative/);
  assert.match(form, /Select sales representative/);
  assert.doesNotMatch(form, /setVisitDraft\(\{ sales_rep_id: salesReps\[0\]\.sales_rep_id \}\)/);
  assert.match(form, /authData\.role === 'agent'/);
});

test('transaction API and client preserve actor and sales representative fields separately', () => {
  const route = read('src/app/api/transactions/route.ts');
  const api = read('src/lib/api/transactions.ts');
  assert.match(route, /actor_name/);
  assert.match(route, /sales_rep_name/);
  assert.match(api, /actor: log\.actor/);
  assert.match(api, /sales_rep_name: log\.sales_rep_name/);
});

test('transaction UI labels authenticated actor and sales representative independently', () => {
  const table = read('src/components/vendors/transaction-table.tsx');
  assert.match(table, /const actor = transaction\.actor/);
  assert.match(table, /Recorded By/);
  assert.match(table, /Sales Representative/);
  assert.doesNotMatch(table, /const actor = transaction\.sales_rep_name/);
});

test('agent visit behavior remains session-bound', () => {
  const route = read('src/app/api/visit/route.ts');
  const form = read('src/components/forms/visit-form.tsx');
  assert.match(route, /isAgentRole\(session\.role\)/);
  assert.match(route, /payload\.sales_rep_id !== session\.sales_rep_id/);
  assert.match(form, /salesRepIdToSubmit = authData\?\.valid && authData\.role === 'agent'/);
  assert.match(form, /authData\.sales_rep_id/);
});
