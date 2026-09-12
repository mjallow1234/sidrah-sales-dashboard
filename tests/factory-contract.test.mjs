import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('factory schema is isolated and traceable', () => {
  const migration = read('db/migrations/0008_add_foreman_factory_inventory.sql');
  assert.match(migration, /UNIQUE KEY ux_factory_stock_movements_operation_id/);
  assert.match(migration, /current_quantity >= 0/);
  assert.match(migration, /quantity > 0/);
  for (const forbidden of ['vendor_id', 'delivery_id', 'vendor_inventory', 'vendor_balances']) {
    assert.equal(migration.includes(forbidden), false, `migration must not contain ${forbidden}`);
  }
  for (const field of ['movement_type', 'product_id', 'quantity', 'occurred_at', 'recorded_at', 'actor_user_id', 'reason_comment', 'batch_reference', 'input_quantity', 'input_unit', 'operation_id']) {
    assert.match(migration, new RegExp(`\\b${field}\\b`));
  }
});

test('multi-item movement migration groups rows under one idempotent event', () => {
  const migration = read('db/migrations/0010_add_factory_movement_events.sql');
  assert.match(migration, /CREATE TABLE factory_movement_events/);
  assert.match(migration, /UNIQUE KEY ux_factory_movement_events_operation_id/);
  assert.match(migration, /ADD COLUMN event_id/);
  assert.match(migration, /fk_factory_stock_movements_event_id/);
  assert.match(migration, /DROP INDEX ux_factory_stock_movements_operation_id/);
  for (const forbidden of ['vendor_id', 'delivery_id', 'vendor_inventory', 'vendor_balances']) {
    assert.equal(migration.includes(forbidden), false, `migration must not contain ${forbidden}`);
  }
});

test('factory API requires foreman and derives actor from session', () => {
  const movementRoute = read('src/app/api/factory/movements/route.ts');
  assert.match(movementRoute, /isForemanRole\(session\.role\)/);
  assert.match(movementRoute, /actor_user_id: session\.userId/);
  assert.equal(movementRoute.includes('vendor_id'), false);
  assert.equal(movementRoute.includes('delivery_id'), false);
});

test('factory service contains rollback-safe duplicate retrieval', () => {
  const service = read('src/services/factoryInventoryService.ts');
  assert.match(service, /isOperationDuplicateError/);
  assert.match(service, /await movementRepo\.findByOperationId\(operationId\)/);
  assert.match(service, /findItemsByOperationId/);
  assert.match(service, /items\?: FactoryMovementItem\[\]/);
  assert.match(service, /return \{ event, movements, inventories/);
  assert.match(service, /executeOperation = \(\) => transaction\(/);
});

test('movement form supports repeatable item rows without vendor or delivery fields', () => {
  const form = read('src/components/factory/factory-movement-form.tsx');
  assert.match(form, /Add Item/);
  assert.match(form, /removeMovementItem/);
  assert.match(form, /items: payloadItems/);
  assert.equal(form.includes('vendor_id'), false);
  assert.equal(form.includes('delivery_id'), false);
});

test('factory history orders by event recording time and keeps event rows together', () => {
  const repository = read('src/repositories/FactoryStockMovementRepository.ts');
  assert.match(repository, /ORDER BY e\.recorded_at DESC, e\.event_id DESC, m\.movement_id DESC/);
  assert.equal(repository.includes('ORDER BY m.occurred_at DESC'), false);

  const rows = [
    { event_id: 'older-event', movement_id: 'row-older', occurred_at: '2026-09-12 00:00:00', recorded_at: '2026-09-11 10:00:00' },
    { event_id: 'new-event', movement_id: 'row-b', occurred_at: '2026-09-11 00:00:00', recorded_at: '2026-09-11 11:00:00' },
    { event_id: 'new-event', movement_id: 'row-a', occurred_at: '2026-09-11 00:00:00', recorded_at: '2026-09-11 11:00:00' },
  ];
  const ordered = [...rows].sort((a, b) => b.recorded_at.localeCompare(a.recorded_at) || b.event_id.localeCompare(a.event_id) || b.movement_id.localeCompare(a.movement_id));
  assert.deepEqual(ordered.map((row) => row.event_id), ['new-event', 'new-event', 'older-event']);
});

test('factory UI uses mobile cards, tabs, and event-based movement details', () => {
  const history = read('src/components/factory/factory-history.tsx');
  const productionPage = read('src/app/factory/production/page.tsx');
  const movementPage = read('src/app/factory/movements/page.tsx');
  assert.match(history, /item\.event_id \?\? item\.operation_id/);
  assert.match(history, /grouped\.set\(key/);
  assert.match(history, /role="dialog"/);
  assert.match(history, /Production detail/);
  assert.match(history, /MovementDetail/);
  assert.match(productionPage, /FactoryTabs active="production"/);
  assert.match(productionPage, /\+ Record Production/);
  assert.match(movementPage, /FactoryTabs active="movements"/);
  assert.match(movementPage, /\+ Record Movement/);
  assert.equal(history.includes('<table'), false);
});

test('container tracking is manual, independent, and Foreman-protected', () => {
  const migration = read('db/migrations/0011_add_factory_container_tracking.sql');
  const service = read('src/services/factoryContainerService.ts');
  const component = read('src/components/factory/factory-container-section.tsx');
  const route = read('src/app/api/factory/containers/movements/route.ts');
  for (const type of ['gallon', 'bucket_5l', 'bucket_1kg']) assert.match(migration, new RegExp(type));
  for (const type of ['received', 'leaving_factory', 'returned_factory']) assert.match(migration, new RegExp(type));
  assert.match(migration, /UNIQUE KEY ux_factory_container_movements_operation_id/);
  assert.match(service, /transaction\(/);
  assert.match(service, /FACTORY_STOCK_INSUFFICIENT/);
  assert.match(route, /isForemanRole\(session\.role\)/);
  assert.match(route, /actor_user_id: session\.userId/);
  assert.match(component, /Production and product movements do not change/);
  assert.match(component, /Reason \/ Comment/);
  assert.equal(service.includes('factoryInventoryService'), false);
  assert.equal(service.includes('FactoryStockMovement'), false);
  assert.equal(route.includes('vendor'), false);
  assert.equal(route.includes('delivery'), false);
  for (const forbidden of ['vendor_id', 'delivery_id', 'product_id', 'production_id']) {
    assert.equal(migration.includes(forbidden), false, `container migration must not contain ${forbidden}`);
  }
});
