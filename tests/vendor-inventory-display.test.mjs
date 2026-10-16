import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('vendor detail displays authoritative stored vendor inventory stock', () => {
  const shell = read('src/components/vendors/vendor-details-shell.tsx');

  assert.match(shell, /const currentStockTotal = hasVendorInventory/);
  assert.match(shell, /vendorInventory\.reduce\(\(sum, record\) => sum \+ \(record\.current_stock \?\? 0\), 0\)/);
  assert.match(shell, /Current attributable quantity<\/dt><dd[^>]*>\{record\.current_stock\}<\/dd>/);
  assert.doesNotMatch(shell, /record\.total_stock_received \+ \(record\.transfer_in_quantity/);
});

test('inventory models remain separate and reversal/retrieval operations are not changed', () => {
  const shell = read('src/components/vendors/vendor-details-shell.tsx');
  const vendorInventoryRoute = read('src/app/api/vendorinventory/route.ts');
  const adminStockService = read('src/services/adminStockService.ts');

  assert.match(shell, /useVendorInventoryQuery\(vendorId\)/);
  assert.match(vendorInventoryRoute, /SELECT vendor_inventory_id, vendor_id, product_id, current_stock/);
  assert.match(adminStockService, /updatedVendorInventoryCurrent/);
  assert.match(adminStockService, /movement_type: 'retrieval'/);
  assert.match(adminStockService, /movement_type: 'transfer'/);
});
