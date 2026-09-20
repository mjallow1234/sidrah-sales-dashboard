import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('valuation resolution is authorized and derives actor from the session', () => {
  const route = read('src/app/api/admin-stock/valuation/route.ts');
  assert.match(route, /isAdminOrSupervisorRole\(session\.role\)/);
  assert.match(route, /userId: session\.userId/);
  assert.doesNotMatch(route, /payload\.actor/);
});

test('valuation resolution locks and rechecks an unvalued positive-stock row', () => {
  const service = read('src/services/adminStockService.ts');
  const method = service.slice(service.indexOf('export async function resolveVendorInventoryValuation'));
  assert.match(method, /FOR UPDATE/);
  assert.match(method, /affectedQuantity <= 0/);
  assert.match(method, /beforeUnitValue > 0/);
  assert.match(method, /updateAverageUnitValue\(current\.vendor_inventory_id, approvedUnitValue\)/);
});

test('resolution does not update vendor balances and audits the calculated value', () => {
  const service = read('src/services/adminStockService.ts');
  const method = service.slice(service.indexOf('export async function resolveVendorInventoryValuation'));
  assert.match(method, /const financialAdjustment = 0/);
  assert.match(method, /approved_stock_value: approvedStockValue/);
  assert.match(method, /before_unit_value: beforeUnitValue/);
  assert.match(method, /after_unit_value: approvedUnitValue/);
  assert.match(method, /actor: actorUserId/);
  assert.match(method, /endpoint: '\/admin-stock\/valuation-resolution'/);
  assert.doesNotMatch(method, /vendorBalanceRepo/);
  assert.doesNotMatch(method, /total_expected_cash/);
  assert.doesNotMatch(method, /balance_owed/);
});

test('resolution UI warns that vendor balances do not change', () => {
  const page = read('src/app/admin-stock/page.tsx');
  assert.match(page, /Valuation resolution changes the stock valuation only\. It does not change the vendor balance\./);
  assert.match(page, /approved_unit_value/);
  assert.match(page, /valuationReason/);
});

test('successful resolution refreshes vendor inventory, detail, balance, and activity queries', () => {
  const hooks = read('src/lib/hooks/queries.ts');
  const resolution = hooks.slice(hooks.indexOf('export function useResolveVendorInventoryValuationMutation'));
  assert.match(resolution, /\['vendorInventory', variables\.vendor_id\]/);
  assert.match(resolution, /\['vendorBalance', variables\.vendor_id\]/);
  assert.match(resolution, /\['vendor', variables\.vendor_id\]/);
  assert.match(resolution, /\['adminActivity'\]/);
});
