import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('cash audit includes historical records using the recording-date fallback', () => {
  const route = read('src/app/api/transactions/route.ts');
  assert.match(route, /COALESCE\(vl\.cash_collection_date, DATE\(vl\.timestamp\)\).*:startDate/);
  assert.match(route, /COALESCE\(vl\.cash_collection_date, DATE\(vl\.timestamp\)\).*:endDate/);
  assert.match(route, /COALESCE\(vl\.cash_collection_date, DATE\(vl\.timestamp\)\) DESC, vl\.timestamp DESC/);
  assert.match(route, /cash_collection_date_is_fallback/);
});

test('explicit collection dates remain authoritative and historical values remain nullable', () => {
  const route = read('src/app/api/transactions/route.ts');
  const types = read('src/lib/types/index.ts');
  assert.match(route, /cash_collection_date: row\.cash_collection_date === null \? undefined/);
  assert.match(route, /effective_cash_collection_date/);
  assert.match(types, /cash_collection_date\?: string \| null/);
});

test('cash drill-down distinguishes fallback dates from recording timestamps', () => {
  const dashboard = read('src/components/dashboard/admin-control-center.tsx');
  const table = read('src/components/vendors/transaction-table.tsx');
  assert.match(dashboard, /recording-date fallback/);
  assert.match(dashboard, /Recorded at:/);
  assert.match(table, /effective_cash_collection_date/);
  assert.match(table, /Recorded timestamp/);
});
