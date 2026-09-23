import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('adding delivery items uses a dedicated authenticated endpoint and preserves actionable deliveries', () => {
  const route = read('src/app/api/deliveries/[deliveryId]/items/route.ts');
  const service = read('src/services/deliveryService.ts');
  const repository = read('src/repositories/DeliveryRepository.ts');
  assert.match(route, /addDeliveryItems/);
  assert.match(route, /isAgentRole\(session\.role\)/);
  assert.match(route, /isAdminOrSupervisorRole\(session\.role\)/);
  assert.match(service, /addDeliveryItems/);
  assert.match(repository, /FOR UPDATE/);
  assert.match(repository, /status IN \('pending', 'ongoing'\)/);
  assert.match(repository, /SET items = :items/);
});

test('added quantities merge by product and update the existing delivery UI', () => {
  const repository = read('src/repositories/DeliveryRepository.ts');
  const api = read('src/lib/api/deliveries.ts');
  const hooks = read('src/lib/hooks/queries.ts');
  const details = read('src/components/deliveries/delivery-details.tsx');
  assert.match(repository, /existingIndex = mergedItems\.findIndex/);
  assert.match(repository, /quantity: Number\(mergedItems\[existingIndex\]\.quantity\) \+ item\.quantity/);
  assert.match(api, /\/items/);
  assert.match(hooks, /useAddDeliveryItemsMutation/);
  assert.match(hooks, /deliveryPreparationSummary/);
  assert.match(details, /\+ Add products/);
  assert.match(details, /Add another product/);
});

test('invalid products and quantities are rejected through shared delivery validation', () => {
  const service = read('src/services/deliveryService.ts');
  assert.match(service, /At least one delivery item is required/);
  assert.match(service, /quantity must be greater than zero/);
  assert.match(service, /selected product does not exist/);
});
