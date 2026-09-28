import assert from 'node:assert/strict';
import fs from 'node:fs';

const migration = fs.readFileSync('db/migrations/0031_add_vendor_accountability_assignments.sql', 'utf8');
const assignmentRepository = fs.readFileSync('src/repositories/VendorAccountabilityAssignmentRepository.ts', 'utf8');
const accountabilityRepository = fs.readFileSync('src/repositories/AgentAccountabilityRepository.ts', 'utf8');
const handoverRepository = fs.readFileSync('src/repositories/AgentCashHandoverRepository.ts', 'utf8');
const deliveryService = fs.readFileSync('src/services/deliveryService.ts', 'utf8');

assert.match(migration, /CREATE TABLE IF NOT EXISTS agent_vendor_accountability_assignments/);
assert.match(migration, /starting_balance DECIMAL\(18,2\)/);
assert.match(migration, /FOREIGN KEY \(vendor_id\) REFERENCES vendors/);
assert.match(migration, /FOREIGN KEY \(agent_user_id\) REFERENCES app_users/);
assert.match(assignmentRepository, /SELECT balance_owed FROM vendor_balances/);
assert.match(assignmentRepository, /starting_balance: startingBalance/);
assert.match(deliveryService, /findActive\(vendorId\)/);
assert.match(deliveryService, /assignment_id: assignment\?\.assignment_id/);
assert.match(accountabilityRepository, /event_type IN \('delivery_activation','stock_return','cash_handover','transfer_out','transfer_in'\)/);
assert.match(handoverRepository, /Number\(row\.amount\) - Number\(row\.allocated\)/);
console.log('agent-accountability-vendor-assignment: all assertions passed');
