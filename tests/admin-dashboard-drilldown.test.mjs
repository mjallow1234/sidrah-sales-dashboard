import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('Control Center preserves KPI and row scope in drill-down URLs', () => {
  const ui = read('src/components/dashboard/admin-control-center.tsx');
  assert.match(ui, /openTransactions\(/);
  assert.match(ui, /productId: row\.productId/);
  assert.match(ui, /location: row\.location/);
  assert.match(ui, /salesRepId: row\.salesRepId/);
  assert.match(ui, /onPointClick/);
  assert.match(ui, /unassigned: true/);
  assert.match(ui, /Vendor Balance · \$\{vendor\.vendorName\}/);
});

test('destination pages consume dashboard filters', () => {
  assert.match(read('src/app/transactions/page.tsx'), /URLSearchParams\(window\.location\.search\)/);
  assert.match(read('src/app/transactions/page.tsx'), /useTransactionsQuery\(transactionFilters\)/);
  assert.match(read('src/components/vendors/vendor-list.tsx'), /params\.get\('location'\)/);
  assert.match(read('src/components/products/product-list.tsx'), /location\.search\)\.get\('productId'\)/);
  assert.match(read('src/components/deliveries/delivery-list.tsx'), /params\.get\('productId'\)/);
  assert.match(read('src/lib/hooks/queries.ts'), /effectiveFilters = filters/);
});

test('sales activity vendor names link by vendor id', () => {
  const ui = read('src/components/dashboard/admin-control-center.tsx');
  assert.match(ui, /vendors\/\$\{row\.vendor_id\}/);
  assert.match(ui, /row\.vendor_name \|\| row\.vendor_id/);
});

test('destination APIs apply the missing scopes', () => {
  assert.match(read('src/app/api/vendors/route.ts'), /COALESCE\(NULLIF\(TRIM\(v\.location\)/);
  assert.match(read('src/app/api/products/route.ts'), /product_id = :product_id/);
  assert.match(read('src/app/api/deliveries/route.ts'), /productId/);
  assert.match(read('src/repositories/DeliveryRepository.ts'), /JSON_CONTAINS/);
  assert.match(read('src/repositories/FactoryStockMovementRepository.ts'), /filters\.startDate/);
});
