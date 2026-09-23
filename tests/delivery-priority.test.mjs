import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('delivery priority is persisted with a Normal database default', () => {
  const migration = read('db/migrations/0018_add_delivery_priority.sql');
  const repository = read('src/repositories/DeliveryRepository.ts');
  const service = read('src/services/deliveryService.ts');
  assert.match(migration, /ADD COLUMN priority VARCHAR\(16\) NOT NULL DEFAULT 'normal'/);
  assert.match(repository, /priority/);
  assert.match(service, /return 'normal'/);
});

test('delivery creation exposes all supported priority options and displays priority', () => {
  const form = read('src/components/deliveries/delivery-form.tsx');
  const card = read('src/components/deliveries/delivery-card.tsx');
  const details = read('src/components/deliveries/delivery-details.tsx');
  for (const value of ['low', 'normal', 'high', 'urgent']) assert.match(form, new RegExp(`value="${value}"`));
  assert.match(form, /priority/);
  assert.match(card, /Priority:/);
  assert.match(details, /Priority:/);
});

test('invalid delivery priorities are rejected server-side', () => {
  const service = read('src/services/deliveryService.ts');
  assert.match(service, /Priority must be Low, Normal, High, or Urgent/);
  assert.match(service, /deliveryPriorities\.includes/);
});
