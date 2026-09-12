import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('production form exposes the approved fields and output product selector', () => {
  const form = read('src/components/factory/factory-production-form.tsx');
  for (const label of ['Raw Material', 'Batch No.', 'Weight (kg)', 'Temp °C', 'Time', 'Hour', 'Minute', 'Output', 'Finished Product', 'Output Quantity']) {
    assert.match(form, new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }
  assert.equal(form.includes('reason_comment'), false);
  assert.equal(form.includes('vendor'), false);
  assert.equal(form.includes('delivery'), false);
});

test('production metadata migration stores duration separately from record timestamp', () => {
  const migration = read('db/migrations/0009_add_production_metadata.sql');
  assert.match(migration, /raw_material/);
  assert.match(migration, /temperature_c/);
  assert.match(migration, /processing_duration_hours/);
  assert.match(migration, /processing_duration_minutes/);
  assert.equal(migration.includes('occurred_at'), false);
});

test('production service persists metadata while output remains inventory quantity', () => {
  const service = read('src/services/factoryInventoryService.ts');
  assert.match(service, /raw_material/);
  assert.match(service, /temperature_c/);
  assert.match(service, /processing_duration_hours/);
  assert.match(service, /processing_duration_minutes/);
  assert.match(service, /quantity, occurred_at/);
});
