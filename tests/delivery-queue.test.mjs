import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('delivery queue uses responsive cards with the complete first-view request context', () => {
  const list = read('src/components/deliveries/delivery-list.tsx');
  const card = read('src/components/deliveries/delivery-card.tsx');
  assert.match(list, /DeliveryCard/);
  assert.match(list, /sm:grid-cols-2/);
  assert.match(list, /xl:grid-cols-3/);
  assert.equal(list.includes('grid-cols-5'), false);
  for (const field of ['customer_name', 'delivery_address', 'status', 'claimed_by_name', 'date_created']) {
    assert.match(card, new RegExp(`delivery\\.${field}`));
  }
  assert.match(card, /item\.product_name/);
  assert.match(card, /item\.quantity/);
  assert.match(card, /useDeliveryPaymentsQuery/);
  assert.match(card, /Total received/);
  assert.match(card, /total_amount/);
  assert.match(card, /\/deliveries\/\$\{delivery\.delivery_id\}/);
});

test('delivery cards handle all statuses, unassigned requests, and larger item lists', () => {
  const card = read('src/components/deliveries/delivery-card.tsx');
  for (const status of ['pending', 'ongoing', 'delivered', 'cancelled']) assert.match(card, new RegExp(status));
  assert.match(card, /Unassigned/);
  assert.match(card, /Show all products/);
  assert.match(card, /Show fewer products/);
  assert.match(card, /aria-expanded/);
});

test('delivery preparation summary includes clickable received-payment total and breakdown', () => {
  const list = read('src/components/deliveries/delivery-list.tsx');
  const hooks = read('src/lib/hooks/deliveryPaymentQueries.ts');
  assert.match(list, /useDeliveryPaymentSummaryQuery/);
  assert.match(list, /Total Amount Received/);
  assert.match(list, /Payment breakdown/);
  assert.match(list, /role="dialog"/);
  assert.match(list, /Close payment breakdown/);
  assert.match(list, /selectedPaymentDate/);
  assert.match(list, /All Locations/);
  assert.match(list, /Search Vendor/);
  assert.match(list, /payment\.delivery_address/);
  assert.match(list, /payment\.customer_name/);
  assert.ok(list.indexOf('Filter received payments') < list.indexOf('role="dialog"'));
  assert.ok(list.indexOf('Payment breakdown') > list.indexOf('role="dialog"'));
  assert.match(list, /payment\.payment_method/);
  assert.match(list, /payment\.recorded_at/);
  assert.match(list, /claimed_by_name/);
  assert.match(hooks, /deliveryPayments/);
  assert.match(hooks, /total_amount/);
});
