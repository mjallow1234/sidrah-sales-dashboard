import assert from 'node:assert/strict';
import fs from 'node:fs';

const repository = fs.readFileSync('src/repositories/AgentAccountabilityRepository.ts', 'utf8');
const service = fs.readFileSync('src/services/agentAccountabilityService.ts', 'utf8');
const collectionsRoute = fs.readFileSync('src/app/api/deliveries/[deliveryId]/accountability/collections/route.ts', 'utf8');
const returnsRoute = fs.readFileSync('src/app/api/deliveries/[deliveryId]/accountability/returns/route.ts', 'utf8');
const migration = fs.readFileSync('db/migrations/0027_add_accountability_collections_returns.sql', 'utf8');

assert.match(repository, /event_type = 'cash_collection'/);
assert.match(repository, /event_type = 'stock_return'/);
assert.match(repository, /FOR UPDATE/);
assert.match(repository, /Collection exceeds the remaining accountability/);
assert.match(repository, /Return exceeds the accountable quantity/);
assert.match(repository, /UNIQUE KEY|operation_id/);
assert.match(service, /findActiveOption/);
assert.match(service, /payment_option_id/);
assert.match(service, /recordAccountabilityCollection/);
assert.match(service, /recordAccountabilityReturn/);
assert.match(collectionsRoute, /recordAccountabilityCollection/);
assert.match(returnsRoute, /recordAccountabilityReturn/);
assert.match(migration, /payment_method/);
assert.match(migration, /collector_user_id/);
assert.match(repository, /vendor_balances/);
assert.doesNotMatch(service, /vendor_balances/);

console.log('agent-accountability-phase2: all assertions passed');
