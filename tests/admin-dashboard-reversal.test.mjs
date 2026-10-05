import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('Sales Representative Activity renders active and reversed visit states', () => {
  const ui = read('src/components/dashboard/admin-control-center.tsx');
  assert.match(ui, /TransactionDetailRows/);
  assert.match(ui, /reversed \? 'Reversed' : 'Active'/);
  assert.match(ui, /row\.is_reversed/);
});

test('reversed activity rows show existing reversal metadata', () => {
  const ui = read('src/components/dashboard/admin-control-center.tsx');
  assert.match(ui, /Reversed by:/);
  assert.match(ui, /row\.reversed_by_name/);
  assert.match(ui, /Reversal timestamp:/);
  assert.match(ui, /row\.reversed_at/);
  assert.match(ui, /Reversal reason:/);
  assert.match(ui, /row\.reversal_reason/);
});

test('dashboard aggregate queries continue excluding reversed visits', () => {
  const repository = read('src/repositories/AdminDashboardRepository.ts');
  assert.match(repository, /COALESCE\(vl\.is_reversed, 0\) = 0/);
});

test('transactions API continues returning reversal fields', () => {
  const route = read('src/app/api/transactions/route.ts');
  assert.match(route, /is_reversed:/);
  assert.match(route, /reversed_at:/);
  assert.match(route, /reversed_by_name:/);
  assert.match(route, /reversal_reason:/);
});
