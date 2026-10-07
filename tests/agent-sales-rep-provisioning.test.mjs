import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('agent creation provisions a sequential Sales Rep in one transaction', () => {
  const service = read('src/services/appUserService.ts');
  assert.match(service, /appUserPayload\.role === 'agent'/);
  assert.match(service, /transaction\(async \(connection\)/);
  assert.match(service, /createSalesRepInTransaction\(connection/);
  assert.match(service, /sales_rep_id: null/);
  assert.match(service, /transactionalRepository\.update\(createdUser\.user_id, \{ sales_rep_id: salesRep\.sales_rep_id \}\)/);
});

test('Sales Rep IDs are sequential and never random', () => {
  const service = read('src/services/salesRepService.ts');
  assert.match(service, /REGEXP '\^SR\[0-9\]\+\$'/);
  assert.match(service, /Math\.max\(highest, Number\(match\[1\]\)\)/);
  assert.match(service, /`SR\$\{String\(nextNumber\)\.padStart\(3, '0'\)\}`/);
  assert.doesNotMatch(service, /randomUUID/);
  assert.match(service, /WHERE sales_rep_id = \? LIMIT 1/);
});

test('both app-user creation routes share the provisioning service', () => {
  assert.match(read('src/app/api/users/route.ts'), /createAppUser/);
  assert.match(read('src/app/api/appusers/route.ts'), /createAppUser/);
});

test('agent role transitions provision only when the relationship is missing', () => {
  const service = read('src/services/appUserService.ts');
  assert.match(service, /!currentUser\.sales_rep_id/);
  assert.match(service, /requestedRole === 'agent'/);
  assert.match(service, /lockedUser\.sales_rep_id/);
  assert.match(service, /if \(!lockedUser\.sales_rep_id\)/);
});

test('changing away from agent does not delete Sales Rep records', () => {
  const service = read('src/services/appUserService.ts');
  assert.doesNotMatch(service, /delete.*salesRep|SalesRepRepository.*delete/i);
});
