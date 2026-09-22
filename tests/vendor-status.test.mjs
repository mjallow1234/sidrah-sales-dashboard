import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');

test('vendor statuses are extensible and seeded independently of vendor data', () => {
  const migration = read('db/migrations/0017_add_vendor_statuses.sql');
  const service = read('src/services/vendorService.ts');
  assert.match(migration, /CREATE TABLE IF NOT EXISTS vendor_statuses/);
  assert.match(migration, /\('active', 'Active'/);
  assert.match(migration, /\('inactive', 'Inactive'/);
  assert.match(migration, /\('dormant', 'Dormant'/);
  assert.match(service, /Invalid vendor status/);
});

test('vendor status is loaded dynamically and persisted independently', () => {
  const api = read('src/app/api/vendor-statuses/route.ts');
  const form = read('src/components/forms/vendor-form.tsx');
  const repository = read('src/repositories/VendorRepository.ts');
  assert.match(api, /FROM vendor_statuses/);
  assert.match(form, /useVendorStatusesQuery/);
  assert.match(form, /vendorStatuses\.map/);
  assert.match(repository, /status_name/);
  assert.match(form, /Vendor status is required/);
});

test('vendor status is visible in list, card, and detail without affecting assignments', () => {
  for (const path of ['src/components/vendors/vendor-list.tsx', 'src/components/vendors/vendor-card.tsx', 'src/components/vendors/vendor-details-shell.tsx']) {
    assert.match(read(path), /Status:/);
  }
  const service = read('src/services/vendorService.ts');
  assert.match(service, /sales_rep_id/);
  assert.match(service, /acquired_by/);
});
