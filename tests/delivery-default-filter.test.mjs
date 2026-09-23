import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('delivery queue defaults to pending and ongoing while retaining status choices', () => {
  const list = read('src/components/deliveries/delivery-list.tsx');
  const route = read('src/app/api/deliveries/route.ts');
  assert.match(list, /useState\('pending,ongoing'\)/);
  assert.match(list, /Pending & Ongoing/);
  assert.match(list, /value: ''/);
  assert.match(list, /value: 'delivered'/);
  assert.match(list, /value: 'cancelled'/);
  assert.match(route, /split\(','\)/);
  assert.match(route, /requestedStatuses\.every/);
});

test('delivery repository preserves delivery-user visibility while supporting multiple statuses', () => {
  const repository = read('src/repositories/DeliveryRepository.ts');
  assert.match(repository, /status\?: DeliveryStatus \| DeliveryStatus\[\]/);
  assert.match(repository, /d\.status IN/);
  assert.match(repository, /d\.claimed_by = :deliveryUserId/);
});
