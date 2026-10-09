import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('Admin Dashboard aggregates qualifying delivered gallons and explicit return records server-side', () => {
  const fullRepository = read('src/repositories/AdminDashboardRepository.ts');
  const repository = fullRepository.slice(fullRepository.indexOf('private async getOutstandingGallons'), fullRepository.indexOf('private async getFactory'));
  assert.match(repository, /delivery_empty_gallon_returns/);
  assert.match(repository, /completedDeliveryStatus/);
  assert.match(repository, /UPPER\(p\.product_name\) LIKE '%DEYGEH%'/);
  assert.match(repository, /REGEXP_SUBSTR\(p\.unit/);
  assert.match(repository, />= 18/);
  assert.match(repository, /SUM\(item\.quantity\)/);
  assert.match(repository, /SUM\(r\.quantity_received\)/);
  assert.match(repository, /gallonsDelivered - emptyReturned/);
  assert.doesNotMatch(repository, /stock_sold|vendor_inventory/);
});

test('historical vendor attribution uses exact unique phone matches and preserves Unlinked', () => {
  const fullRepository = read('src/repositories/AdminDashboardRepository.ts');
  const repository = fullRepository.slice(fullRepository.indexOf('private async getOutstandingGallons'));
  assert.match(repository, /d0\.vendor_id IS NULL/);
  assert.match(repository, /v0\.phone = d0\.customer_phone/);
  assert.match(repository, /phone_match_count = 1/);
  assert.match(repository, /'Unlinked'/);
  assert.doesNotMatch(repository, /UPDATE deliveries.*vendor_id/);
});

test('Outstanding Gallons is exposed in the existing summary and dashboard UI', () => {
  const types = read('src/lib/types/admin-dashboard.ts');
  const ui = read('src/components/dashboard/admin-control-center.tsx');
  assert.match(types, /AdminDashboardGallonsSummary/);
  assert.match(types, /outstandingGallons/);
  for (const label of ['Outstanding Gallons', 'Total Gallons Delivered', 'Empty Gallons Returned', 'Vendors with Outstanding Gallons']) {
    assert.match(ui, new RegExp(label));
  }
  assert.match(ui, /kind: 'gallons'/);
  assert.match(ui, /gallonRows/);
});

test('return-only deliveries are included independently of qualifying delivered items', () => {
  const repository = read('src/repositories/AdminDashboardRepository.ts');
  const returnedStart = repository.indexOf('returned AS');
  const returnedEnd = repository.indexOf('vendor_totals AS');
  assert.ok(returnedStart >= 0 && returnedEnd > returnedStart);
  const returnedSql = repository.slice(returnedStart, returnedEnd);
  assert.match(returnedSql, /delivery_empty_gallon_returns/);
  assert.doesNotMatch(returnedSql, /JSON_TABLE/);
});
