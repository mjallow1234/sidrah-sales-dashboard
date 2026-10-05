import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('Admin Dashboard restores filters from URL parameters and replaces state changes', () => {
  const ui = read('src/components/dashboard/admin-control-center.tsx');
  assert.match(ui, /useSearchParams/);
  assert.match(ui, /filtersFromSearchParams\(searchParams\)/);
  assert.match(ui, /startDate: validDateParam/);
  assert.match(ui, /productId: searchParams\.get\('productId'\)/);
  assert.match(ui, /location: searchParams\.get\('location'\)/);
  assert.match(ui, /salesRepId: searchParams\.get\('salesRepId'\)/);
  assert.match(ui, /router\.replace\(query \? `\/dashboard\?\$\{query\}` : '\/dashboard'/);
});

test('Admin Dashboard serializes only non-empty filter values and preserves other query parameters', () => {
  const ui = read('src/components/dashboard/admin-control-center.tsx');
  assert.match(ui, /dashboardFilterKeys = \['startDate', 'endDate', 'productId', 'location', 'salesRepId'\]/);
  assert.match(ui, /new URLSearchParams\(current\)/);
  assert.match(ui, /dashboardFilterKeys\.forEach\(\(key\) => params\.delete\(key\)\)/);
  assert.match(ui, /if \(value\) params\.set\(key, value\)/);
});

test('Admin Dashboard keeps modal drill-downs local while route links remain normal history navigation', () => {
  const ui = read('src/components/dashboard/admin-control-center.tsx');
  assert.match(ui, /setDetail\(null\)/);
  assert.match(ui, /href: `\/vendors\/\$\{vendor\.vendorId\}`/);
});
