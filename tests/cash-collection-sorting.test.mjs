import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('cash audit queries use collection date filters and newest-first ordering', () => {
  const route = read('src/app/api/transactions/route.ts');
  assert.match(route, /dateBasis.*cash_collection/);
  assert.match(route, /vl\.cash_collection_date.*:startDate/);
  assert.match(route, /vl\.cash_collection_date.*:endDate/);
  assert.match(route, /CASE WHEN vl\.cash_collection_date IS NULL THEN 1 ELSE 0 END/);
  assert.match(route, /vl\.cash_collection_date DESC, vl\.timestamp DESC/);
  assert.match(route, /vl\.date DESC, vl\.timestamp DESC/);
});

test('cash dashboard drill-down opts into collection-date semantics', () => {
  const dashboard = read('src/components/dashboard/admin-control-center.tsx');
  assert.match(dashboard, /dateBasis: spec\.transactionMetric === 'cash' \? 'cash_collection'/);
  assert.match(dashboard, /Collection date:/);
  assert.match(dashboard, /Recorded at:/);
});

test('cash collection API supports an explicit date basis without changing the client contract', () => {
  const client = read('src/lib/api/transactions.ts');
  const hooks = read('src/lib/hooks/queries.ts');
  assert.match(client, /dateBasis\?: 'visit' \| 'cash_collection'/);
  assert.match(hooks, /dateBasis\?: 'visit' \| 'cash_collection'/);
});

test('historical cash records remain distinguishable when collection date is null', () => {
  const table = read('src/components/vendors/transaction-table.tsx');
  assert.match(table, /Cash collection date/);
  assert.match(table, /Visit Date/);
  assert.match(table, /Collection Date/);
  assert.match(table, /cash_collection_date \?\? undefined/);
  assert.match(table, /Recorded timestamp/);
});
