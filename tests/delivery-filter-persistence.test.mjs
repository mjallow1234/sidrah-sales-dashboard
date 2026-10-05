import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const listSource = fs.readFileSync('src/components/deliveries/delivery-list.tsx', 'utf8');
const cardSource = fs.readFileSync('src/components/deliveries/delivery-card.tsx', 'utf8');
const repositorySource = fs.readFileSync('src/repositories/DeliveryRepository.ts', 'utf8');
const apiSource = fs.readFileSync('src/app/api/deliveries/route.ts', 'utf8');

test('delivery queue persists all filters in the URL and replaces without extra history entries', () => {
  assert.match(listSource, /useSearchParams\(\)/);
  assert.match(listSource, /searchParams\.get\('status'\)/);
  assert.match(listSource, /searchParams\.get\('vendor'\)/);
  assert.match(listSource, /searchParams\.get\('location'\)/);
  assert.match(listSource, /searchParams\.get\('dateDelivered'\)/);
  assert.match(listSource, /searchParams\.get\('productId'\)/);
  assert.match(listSource, /searchParams\.get\('unassigned'\)/);
  assert.match(listSource, /router\.replace\(/);
});

test('delivery cards retain the filtered list URL for browser Back navigation', () => {
  assert.match(cardSource, /useSearchParams\(\)/);
  assert.match(cardSource, /const detailPath = `\/deliveries\/\$\{delivery\.delivery_id\}`/);
  assert.match(cardSource, /searchParams\.toString\(\)/);
});

test('delivery queue filters use vendor, location, and delivered_at rather than scheduled dates', () => {
  assert.match(repositorySource, /filters\.vendor/);
  assert.match(repositorySource, /filters\.location/);
  assert.match(repositorySource, /filters\.deliveredDate/);
  assert.match(repositorySource, /DATE\(d\.delivered_at\) = :deliveredDate/);
  assert.doesNotMatch(repositorySource, /DATE\(d\.delivery_date\).*deliveredDate/);
  assert.match(apiSource, /dateDeliveredParam/);
});

test('delivery cards display actual delivered_at and an empty state when absent', () => {
  assert.match(cardSource, /delivery\.delivered_at \? formatDeliveredAt\(delivery\.delivered_at\) : '—'/);
});
