import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('production form exposes metadata, processing duration, and Production Date separately', () => {
  const form = read('src/components/factory/factory-production-form.tsx');
  for (const label of ['Raw Material', 'Batch No.', 'Weight (kg)', 'Processing Duration', 'Production Date', 'Hour', 'Minute', 'Finished Product', 'Output Quantity']) assert.match(form, new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.match(form, /occurred_at: productionDate/);
  assert.match(form, /type="date"/);
  assert.equal(form.includes('new Date().toISOString().slice(0, 10)'), false);
  assert.equal(form.includes('Time</legend>'), false);
});

test('production metadata migration keeps duration separate from the event timestamp', () => {
  const migration = read('db/migrations/0009_add_production_metadata.sql');
  assert.match(migration, /raw_material/);
  assert.match(migration, /temperature_c/);
  assert.match(migration, /processing_duration_hours/);
  assert.match(migration, /processing_duration_minutes/);
  assert.equal(migration.includes('occurred_at'), false);
});

test('production service persists metadata while output remains inventory quantity', () => {
  const service = read('src/services/factoryInventoryService.ts');
  for (const field of ['raw_material', 'temperature_c', 'processing_duration_hours', 'processing_duration_minutes']) assert.match(service, new RegExp(field));
  assert.match(service, /quantity, occurred_at/);
});

test('production dates are strict date-only values and future dates are rejected', () => {
  const service = read('src/services/factoryInventoryService.ts');
  assert.match(service, /productionDateTime/);
  assert.match(service, /Production Date must be a valid date in YYYY-MM-DD format/);
  assert.match(service, /Production Date must be a valid calendar date/);
  assert.match(service, /Production Date cannot be in the future/);
  assert.match(service, /existingTime/);
  assert.match(service, /existingTime \?\? '00:00:00'/);
});

test('editing production preserves original recorded_at while updating occurrence and revision timestamps', () => {
  const service = read('src/services/factoryInventoryService.ts');
  assert.match(service, /UPDATE factory_stock_movements SET product_id = \?, quantity = \?, occurred_at = \?/);
  assert.doesNotMatch(service, /UPDATE factory_stock_movements SET product_id = \?, quantity = \?, occurred_at = \?, recorded_at = \?/);
  assert.match(service, /edited_at = \?/);
  assert.match(service, /revisionRepo\.create/);
});
