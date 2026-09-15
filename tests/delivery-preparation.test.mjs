import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('delivery preparation summary aggregates only outstanding JSON items by product', () => {
  const repository = read('src/repositories/DeliveryRepository.ts');
  assert.match(repository, /JSON_TABLE/);
  assert.match(repository, /d\.status IN \('pending', 'ongoing'\)/);
  assert.match(repository, /SUM\(item\.quantity\)/);
  assert.match(repository, /COUNT\(DISTINCT d\.delivery_id\)/);
  assert.match(repository, /GROUP BY item\.product_id/);
  assert.equal(repository.includes("d.status IN ('pending', 'ongoing', 'delivered')"), false);
});

test('delivery preparation summary is server-authorized for admin, supervisor, and super admin', () => {
  const route = read('src/app/api/deliveries/summary/route.ts');
  assert.match(route, /isAdminOrSupervisorRole\(session\.role\)/);
  assert.match(route, /forbiddenResponse/);
  assert.match(route, /getDeliveryPreparationSummary/);
});

test('delivery preparation summary is typed, queried, and refreshed after delivery changes', () => {
  const types = read('src/lib/types/index.ts');
  const api = read('src/lib/api/deliveries.ts');
  const hooks = read('src/lib/hooks/queries.ts');
  const list = read('src/components/deliveries/delivery-list.tsx');
  assert.match(types, /interface DeliveryPreparationSummaryItem/);
  assert.match(types, /interface DeliveryPreparationSummary/);
  assert.match(api, /\/api\/deliveries\/summary/);
  assert.match(hooks, /useDeliveryPreparationSummaryQuery/);
  assert.match(hooks, /deliveryPreparationSummary/);
  assert.match(list, /Pending and ongoing requests/);
  assert.match(list, /No outstanding deliveries/);
  assert.match(list, /preparationSummary\.data\.items/);
});
