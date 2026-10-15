import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const migration = read('db/migrations/0045_add_delivery_payment_corrections.sql');
const repository = read('src/repositories/DeliveryPaymentRepository.ts');
const service = read('src/services/deliveryPaymentService.ts');
const route = read('src/app/api/deliveries/[deliveryId]/payments/[paymentId]/route.ts');
const ui = read('src/components/deliveries/delivery-details.tsx');
const paymentRoute = read('src/app/api/deliveries/[deliveryId]/payments/route.ts');

assert.match(migration, /CREATE TABLE IF NOT EXISTS delivery_payment_corrections/);
assert.match(migration, /payment_id VARCHAR\(32\) NOT NULL/);
assert.match(migration, /previous_amount DECIMAL/);
assert.match(migration, /corrected_amount DECIMAL/);
assert.match(migration, /reason TEXT NOT NULL/);
assert.match(migration, /corrected_by VARCHAR\(32\) NOT NULL/);
assert.match(migration, /UNIQUE KEY ux_delivery_payment_correction_operation/);
assert.match(migration, /FOREIGN KEY \(payment_id\)/);
assert.match(migration, /FOREIGN KEY \(corrected_by\)/);

assert.match(route, /isAdminRole\(session\.role\)/);
assert.match(route, /export async function PATCH/);
assert.match(route, /correctDeliveryPayment/);
assert.match(service, /A correction reason is required/);
assert.match(service, /Only completed deliveries/);
assert.match(service, /transaction\(async \(connection\)/);
assert.match(repository, /delivery_payment_corrections/);
assert.match(repository, /COALESCE\(\(SELECT c\.corrected_amount/);
assert.match(repository, /FOR UPDATE/);
assert.match(repository, /previous_amount/);
assert.match(ui, /Edit payment/);
assert.match(ui, /Confirm correction/);
assert.match(ui, /Original amount/);
assert.match(ui, /Reason/);
assert.match(ui, /isAdminRole\(currentRole\) && delivery\.status === 'delivered'/);
assert.match(paymentRoute, /canRecordDeliveryPayment/);
assert.doesNotMatch(paymentRoute, /correctDeliveryPayment/);

console.log('Delivery payment correction tests passed');
