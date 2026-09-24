import assert from 'node:assert/strict';
import fs from 'node:fs';

const route = fs.readFileSync('src/app/api/deliveries/tracking/route.ts', 'utf8');
const service = fs.readFileSync('src/services/deliveryTrackingService.ts', 'utf8');
const migration = fs.readFileSync('db/migrations/0021_add_delivery_tracking_locations.sql', 'utf8');
const reporter = fs.readFileSync('src/components/deliveries/delivery-location-reporter.tsx', 'utf8');
const navigation = fs.readFileSync('src/components/deliveries/delivery-navigation-actions.tsx', 'utf8');
const deliveryForm = fs.readFileSync('src/components/deliveries/delivery-form.tsx', 'utf8');
const deliveryRepository = fs.readFileSync('src/repositories/DeliveryRepository.ts', 'utf8');

assert.match(route, /isDeliveryRole\(session\.role\)/);
assert.match(route, /isAdminOrSupervisorRole\(session\.role\)/);
assert.match(route, /session\.userId/);
assert.match(service, /delivery\.status !== 'ongoing'/);
assert.match(service, /delivery\.claimed_by !== userId/);
assert.match(service, /Number\.isFinite/);
assert.match(migration, /PRIMARY KEY \(delivery_id\)/);
assert.match(migration, /FOREIGN KEY \(delivery_id\) REFERENCES deliveries/);
assert.match(reporter, /navigator\.geolocation\.watchPosition/);
assert.match(reporter, /active/);
assert.match(navigation, /google\.com\/maps\/dir/);
assert.match(navigation, /maps\.apple\.com/);
assert.match(navigation, /waze\.com\/ul/);
assert.match(navigation, /Vendor location unavailable/);
assert.match(deliveryRepository, /v2\.vendor_name = d\.customer_name/);
assert.match(deliveryRepository, /v2\.location = d\.delivery_address/);
assert.match(deliveryForm, /selectedVendor\.vendor_name/);
console.log('delivery-tracking tests passed');
