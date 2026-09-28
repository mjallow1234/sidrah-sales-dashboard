import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const routes = [
  'src/app/api/deliveries/[deliveryId]/accountability/route.ts',
  'src/app/api/deliveries/[deliveryId]/accountability/collections/route.ts',
  'src/app/api/deliveries/[deliveryId]/accountability/returns/route.ts',
  'src/app/api/deliveries/[deliveryId]/accountability/transfers/route.ts',
  'src/app/api/accountability/agents/route.ts',
  'src/app/api/accountability/transfers/route.ts',
  'src/app/api/accountability/transfers/[transferId]/route.ts',
  'src/app/api/accountability/payment-options/route.ts',
];

for (const path of routes) {
  const source = read(path);
  assert.match(source, /isAdminOrSupervisorRole/);
  assert.doesNotMatch(source, /\[\s*['"]agent['"]/);
}

const service = read('src/services/agentAccountabilityService.ts');
assert.match(service, /if \(!isElevated\(role\)\) throw/);
assert.match(service, /if \(!canOversee\(input\.role\)\) throw/);

const details = read('src/components/deliveries/delivery-details.tsx');
assert.doesNotMatch(details, /useDeliveryAccountabilityQuery/);
assert.doesNotMatch(details, /useRecordAccountability(Collection|Return)/);
assert.doesNotMatch(details, /Agent Accountability/);

console.log('agent-accountability-access: all assertions passed');
