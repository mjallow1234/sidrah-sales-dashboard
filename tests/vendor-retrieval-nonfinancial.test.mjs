import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('vendor inventory response exposes retrieval quantities per vendor and product', () => {
  const route = read('src/app/api/vendorinventory/route.ts');
  assert.match(route, /retrieval_quantity: Number\(row\.retrieval_quantity\)/);
  assert.match(route, /asm\.movement_type = 'retrieval'/);
  assert.match(route, /asm\.source_vendor_id = vendor_inventory\.vendor_id/);
  assert.match(route, /asm\.product_id = vendor_inventory\.product_id/);
  assert.match(route, /AS retrieval_quantity/);
});

test('vendor detail subtracts retrievals from attributable quantity', () => {
  const shell = read('src/components/vendors/vendor-details-shell.tsx');
  assert.match(shell, /record\.retrieval_quantity/);
  assert.match(shell, /- \(record\.retrieval_quantity \?\? 0\)/);
});

test('retrieval and transfer mutations refresh affected vendor data', () => {
  const hooks = read('src/lib/hooks/queries.ts');
  assert.match(hooks, /useRetrieveStockMutation[\s\S]*?\['vendorInventory', variables\.vendor_id\]/);
  assert.match(hooks, /useRetrieveStockMutation[\s\S]*?\['vendorBalance', variables\.vendor_id\]/);
  assert.match(hooks, /useRetrieveStockMutation[\s\S]*?\['adminActivity'\]/);
  assert.match(hooks, /useTransferStockMutation[\s\S]*?variables\.source_vendor_id/);
  assert.match(hooks, /useTransferStockMutation[\s\S]*?variables\.destination_vendor_id/);
});

test('visit reversal refreshes vendor inventory and balance queries', () => {
  const hooks = read('src/lib/hooks/queries.ts');
  assert.match(hooks, /useReverseVisitMutation[\s\S]*?\['vendorInventory'\]/);
  assert.match(hooks, /useReverseVisitMutation[\s\S]*?\['vendorBalance'\]/);
  assert.match(hooks, /useReverseVisitMutation[\s\S]*?\['inventory'\]/);
});

test('retrieval valuation remains based on average unit value with no product-price fallback', () => {
  const service = read('src/services/adminStockService.ts');
  const retrieval = service.slice(service.indexOf('export async function retrieveStock'));
  assert.match(retrieval, /Number\(vendorInventory\.average_unit_value\) \|\| 0/);
  assert.doesNotMatch(retrieval, /default_unit_price/);
  assert.doesNotMatch(retrieval, /800/);
});
