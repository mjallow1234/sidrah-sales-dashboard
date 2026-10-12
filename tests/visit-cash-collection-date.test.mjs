import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('visit form captures a separate actual cash collection date', () => {
  const form = read('src/components/forms/visit-form.tsx');
  assert.match(form, /Date Cash Was Collected/);
  assert.match(form, /type="date"/);
  assert.match(form, /cash_collection_date/);
  assert.match(form, /cash_collected > 0/);
});

test('visit persistence keeps the recording timestamp and cash collection date separate', () => {
  const service = read('src/services/visitService.ts');
  const repository = read('src/repositories/VisitRepository.ts');
  assert.match(service, /const nowDateTime = getDateTimeString\(now\)/);
  assert.match(service, /cashCollectionDate/);
  assert.match(repository, /cash_collection_date/);
  assert.match(repository, /timestamp/);
});

test('zero cash does not persist a misleading collection date and old rows remain nullable', () => {
  const service = read('src/services/visitService.ts');
  const migration = read('db/migrations/0044_add_visit_cash_collection_date.sql');
  assert.match(service, /cashCollected > 0/);
  assert.match(service, /: null/);
  assert.match(migration, /cash_collection_date DATE NULL/);
});

test('cash transaction history exposes the explicit collection date without changing visit date', () => {
  const route = read('src/app/api/transactions/route.ts');
  const client = read('src/lib/api/transactions.ts');
  const table = read('src/components/vendors/transaction-table.tsx');
  assert.match(route, /cash_collection_date/);
  assert.match(route, /date: formatDateValue\(row\.date\)/);
  assert.match(client, /cash_collection_date: log\.cash_collection_date/);
  assert.match(table, /Cash collection date/);
});
