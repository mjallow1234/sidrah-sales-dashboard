import assert from 'node:assert/strict';
import fs from 'node:fs';

const migration = fs.readFileSync('db/migrations/0019_add_delivery_payments.sql', 'utf8');
const service = fs.readFileSync('src/services/deliveryPaymentService.ts', 'utf8');
const paymentRoute = fs.readFileSync('src/app/api/deliveries/[deliveryId]/payments/route.ts', 'utf8');
const optionRoute = fs.readFileSync('src/app/api/delivery-payment-options/route.ts', 'utf8');
const details = fs.readFileSync('src/components/deliveries/delivery-details.tsx', 'utf8');
const repository = fs.readFileSync('src/repositories/DeliveryPaymentRepository.ts', 'utf8');
const summaryRoute = fs.readFileSync('src/app/api/deliveries/payments/summary/route.ts', 'utf8');

assert.match(migration, /CREATE TABLE IF NOT EXISTS delivery_payment_options/i);
assert.match(migration, /CREATE TABLE IF NOT EXISTS delivery_payments/i);
assert.match(migration, /payment_method VARCHAR\(128\)/i);
assert.match(migration, /recorded_by VARCHAR\(32\)/i);
assert.match(migration, /DPO_CASH.*Cash/i);
assert.match(service, /amount.*finite|Number\(value\)/s);
assert.match(service, /amount.*greater than zero|positive/i);
assert.match(repository, /recorded_at.*NOW|NOW\(\)/i);
assert.match(service, /transaction\(/i);
assert.match(paymentRoute, /session\.userId/);
assert.match(paymentRoute, /canRecordDeliveryPayment\(session\.role\)/);
assert.doesNotMatch(paymentRoute, /isAgentRole/);
const authorization = fs.readFileSync('src/lib/authorization.ts', 'utf8');
assert.match(authorization, /function canRecordDeliveryPayment/);
const canRecordPayment = (role) => {
  const normalized = typeof role === 'string' ? role.trim().toLowerCase() : '';
  return normalized === 'delivery' || normalized === 'admin' || normalized === 'supervisor' || normalized === 'super_admin';
};
for (const role of ['delivery', 'admin', 'supervisor', 'super_admin']) {
  assert.equal(canRecordPayment(role), true, `${role} can record delivery payments`);
}
assert.equal(canRecordPayment('agent'), false, 'agents cannot record delivery payments');
assert.equal(canRecordPayment(' Delivery '), true, 'normalized delivery role can record delivery payments');
assert.doesNotMatch(paymentRoute, /actorUserId|recorded_by.*body/);
assert.match(optionRoute, /isAdminRole/);
assert.match(optionRoute, /canRecordDeliveryPayment\(session\.role\)/);
assert.match(optionRoute, /includeInactive && !isAdminRole\(session\.role\)/);
const middleware = fs.readFileSync('src/middleware.ts', 'utf8');
assert.match(middleware, /isDeliveryPaymentOptionsApi/);
assert.match(repository, /payment_method/);
assert.match(repository, /recorded_by_name|app_users/);
assert.match(repository, /DATE\(p\.recorded_at\)/);
assert.match(repository, /delivery_address/);
assert.match(repository, /customer_name/);
assert.match(summaryRoute, /getDeliveryPaymentSummary/);
assert.match(fs.readFileSync('src/lib/api/deliveryPayments.ts', 'utf8'), /date.*location.*vendor/);
assert.match(details, /Payments received/);
assert.match(details, /Total received/);
assert.match(details, /Record payment/);
assert.match(details, /payment_method/);

console.log('delivery-payments tests passed');
