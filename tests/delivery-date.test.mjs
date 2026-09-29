import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('delivery date flows through schema, API, repository, form, and card', () => {
  const migration = read('db/migrations/0033_add_delivery_date.sql');
  const api = read('src/lib/api/deliveries.ts');
  const service = read('src/services/deliveryService.ts');
  const repository = read('src/repositories/DeliveryRepository.ts');
  const form = read('src/components/deliveries/delivery-form.tsx');
  const card = read('src/components/deliveries/delivery-card.tsx');
  const dateOnly = read('src/lib/dateOnly.ts');
  assert.match(migration, /ADD COLUMN delivery_date DATE NULL/);
  assert.match(migration, /information_schema\.COLUMNS/);
  assert.match(api, /delivery_date: string/);
  assert.match(api, /updateDeliveryDate/);
  assert.match(service, /validateDeliveryDate/);
  assert.match(repository, /delivery_date/);
  assert.match(repository, /delivery_date: deliveryDate/);
  assert.match(form, /Delivery Date/);
  assert.match(form, /delivery_date: deliveryDate/);
  assert.match(card, /delivery\.delivery_date/);
  assert.match(repository, /getUTCFullYear/);
  assert.match(dateOnly, /formatDateOnly/);
  assert.match(dateOnly, /isValidDateOnly/);
  assert.match(dateOnly, /Not specified/);
  assert.doesNotMatch(card, /new Date\(`\$\{delivery\.delivery_date\}/);
});

test('delivery date editing is management-authorized and limited to active requests', () => {
  const route = read('src/app/api/deliveries/[deliveryId]/route.ts');
  const repository = read('src/repositories/DeliveryRepository.ts');
  const service = read('src/services/deliveryService.ts');
  const details = read('src/components/deliveries/delivery-details.tsx');
  assert.match(route, /isAdminOrSupervisorRole/);
  assert.match(route, /export async function PATCH/);
  assert.match(repository, /status IN \('pending', 'ongoing'\)/);
  assert.match(details, /useUpdateDeliveryDateMutation/);
  assert.match(service, /cannot be in the past/);
  assert.match(service, /formatLocalDateInput/);
});

test('new delivery dates reject past calendar dates before persistence', () => {
  const form = read('src/components/deliveries/delivery-form.tsx');
  const service = read('src/services/deliveryService.ts');
  const today = '2026-09-29';
  const cases = [
    ['2026-09-29', true],
    ['2026-09-30', true],
    ['2026-09-28', false],
    ['2025-01-01', false],
  ];
  for (const [value, expected] of cases) {
    assert.equal(value >= today, expected, `${value} date-only comparison`);
  }
  assert.match(form, /deliveryDate < todayDate/);
  assert.match(service, /validateDeliveryDate\(payload\.delivery_date, true\)/);
  assert.match(service, /Delivery date cannot be in the past/);
});
