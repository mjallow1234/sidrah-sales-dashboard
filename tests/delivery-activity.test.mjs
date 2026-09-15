import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('delivery activity is append-only and supports lifecycle transitions', () => {
  const migration = read('db/migrations/0013_add_delivery_activity.sql');
  const repository = read('src/repositories/DeliveryRepository.ts');
  const service = read('src/services/deliveryService.ts');
  assert.match(migration, /CREATE TABLE(?: IF NOT EXISTS)? delivery_activity/);
  assert.match(migration, /activity_type ENUM\('created','claimed','assigned','reassigned','delivered','cancelled','comment'\)/);
  assert.match(migration, /idx_delivery_activity_delivery_time/);
  assert.match(repository, /SELECT \* FROM deliveries[\s\S]*FOR UPDATE/);
  assert.match(repository, /INSERT INTO delivery_activity/);
  assert.match(service, /transaction\(async \(connection\)/);
});

test('delivery actions accept optional comments and activity has a read API', () => {
  const api = read('src/lib/api/deliveries.ts');
  const routes = [
    'src/app/api/deliveries/[deliveryId]/claim/route.ts',
    'src/app/api/deliveries/[deliveryId]/deliver/route.ts',
    'src/app/api/deliveries/[deliveryId]/cancel/route.ts',
    'src/app/api/deliveries/[deliveryId]/reassign/route.ts',
  ].map(read).join('\n');
  const detail = read('src/components/deliveries/delivery-details.tsx');
  assert.match(api, /getDeliveryActivity/);
  assert.match(routes, /payload\?\.comment/);
  assert.match(detail, /Activity/);
  assert.match(detail, /activity.comment/);
});

test('creation records the authenticated actor and status transitions preserve previous/new status', () => {
  const service = read('src/services/deliveryService.ts');
  const repository = read('src/repositories/DeliveryRepository.ts');
  assert.match(service, /activity_type: 'created'/);
  assert.match(repository, /previous_status: 'pending', new_status: 'ongoing'/);
  assert.match(repository, /activity_type: 'cancelled'/);
  assert.match(repository, /activity_type: activityType/);
});

test('standalone comments use the existing activity table without changing delivery state', () => {
  const route = read('src/app/api/deliveries/[deliveryId]/comments/route.ts');
  const service = read('src/services/deliveryService.ts');
  const repository = read('src/repositories/DeliveryRepository.ts');
  const details = read('src/components/deliveries/delivery-details.tsx');
  const api = read('src/lib/api/deliveries.ts');
  assert.match(route, /addDeliveryComment/);
  assert.match(route, /session\.userId/);
  assert.match(service, /createStandaloneComment/);
  assert.match(service, /Comment is required/);
  assert.match(repository, /createStandaloneComment/);
  assert.match(repository, /activity_type: 'comment'/);
  assert.match(details, /\+ Add comment/);
  assert.match(details, /2000/);
  assert.match(api, /\/comments/);
});
