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
