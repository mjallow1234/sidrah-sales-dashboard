import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { ACCESS_CATALOG, roleAllowsAccess } from '../src/lib/authorization.ts';

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('vendor APIs enforce the corresponding permission keys', () => {
  const list = read('src/app/api/vendors/route.ts');
  const detail = read('src/app/api/vendors/[id]/route.ts');
  const assignment = read('src/app/api/vendors/[id]/accountability/route.ts');
  const location = read('src/app/api/vendors/[id]/location/route.ts');
  assert.match(list, /requirePermission\(request, 'vendors\.view'\)/);
  assert.match(list, /requirePermission\(request, 'vendors\.create'\)/);
  assert.match(detail, /requirePermission\(request, 'vendors\.view'\)/);
  assert.match(detail, /requirePermission\(request, 'vendors\.edit'\)/);
  assert.match(assignment, /requirePermission\(request, 'vendors\.assign'\)/);
  assert.match(location, /requirePermission\(request, 'vendors\.view'\)/);
  assert.match(location, /requirePermission\(request, 'vendors\.edit'\)/);
});

test('vendor page guards and navigation apply vendors.view without replacing role checks', () => {
  assert.match(read('src/app/vendors/page.tsx'), /getPagePermission\('vendors\.view'\)/);
  assert.match(read('src/app/vendors/[id]/page.tsx'), /getPagePermission\('vendors\.view'\)/);
  assert.match(read('src/app/vendors/new/page.tsx'), /getPagePermission\('vendors\.create'\)/);
  assert.match(read('src/app/vendors/[id]/edit/page.tsx'), /getPagePermission\('vendors\.edit'\)/);
  const layout = read('src/components/layout/admin-layout.tsx');
  const mobile = read('src/components/ui/mobile-bottom-nav.tsx');
  assert.match(layout, /useEffectivePermissionQuery\('vendors\.view'/);
  assert.match(mobile, /useEffectivePermissionQuery\('vendors\.view'/);
});

test('role ceiling still prevents specialized roles from gaining vendor access', () => {
  assert.equal(roleAllowsAccess('agent', ACCESS_CATALOG.vendorsView), true);
  assert.equal(roleAllowsAccess('delivery', ACCESS_CATALOG.vendorsView), false);
  assert.equal(roleAllowsAccess('foreman', ACCESS_CATALOG.vendorsView), false);
});

test('vendor permission endpoint never accepts a user id from the browser', () => {
  const route = read('src/app/api/permissions/me/route.ts');
  assert.match(route, /getVerifiedSession/);
  assert.match(route, /session\.userId/);
  assert.doesNotMatch(route, /userId.*searchParams/);
});
