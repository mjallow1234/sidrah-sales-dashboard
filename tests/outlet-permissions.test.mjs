import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { ACCESS_CATALOG, roleAllowsAccess } from '../src/lib/authorization.ts';

const read = (file) => fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');

test('Outlet pages use the server-side view permission', () => {
  assert.match(read('src/app/outlets/page.tsx'), /getPagePermission\('outlets\.view'\)/);
  assert.match(read('src/app/outlets/[outletId]/page.tsx'), /getPagePermission\('outlets\.view'\)/);
});

test('Outlet navigation uses outlets.view on desktop and mobile', () => {
  assert.match(read('src/components/layout/admin-layout.tsx'), /useEffectivePermissionQuery\('outlets\.view'/);
  assert.match(read('src/components/layout/admin-layout.tsx'), /startsWith\('\/outlets'\).*outletsPermission/);
  assert.match(read('src/components/ui/mobile-bottom-nav.tsx'), /useEffectivePermissionQuery\('outlets\.view'/);
  assert.match(read('src/components/ui/mobile-bottom-nav.tsx'), /label: 'Outlets'/);
});

test('Outlet APIs map read and write operations to the approved permissions', () => {
  const list = read('src/app/api/outlets/route.ts');
  const detail = read('src/app/api/outlets/[outletId]/route.ts');
  const sales = read('src/app/api/outlets/[outletId]/sales/route.ts');
  const stock = read('src/app/api/outlets/[outletId]/stock/route.ts');
  assert.match(list, /requirePermission\(request, 'outlets\.view'\)/);
  assert.match(list, /requirePermission\(request, 'outlets\.manage'\)/);
  assert.match(detail, /requirePermission\(request, 'outlets\.view'\)/);
  assert.match(detail, /requirePermission\(request, 'outlets\.manage'\)/);
  assert.match(sales, /requirePermission\(request, 'outlets\.view'\)/);
  assert.match(sales, /requirePermission\(request, 'outlets\.sales\.record'\)/);
  assert.match(stock, /requirePermission\(request, 'outlets\.view'\)/);
  assert.match(stock, /requirePermission\(request, 'outlets\.stock\.receive'\)/);
});

test('Outlet permissions remain independent and role-ceiling limited', () => {
  assert.equal(ACCESS_CATALOG.outletsView, 'outlets.view');
  assert.equal(ACCESS_CATALOG.outletsManage, 'outlets.manage');
  assert.equal(ACCESS_CATALOG.outletsSalesRecord, 'outlets.sales.record');
  assert.equal(ACCESS_CATALOG.outletsStockReceive, 'outlets.stock.receive');
  for (const role of ['admin', 'super_admin']) {
    for (const key of Object.values(ACCESS_CATALOG).filter((value) => value.startsWith('outlets.'))) {
      assert.equal(roleAllowsAccess(role, key), true);
    }
  }
  for (const role of ['supervisor', 'agent', 'delivery', 'foreman']) {
    for (const key of Object.values(ACCESS_CATALOG).filter((value) => value.startsWith('outlets.'))) {
      assert.equal(roleAllowsAccess(role, key), false);
    }
  }
  assert.doesNotMatch(read('src/lib/authorization.ts'), /outlets\.manage.*outlets\.view/);
});

test('Existing Outlet role checks and business services remain present', () => {
  for (const file of [
    'src/app/api/outlets/route.ts',
    'src/app/api/outlets/[outletId]/route.ts',
    'src/app/api/outlets/[outletId]/sales/route.ts',
    'src/app/api/outlets/[outletId]/stock/route.ts',
  ]) assert.match(read(file), /isAdminRole/);
  assert.match(read('src/services/outletService.ts'), /assertAdmin/);
  assert.match(read('src/services/outletStockService.ts'), /assertAdmin/);
});
