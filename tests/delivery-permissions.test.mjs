import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { ACCESS_CATALOG, roleAllowsAccess } from '../src/lib/authorization.ts';

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('delivery pages enforce view/create permissions server-side', () => {
  assert.match(read('src/app/deliveries/page.tsx'), /getPagePermission\('deliveries\.view'\)/);
  assert.match(read('src/app/deliveries/[deliveryId]/page.tsx'), /getPagePermission\('deliveries\.view'\)/);
  assert.match(read('src/app/deliveries/new/page.tsx'), /getPagePermission\('deliveries\.create'\)/);
  const layout = read('src/components/layout/admin-layout.tsx');
  const mobile = read('src/components/ui/mobile-bottom-nav.tsx');
  assert.match(layout, /useEffectivePermissionQuery\('deliveries\.view'/);
  assert.match(mobile, /useEffectivePermissionQuery\('deliveries\.view'/);
});

test('delivery operation APIs use the canonical action permissions', () => {
  const checks = [
    ['src/app/api/deliveries/route.ts', "deliveries.view", "deliveries.create"],
    ['src/app/api/deliveries/[deliveryId]/route.ts', "deliveries.view"],
    ['src/app/api/deliveries/[deliveryId]/claim/route.ts', "deliveries.claim"],
    ['src/app/api/deliveries/[deliveryId]/reassign/route.ts', "deliveries.reassign"],
    ['src/app/api/deliveries/[deliveryId]/deliver/route.ts', "deliveries.deliver"],
    ['src/app/api/deliveries/[deliveryId]/cancel/route.ts', "deliveries.cancel"],
    ['src/app/api/deliveries/recommended-next/route.ts', "deliveries.view"],
  ];
  for (const [file, ...keys] of checks) {
    const source = read(file);
    for (const key of keys) assert.match(source, new RegExp(`requirePermission\\(request, '${key.replace('.', '\\.')}'\\)`));
  }
});

test('delivery role ceiling remains unchanged and prevents escalation', () => {
  assert.equal(roleAllowsAccess('delivery', ACCESS_CATALOG.deliveriesView), true);
  assert.equal(roleAllowsAccess('delivery', ACCESS_CATALOG.deliveriesClaim), true);
  assert.equal(roleAllowsAccess('delivery', ACCESS_CATALOG.deliveriesAssign), false);
  assert.equal(roleAllowsAccess('agent', ACCESS_CATALOG.deliveriesClaim), true);
  assert.equal(roleAllowsAccess('foreman', ACCESS_CATALOG.deliveriesView), false);
});

test('delivery APIs retain the existing role and ownership guards', () => {
  const claim = read('src/app/api/deliveries/[deliveryId]/claim/route.ts');
  const deliver = read('src/app/api/deliveries/[deliveryId]/deliver/route.ts');
  const reassign = read('src/app/api/deliveries/[deliveryId]/reassign/route.ts');
  assert.match(claim, /isDeliveryRole/);
  assert.match(deliver, /isDeliveryRole|isAdminOrSupervisorRole/);
  assert.match(reassign, /isAdminOrSupervisorRole/);
});

test('delivery permission enforcement introduces no migration', () => {
  const route = read('src/app/api/deliveries/route.ts');
  assert.match(route, /requirePermission/);
  assert.equal(fs.existsSync(new URL('../db/migrations/0041_delivery_permissions.sql', import.meta.url)), false);
});
