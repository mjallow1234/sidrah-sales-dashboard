import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const migration = read('db/migrations/0043_add_delivery_empty_gallon_returns.sql');
const repository = read('src/repositories/DeliveryRepository.ts');
const service = read('src/services/deliveryService.ts');
const route = read('src/app/api/deliveries/[deliveryId]/deliver/route.ts');
const ui = read('src/components/deliveries/delivery-details.tsx');
const types = read('src/lib/types/index.ts');

test('empty-gallon return storage is delivery-scoped and auditable', () => {
  assert.match(migration, /CREATE TABLE IF NOT EXISTS delivery_empty_gallon_returns/);
  assert.match(migration, /UNIQUE KEY ux_delivery_empty_gallon_return_delivery/);
  assert.match(migration, /quantity_received INT UNSIGNED NOT NULL/);
  assert.match(migration, /recorded_by VARCHAR\(32\) NOT NULL/);
  assert.match(migration, /recorded_at DATETIME NOT NULL/);
  assert.match(migration, /REFERENCES deliveries/);
  assert.match(migration, /REFERENCES app_users/);
});

test('delivery completion records zero or positive whole-number returns transactionally', () => {
  assert.match(service, /function validateEmptyGallons/);
  assert.match(service, /Number\.isInteger\(quantity\)/);
  assert.match(service, /quantity < 0/);
  assert.match(service, /new DeliveryRepository\(connection\)\.deliver\([^\n]*quantity/);
  assert.match(service, /new DeliveryRepository\(connection\)\.completeAsAdmin\([^\n]*quantity/);
  assert.match(repository, /INSERT INTO delivery_empty_gallon_returns/);
  assert.match(repository, /VALUES \(:return_id, :delivery_id, :quantity_received, :recorded_by\)/);
});

test('delivery completion payload is protected by the existing permission and ownership paths', () => {
  assert.match(route, /requirePermission\(request, 'deliveries\.deliver'\)/);
  assert.match(route, /payload\?\.empty_gallons_received/);
  assert.match(route, /markDeliveryDelivered/);
  assert.match(route, /completeDeliveryAsAdmin/);
  assert.match(repository, /current\.status.*ongoing/);
  assert.match(repository, /current\.claimed_by.*claimedBy/);
});

test('the completion UI accepts returns from previous deliveries independently of current items', () => {
  assert.match(ui, /Empty gallons received/);
  assert.match(ui, /Include empty gallons received from previous deliveries/);
  assert.match(ui, /type="number"/);
  assert.match(ui, /min="0"/);
  assert.match(ui, /step="1"/);
  assert.match(ui, /emptyGallonsReceived/);
  assert.doesNotMatch(ui, /delivery\.items.*emptyGallons/);
});

test('return validation rejects negative, decimal, and non-numeric quantities', () => {
  assert.match(service, /Number\.isInteger\(quantity\)/);
  assert.match(service, /quantity < 0/);
  assert.match(service, /Number\(value\)/);
  assert.match(service, /whole number greater than or equal to zero/);
});

test('the delivery contract exposes the recorded return quantity without changing item storage', () => {
  assert.match(types, /empty_gallons_received\?: number/);
  assert.match(repository, /eg\.quantity_received AS empty_gallons_received/);
  assert.match(repository, /LEFT JOIN delivery_empty_gallon_returns eg/);
  assert.match(repository, /items: this\.parseItems\(row\.items\)/);
});

test('historical reporting retains vendor-linkage inputs without backfilling deliveries', () => {
  assert.match(repository, /d\.vendor_id/);
  assert.match(repository, /customer_name/);
  assert.match(repository, /delivery_address/);
  assert.doesNotMatch(service, /UPDATE deliveries.*vendor_id/);
});

test('empty-gallon records are not created by cancellation or inventory paths', () => {
  assert.doesNotMatch(repository.slice(repository.indexOf('public async cancel')), /delivery_empty_gallon_returns/);
  assert.doesNotMatch(service.slice(service.indexOf('export async function cancelDelivery')), /emptyGallonsReceived/);
  assert.doesNotMatch(service.slice(0, service.indexOf('export async function markDeliveryDelivered')), /delivery_empty_gallon_returns/);
});

test('future gallon classification must use product identity and numeric unit size', () => {
  assert.match(migration, /delivery_empty_gallon_returns/);
  assert.match(repository, /product_id/);
  assert.match(repository, /items/);
});
