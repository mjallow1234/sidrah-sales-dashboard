import assert from 'node:assert/strict';
import fs from 'node:fs';

const service = fs.readFileSync('src/services/deliveryService.ts', 'utf8');
const route = fs.readFileSync('src/app/api/deliveries/route.ts', 'utf8');
const repository = fs.readFileSync('src/repositories/DeliveryRepository.ts', 'utf8');
const accountability = fs.readFileSync('src/repositories/AgentAccountabilityRepository.ts', 'utf8');
const migration = fs.readFileSync('db/migrations/0026_add_agent_accountability_phase1.sql', 'utf8');

assert.match(service, /validateRequiredString\(payload\.vendor_id, 'Vendor'\)/);
assert.match(route, /session\.role === 'agent' \? session\.userId : undefined/);
assert.match(repository, /vendor_id/);
assert.match(accountability, /pending_delivery/);
assert.match(accountability, /delivery_activation/);
assert.match(accountability, /appendPendingLines/);
assert.match(accountability, /FOR UPDATE/);
assert.match(accountability, /operation_id/);
assert.match(service, /default_unit_price/);
assert.match(service, /amount: quantity \* unitValue/);
assert.match(migration, /agent_accountability_cases/);
assert.match(migration, /agent_accountability_events/);
assert.match(migration, /UNIQUE KEY ux_agent_accountability_event_operation/);
assert.doesNotMatch(service, /vendor_balances/);
assert.match(accountability, /vendor_balances/);

console.log('agent-accountability-phase1: all assertions passed');
