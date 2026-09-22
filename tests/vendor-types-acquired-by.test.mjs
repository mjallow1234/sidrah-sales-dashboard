import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');

test('vendor types are normalized, seeded, and linked without changing legacy vendors', () => {
  const migration = read('db/migrations/0015_add_vendor_types_and_acquired_by_agents.sql');
  const service = read('src/services/vendorService.ts');
  const repository = read('src/repositories/VendorRepository.ts');
  assert.match(migration, /CREATE TABLE IF NOT EXISTS vendor_types/);
  for (const name of ['Market Vendor', 'Street Food Vendor (STV)', 'Minimarket', 'Supermarket', 'Restaurant']) assert.ok(migration.includes(name));
  assert.match(migration, /vendor_type_id VARCHAR\(32\) NULL/);
  assert.match(migration, /REFERENCES vendor_types\(vendor_type_id\)/);
  assert.match(service, /Invalid vendor type/);
  assert.match(repository, /vendor_type_id/);
});

test('vendor type management is admin-only and prevents deletion while in use', () => {
  const route = read('src/app/api/vendor-types/route.ts');
  const deleteRoute = read('src/app/api/vendor-types/[id]/route.ts');
  assert.match(route, /isAdminRole\(session\.role\)/);
  assert.match(deleteRoute, /NOT EXISTS \(SELECT 1 FROM vendors WHERE vendor_type_id/);
  assert.match(deleteRoute, /cannot be deleted/);
});

test('Acquired By names are standalone and removal preserves historical vendor values', () => {
  const migration = read('db/migrations/0016_add_standalone_acquired_by_names.sql');
  const route = read('src/app/api/acquired-by-agents/route.ts');
  const deleteRoute = read('src/app/api/acquired-by-agents/[userId]/route.ts');
  const form = read('src/components/forms/vendor-form.tsx');
  assert.match(migration, /CREATE TABLE IF NOT EXISTS acquired_by_names/);
  assert.match(migration, /DROP FOREIGN KEY fk_vendors_acquired_by/);
  assert.match(route, /payload\.name/);
  assert.doesNotMatch(route, /app_users/);
  assert.match(deleteRoute, /UPDATE acquired_by_names SET is_active = 0/);
  assert.doesNotMatch(deleteRoute, /DELETE FROM app_users/);
  assert.match(read('src/services/vendorService.ts'), /not available for selection/);
  assert.match(form, /useAcquiredByAgentsQuery/);
  assert.match(form, /sales_rep_id/);
  assert.match(form, /acquired_by/);
});

test('vendor forms and displays use dynamic vendor types and preserve Acquired By independently', () => {
  const form = read('src/components/forms/vendor-form.tsx');
  const list = read('src/components/vendors/vendor-list.tsx');
  const detail = read('src/components/vendors/vendor-details-shell.tsx');
  assert.match(form, /Vendor Type/);
  assert.match(form, /vendorTypes\.map/);
  assert.match(list, /Vendor Type:/);
  assert.match(detail, /Vendor Type:/);
});
