import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('recommendation ranking gives absolute precedence to priority', () => {
  const service = read('src/services/recommendedDeliveryService.ts');
  assert.match(service, /urgent: 0, high: 1, normal: 2, low: 3/);
  assert.match(service, /priorityDifference/);
  assert.match(service, /if \(priorityDifference !== 0\) return priorityDifference/);
});

test('recommendation ranking uses nearest distance only within the same priority', () => {
  const service = read('src/services/recommendedDeliveryService.ts');
  assert.match(service, /haversineDistanceKm/);
  assert.match(service, /left\.distance !== null && right\.distance !== null/);
  assert.match(service, /delivery_date/);
  assert.match(service, /date_created/);
  assert.match(service, /delivery_id\.localeCompare/);
});

test('recommendation excludes claimed deliveries and protects the delivery-only endpoint', () => {
  const repository = read('src/repositories/RecommendedDeliveryRepository.ts');
  const route = read('src/app/api/deliveries/recommended-next/route.ts');
  assert.match(repository, /d\.status = 'pending'/);
  assert.match(repository, /d\.claimed_by IS NULL/);
  assert.match(repository, /d\.vendor_id IS NOT NULL/);
  assert.match(route, /isDeliveryRole/);
  assert.match(route, /forbiddenResponse/);
});

test('recommendation falls back without inventing distance and does not claim deliveries', () => {
  const service = read('src/services/recommendedDeliveryService.ts');
  const component = read('src/components/deliveries/recommended-next-delivery.tsx');
  assert.match(service, /distance_km: distance === null \? null/);
  assert.match(service, /location_stale/);
  assert.match(service, /location_unavailable/);
  assert.match(component, /navigator\.geolocation\.getCurrentPosition/);
  assert.match(component, /Open Delivery/);
  assert.doesNotMatch(service, /claimDelivery|update.*status|reassignDelivery/);
});

test('recommendation exposes transparent location state and only refreshes stale or unavailable stored locations', () => {
  const service = read('src/services/recommendedDeliveryService.ts');
  const locationService = read('src/services/deliveryUserLocationService.ts');
  const component = read('src/components/deliveries/recommended-next-delivery.tsx');
  assert.match(service, /location_state: effectiveLocationState/);
  assert.match(service, /vendor_coordinates_unavailable/);
  assert.match(locationService, /getDeliveryUserLocationState/);
  assert.match(component, /storedLocation\.data\?\.state === 'fresh'/);
  assert.match(component, /saveLocation\.mutateAsync/);
  assert.match(component, /Location stale/);
  assert.match(component, /Location unavailable/);
});

test('phase 2 persists only the authenticated delivery user location and enforces freshness', () => {
  const migration = read('db/migrations/0035_add_delivery_user_locations.sql');
  const repository = read('src/repositories/DeliveryUserLocationRepository.ts');
  const service = read('src/services/deliveryUserLocationService.ts');
  const route = read('src/app/api/deliveries/location/route.ts');
  assert.match(migration, /CREATE TABLE IF NOT EXISTS delivery_user_locations/);
  assert.match(migration, /PRIMARY KEY \(delivery_user_id\)/);
  assert.match(repository, /ON DUPLICATE KEY UPDATE/);
  assert.match(service, /DELIVERY_LOCATION_STALE_MINUTES = 15/);
  assert.match(service, /delivery_user_id: userId/);
  assert.match(route, /isDeliveryRole/);
  assert.doesNotMatch(route, /payload\?\.delivery_user_id/);
});
