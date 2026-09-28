import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('vendor status summary uses stored status with deterministic dormant priority', () => {
  const repository = read('src/repositories/AdminDashboardRepository.ts');
  assert.match(repository, /getVendorStatuses/);
  assert.match(repository, /cash_collected > 0/);
  assert.match(repository, /INTERVAL 14 DAY/);
  assert.match(repository, /v\.status = 'inactive'/);
});

test('status cards open vendor-specific modal rows that retain vendor detail navigation', () => {
  const ui = read('src/components/dashboard/admin-control-center.tsx');
  assert.match(ui, /Vendor Status/);
  assert.match(ui, /status\.vendors\.map/);
  assert.match(ui, /href: `\/vendors\/\$\{vendor\.vendorId\}`/);
  assert.match(ui, /kind: 'summary'/);
});
