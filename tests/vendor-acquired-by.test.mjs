import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');

test('vendor schema stores acquired_by independently from sales_rep_id', () => {
  const migration = read('db/migrations/0014_add_vendor_acquired_by.sql');
  const repository = read('src/repositories/VendorRepository.ts');
  assert.match(migration, /ADD COLUMN acquired_by VARCHAR\(32\) NULL/);
  assert.match(migration, /REFERENCES app_users \(user_id\)/);
  assert.match(repository, /acquired_by/);
  assert.match(repository, /sales_rep_id/);
});

test('vendor create and edit flows persist acquired_by separately', () => {
  const service = read('src/services/vendorService.ts');
  const form = read('src/components/forms/vendor-form.tsx');
  const client = read('src/lib/api/vendors.ts');
  const route = read('src/app/api/vendors/route.ts');
  assert.match(service, /Invalid Acquired By name/);
  assert.match(service, /acquired_by: acquiredBy/);
  assert.match(form, /Acquired By/);
  assert.match(form, /acquired_by/);
  assert.match(client, /acquired_by\?: string/);
  assert.match(route, /acquired_by: isAgentRole\(session\.role\) \? session\.userId : payload\.acquired_by/);
});

test('vendor responses expose the acquired-by agent name without changing assignments', () => {
  const listRoute = read('src/app/api/vendors/route.ts');
  const detailRoute = read('src/app/api/vendors/[id]/route.ts');
  const list = read('src/components/vendors/vendor-list.tsx');
  const detail = read('src/components/vendors/vendor-details-shell.tsx');
  assert.match(listRoute, /acquired_name\.name AS acquired_by_name/);
  assert.match(detailRoute, /acquired_name\.name AS acquired_by_name/);
  assert.match(list, /Acquired By:/);
  assert.match(detail, /Acquired By:/);
  assert.match(listRoute, /sales_rep_id/);
  assert.match(detailRoute, /sales_rep_id/);
});
