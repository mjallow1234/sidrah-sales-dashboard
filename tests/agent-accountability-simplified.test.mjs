import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const repository = read('src/repositories/AgentAccountabilityRepository.ts');
const deliveryRepository = read('src/repositories/DeliveryRepository.ts');
const visitService = read('src/services/visitService.ts');
const details = read('src/components/deliveries/delivery-details.tsx');
const migration = read('db/migrations/0030_add_accountability_visit_link.sql');
const summary = read('src/app/accountability/page.tsx');

assert.match(migration, /source_visit_id/);
assert.match(migration, /REFERENCES visit_logs/);
assert.match(repository, /createVisitCollection/);
assert.match(repository, /source_visit_id/);
assert.match(repository, /event_type IN \('delivery_activation','stock_return','cash_handover','transfer_out','transfer_in'\)/);
assert.doesNotMatch(deliveryRepository, /agent_accountability_events/);
assert.match(visitService, /createVisitCollection/);
assert.match(visitService, /isAgentRole\(payload\.actor_role\)/);
assert.doesNotMatch(details, /Agent Accountability/);
assert.match(summary, /Pending stock/);
assert.match(summary, /Active stock/);
assert.match(summary, /Cash collected/);
assert.match(summary, /Cash handed over/);
assert.match(summary, /Cash outstanding/);

console.log('agent-accountability-simplified: all assertions passed');
