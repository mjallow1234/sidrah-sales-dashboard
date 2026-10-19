import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('server restricts only agent cash dates older than yesterday', () => {
  const service = read('src/services/visitService.ts');
  assert.match(service, /cashCollectionDate && isAgentRole\(payload\.actor_role\)/);
  assert.match(service, /cashCollectionDate < getUtcDateOffset\(now, -1\)/);
  assert.match(service, /Agents may only record cash collected today or yesterday/);
  assert.match(service, /const cashCollectionDate = cashCollected > 0/);
});

test('agent UI bounds the date picker to UTC yesterday through today', () => {
  const form = read('src/components/forms/visit-form.tsx');
  assert.match(form, /const isAgent = authData\?\.valid && authData\.role === 'agent'/);
  assert.match(form, /min=\{agentCashDateMin\}/);
  assert.match(form, /max=\{agentCashDateMax\}/);
  assert.match(form, /getUtcDateOffset\(-1\)/);
  assert.match(form, /getUtcDateOffset\(0\)/);
});

test('authenticated session identity and sales-rep ownership remain server enforced', () => {
  const route = read('src/app/api/visit/route.ts');
  assert.match(route, /actor_role: session\.role/);
  assert.match(route, /actor_user_id: session\.userId/);
  assert.match(route, /payload\.sales_rep_id !== session\.sales_rep_id/);
  assert.match(route, /_clientActorRole/);
});

test('zero cash and omitted dates preserve existing behavior', () => {
  const service = read('src/services/visitService.ts');
  assert.match(service, /cashCollected > 0\s*\?\s*validateDateOnly\(payload\.cash_collection_date \?\? nowDate/);
  assert.match(service, /: null/);
});
