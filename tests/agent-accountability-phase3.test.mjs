import assert from 'node:assert/strict';
import fs from 'node:fs';

const migration = fs.readFileSync('db/migrations/0028_add_agent_accountability_transfers.sql', 'utf8');
const repository = fs.readFileSync('src/repositories/AgentAccountabilityRepository.ts', 'utf8');
const service = fs.readFileSync('src/services/agentAccountabilityService.ts', 'utf8');
const details = fs.readFileSync('src/components/deliveries/delivery-details.tsx', 'utf8');
const routes = [
  fs.readFileSync('src/app/api/deliveries/[deliveryId]/accountability/transfers/route.ts', 'utf8'),
  fs.readFileSync('src/app/api/accountability/transfers/[transferId]/route.ts', 'utf8'),
].join('\n');
const transferRoute = fs.readFileSync('src/app/api/deliveries/[deliveryId]/accountability/transfers/route.ts', 'utf8');

assert.match(migration, /CREATE TABLE IF NOT EXISTS agent_accountability_transfers/);
assert.match(migration, /status ENUM\('pending','accepted','rejected','cancelled'\)/);
assert.match(migration, /from_agent_user_id/);
assert.match(migration, /to_agent_user_id/);
assert.match(migration, /requested_amount DECIMAL/);
assert.match(migration, /accepted_amount DECIMAL/);
assert.match(migration, /UNIQUE KEY ux_agent_accountability_transfer_operation/);
assert.match(repository, /SELECT \* FROM agent_accountability_cases[\s\S]*FOR UPDATE/);
assert.match(repository, /status = 'pending'/);
assert.match(repository, /Only active accountability can be transferred/);
assert.match(repository, /A transfer is already awaiting acknowledgement/);
assert.match(repository, /transfer_out/);
assert.match(repository, /transfer_in/);
assert.match(repository, /accountable_agent_user_id = :agent_user_id/);
assert.match(repository, /currentCaseValue/);
assert.match(repository, /app_users WHERE role = 'agent' AND status = 'active'/);
assert.match(service, /Only the accountable agent can initiate this transfer/);
assert.match(service, /Recipient must be an active agent/);
assert.match(service, /decideAccountabilityTransfer/);
assert.match(service, /TransactionJournalRepository/);
assert.match(routes, /accept.*reject.*cancel/);
assert.doesNotMatch(details, /Accountability transfers/);
assert.match(transferRoute, /parts\[parts\.length - 3\]/);
assert.match(repository, /vendor_balances/);
assert.doesNotMatch(repository, /vendor_inventory/);
console.log('agent-accountability-phase3: all assertions passed');
