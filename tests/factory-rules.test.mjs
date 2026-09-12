import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateFactoryQuantity, isOperationDuplicateError } from '../src/services/factoryRules.ts';

test('production and returned movements increase inventory', () => {
  assert.equal(calculateFactoryQuantity(0, 'production', 20), 20);
  assert.equal(calculateFactoryQuantity(20, 'returned_factory', 4), 24);
});

test('leaving movement decreases inventory and cannot overdraw', () => {
  assert.equal(calculateFactoryQuantity(20, 'leaving_factory', 4), 16);
  assert.throws(() => calculateFactoryQuantity(3, 'leaving_factory', 4), /FACTORY_STOCK_INSUFFICIENT/);
});

test('products remain independent when quantities are tracked separately', () => {
  const inventory = new Map([['P1', 10], ['P2', 4]]);
  inventory.set('P1', calculateFactoryQuantity(inventory.get('P1'), 'leaving_factory', 3));
  assert.equal(inventory.get('P1'), 7);
  assert.equal(inventory.get('P2'), 4);
});

test('duplicate operation errors are recognized for safe post-rollback retrieval', () => {
  assert.equal(isOperationDuplicateError({ code: 'ER_DUP_ENTRY', message: 'ux_factory_stock_movements_operation_id' }), true);
  assert.equal(isOperationDuplicateError({ code: 'ER_DUP_ENTRY', message: 'ux_factory_inventory_product_id' }), false);
});
