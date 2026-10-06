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

test('delivery role ceiling allows completion without broadening other actions', () => {
  assert.equal(roleAllowsAccess('delivery', ACCESS_CATALOG.deliveriesView), true);
  assert.equal(roleAllowsAccess('delivery', ACCESS_CATALOG.deliveriesClaim), true);
  assert.equal(roleAllowsAccess('delivery', ACCESS_CATALOG.deliveriesDeliver), true);
  assert.equal(roleAllowsAccess('delivery', ACCESS_CATALOG.deliveriesCreate), false);
  assert.equal(roleAllowsAccess('delivery', ACCESS_CATALOG.deliveriesAssign), false);
  assert.equal(roleAllowsAccess('delivery', ACCESS_CATALOG.deliveriesReassign), false);
  assert.equal(roleAllowsAccess('delivery', ACCESS_CATALOG.deliveriesCancel), false);
  assert.equal(roleAllowsAccess('agent', ACCESS_CATALOG.deliveriesClaim), true);
  assert.equal(roleAllowsAccess('foreman', ACCESS_CATALOG.deliveriesView), false);
});

test('delivery completion UI follows the effective permission while retaining ownership checks', () => {
  const details = read('src/components/deliveries/delivery-details.tsx');
  assert.match(details, /useEffectivePermissionQuery\('deliveries\.deliver'/);
  assert.match(details, /deliverPermission\.data === true/);
  assert.match(details, /delivery\?\.claimed_by === currentUserId/);
});

test('delivery completion keeps override denial and service ownership safeguards', () => {
  const evaluator = read('src/lib/server/permissionEvaluator.ts');
  const service = read('src/repositories/DeliveryRepository.ts');
  assert.match(evaluator, /if \(effect === 'deny'\) return \{ allowed: false/);
  assert.match(service, /current\.status.*ongoing.*current\.claimed_by.*claimedBy/);
});

test('effective permission cache identity includes authenticated user and role', () => {
  const hooks = read('src/lib/hooks/userQueries.ts');
  assert.match(hooks, /const userId = authQuery\.data\?\.userId/);
  assert.match(hooks, /const role = authQuery\.data\?\.role/);
  assert.match(hooks, /queryKey: \['effectivePermission', userId, role, permissionKey\]/);
  assert.match(hooks, /enabled: queryEnabled/);
});

test('delivery users can query only their own effective permission result', () => {
  const route = read('src/app/api/permissions/me/route.ts');
  const middleware = read('src/middleware.ts');
  assert.match(route, /getVerifiedSession/);
  assert.match(route, /session\.userId/);
  assert.match(route, /isAccessKey\(permissionKey\)/);
  assert.doesNotMatch(route, /userId.*searchParams/);
  assert.match(middleware, /pathname === '\/api\/permissions\/me'/);
  assert.match(middleware, /!isOwnPermissionApi/);
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
