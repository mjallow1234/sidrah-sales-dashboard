import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('retrieval keeps the existing positive average valuation', () => {
  const service = read('src/services/adminStockService.ts');
  const retrieval = service.slice(service.indexOf('export async function retrieveStock'));
  assert.match(retrieval, /const retrievalUnitValue = Number\(vendorInventory\.average_unit_value\) \|\| 0/);
  assert.match(retrieval, /const retrievalTotalValue = quantity \* retrievalUnitValue/);
});

test('retrieval rejects positive stock without a recorded valuation before any writes', () => {
  const service = read('src/services/adminStockService.ts');
  const retrieval = service.slice(service.indexOf('export async function retrieveStock'));
  const guard = "This vendor stock has no recorded valuation. Retrieval cannot be completed until the stock valuation is resolved.";
  const guardIndex = retrieval.indexOf(guard);
  const inventoryUpdateIndex = retrieval.indexOf('const updatedInventory = await inventoryRepo.update');
  const vendorInventoryUpdateIndex = retrieval.indexOf('const updatedVendorInventory = await vendorInventoryRepo.update');
  const movementInsertIndex = retrieval.indexOf('const movement = await adminStockRepo.create');
  assert.notEqual(guardIndex, -1);
  assert.match(retrieval, /currentVendorStock > 0 && !\(recordedUnitValue > 0\)/);
  assert.ok(guardIndex < inventoryUpdateIndex);
  assert.ok(guardIndex < vendorInventoryUpdateIndex);
  assert.ok(guardIndex < movementInsertIndex);
});

test('zero-stock retrieval keeps the existing insufficient-stock behavior', () => {
  const service = read('src/services/adminStockService.ts');
  const retrieval = service.slice(service.indexOf('export async function retrieveStock'));
  const insufficientIndex = retrieval.indexOf("Vendor does not have enough stock to retrieve.");
  const guardIndex = retrieval.indexOf('currentVendorStock > 0 && !(recordedUnitValue > 0)');
  assert.notEqual(insufficientIndex, -1);
  assert.notEqual(guardIndex, -1);
  assert.ok(insufficientIndex < guardIndex);
});

test('valuation guard does not introduce product-price fallback or permission changes', () => {
  const service = read('src/services/adminStockService.ts');
  const route = read('src/app/api/admin-stock/route.ts');
  const retrieval = service.slice(service.indexOf('export async function retrieveStock'));
  assert.doesNotMatch(retrieval, /default_unit_price/);
  assert.doesNotMatch(retrieval, /800/);
  assert.match(route, /isAdminOrSupervisorRole\(session\.role\)/);
});
