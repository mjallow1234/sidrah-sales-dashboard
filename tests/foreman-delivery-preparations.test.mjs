import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('Foreman delivery preparation endpoint is server-authorized and exposes the existing summary', () => {
  const route = read('src/app/api/factory/delivery-preparations/route.ts');
  assert.match(route, /isForemanRole\(session\.role\)/);
  assert.match(route, /forbiddenResponse/);
  assert.match(route, /getDeliveryPreparationSummary/);
});

test('delivery preparation aggregation groups products and counts distinct requests', () => {
  const repository = read('src/repositories/DeliveryRepository.ts');
  assert.match(repository, /d\.status IN \('pending', 'ongoing'\)/);
  assert.match(repository, /SUM\(item\.quantity\)/);
  assert.match(repository, /COUNT\(DISTINCT d\.delivery_id\)/);
  assert.match(repository, /GROUP BY item\.product_id/);
});

test('Foreman dashboard renders product preparation cards without delivery or financial fields', () => {
  const component = read('src/components/factory/delivery-preparations.tsx');
  assert.match(component, /item\.product_name/);
  assert.match(component, /item\.quantity/);
  assert.match(component, /item\.unit/);
  assert.match(component, /item\.request_count/);
  assert.doesNotMatch(component, /vendor|balance|accountability|delivery status|cooking location/i);
});
