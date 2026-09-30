import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
test('CRM implementation has no platform write dependencies', () => { const service = read('src/services/crmLeadService.ts'); const repository = read('src/repositories/CrmLeadRepository.ts'); assert.doesNotMatch(service, /VendorRepository|DeliveryRepository|InventoryRepository|AccountabilityRepository|TransactionJournal/i); assert.doesNotMatch(repository, /vendors|deliveries|vendor_balances|vendor_inventory|accountability/i); });
test('CRM access explicitly excludes delivery and foreman roles', () => { const auth = read('src/lib/authorization.ts'); assert.match(auth, /pathname === \'\/crm\'|pathname\.startsWith\(\'\/crm\/'/); assert.match(auth, /isAgentRole\(role\) \|\| isAdminOrSupervisorRole\(role\)/); });
test('CRM conversion is status-only', () => { const service = read('src/services/crmLeadService.ts'); assert.match(service, /status\(input\.status\)/); assert.doesNotMatch(service, /createVendor|createDelivery|createInventory|recordAccountability/i); });
