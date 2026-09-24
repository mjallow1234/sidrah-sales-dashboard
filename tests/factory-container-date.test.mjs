import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('container movement create and edit flows expose and persist Movement Date', () => {
  const component = read('src/components/factory/factory-container-section.tsx');
  assert.equal((component.match(/Movement Date/g) ?? []).length >= 3, true);
  assert.match(component, /occurred_at:movementDate/);
  assert.match(component, /type="date" value=\{movementDate\}/);
  assert.match(component, /movementDateLabel\(i\.occurred_at\)/);
});

test('container movement service already normalizes the selected occurred_at date', () => {
  const service = read('src/services/factoryContainerService.ts');
  assert.match(service, /const occurredAt = sqlDateTime\(payload\.occurred_at\)/);
  assert.match(service, /occurred_at: occurredAt/);
  assert.match(service, /UPDATE factory_container_movements SET container_type = \?, movement_type = \?, quantity = \?, occurred_at = \?/);
});
