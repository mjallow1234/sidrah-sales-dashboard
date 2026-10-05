import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { ACCESS_CATALOG, roleAllowsAccess } from '../src/lib/authorization.ts';

const read = (file) => fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');

const readRoutes = [
  'src/app/api/accountability/agents/route.ts',
  'src/app/api/accountability/summary/route.ts',
  'src/app/api/accountability/cases/route.ts',
  'src/app/api/accountability/agents/[agentId]/breakdown/route.ts',
  'src/app/api/accountability/cash/route.ts',
  'src/app/api/accountability/cash/handovers/route.ts',
  'src/app/api/accountability/payment-options/route.ts',
  'src/app/api/accountability/transfers/route.ts',
  'src/app/api/deliveries/[deliveryId]/accountability/route.ts',
];

test('Accountability read routes require accountability.view', () => {
  for (const route of readRoutes) assert.match(read(route), /requirePermission\(request, 'accountability\.view'\)/, route);
});

test('Accountability navigation uses role access plus effective view permission', () => {
  const desktop = read('src/components/layout/admin-layout.tsx');
  const mobile = read('src/components/ui/mobile-bottom-nav.tsx');
  assert.match(desktop, /useEffectivePermissionQuery\('accountability\.view'/);
  assert.match(desktop, /startsWith\('\/accountability'\).*accountabilityPermission/);
  assert.match(mobile, /useEffectivePermissionQuery\('accountability\.view'/);
  assert.match(mobile, /label: 'Accountability'/);
});

test('Accountability role ceiling remains unchanged', () => {
  for (const role of ['admin', 'super_admin', 'supervisor']) assert.equal(roleAllowsAccess(role, ACCESS_CATALOG.accountabilityView), true);
  for (const role of ['agent', 'delivery', 'foreman']) assert.equal(roleAllowsAccess(role, ACCESS_CATALOG.accountabilityView), false);
});

test('View permission remains independent from mutation permissions', () => {
  const auth = read('src/lib/authorization.ts');
  assert.match(auth, /accountabilityView: 'accountability\.view'/);
  assert.match(auth, /accountabilityCollectionsManage: 'accountability\.collections\.manage'/);
  assert.match(auth, /accountabilityHandoversManage: 'accountability\.handovers\.manage'/);
  assert.match(auth, /accountabilityAssign: 'accountability\.assign'/);
});

test('Read enforcement does not alter Accountability mutation routes or business logic', () => {
  const cash = read('src/app/api/accountability/cash/route.ts');
  const collection = read('src/app/api/deliveries/[deliveryId]/accountability/collections/route.ts');
  const returns = read('src/app/api/deliveries/[deliveryId]/accountability/returns/route.ts');
  assert.match(cash, /recordCompanyCashHandover/);
  assert.doesNotMatch(cash.split('export async function POST')[1] ?? '', /accountability\.view/);
  assert.doesNotMatch(collection, /accountability\.view/);
  assert.doesNotMatch(returns, /accountability\.view/);
});

test('Sensitive Accountability mutations require their dedicated permissions', () => {
  const cash = read('src/app/api/accountability/cash/route.ts');
  const collection = read('src/app/api/deliveries/[deliveryId]/accountability/collections/route.ts');
  const returns = read('src/app/api/deliveries/[deliveryId]/accountability/returns/route.ts');
  assert.match(collection, /requirePermission\(request, 'accountability\.collections\.manage'\)/);
  assert.match(returns, /requirePermission\(request, 'accountability\.collections\.manage'\)/);
  assert.match(cash, /requirePermission\(request, 'accountability\.handovers\.manage'\)/);
  assert.doesNotMatch(collection, /accountability\.handovers\.manage/);
  assert.doesNotMatch(returns, /accountability\.handovers\.manage/);
  assert.doesNotMatch(cash.split('export async function POST')[1] ?? '', /accountability\.view/);
});

test('Collection and handover permissions remain independent and role-ceiling limited', () => {
  for (const role of ['admin', 'super_admin', 'supervisor']) {
    assert.equal(roleAllowsAccess(role, 'accountability.collections.manage'), true, role);
    assert.equal(roleAllowsAccess(role, 'accountability.handovers.manage'), true, role);
  }
  for (const role of ['agent', 'delivery', 'foreman']) {
    assert.equal(roleAllowsAccess(role, 'accountability.collections.manage'), false, role);
    assert.equal(roleAllowsAccess(role, 'accountability.handovers.manage'), false, role);
  }
});

test('Transfers and vendor assignment remain outside Phase 4G-2', () => {
  const transfer = read('src/app/api/accountability/transfers/[transferId]/route.ts');
  const deliveryTransfer = read('src/app/api/deliveries/[deliveryId]/accountability/transfers/route.ts');
  const assignment = read('src/app/api/vendors/[id]/accountability/route.ts');
  assert.doesNotMatch(transfer, /accountability\.(collections\.manage|handovers\.manage)/);
  assert.doesNotMatch(deliveryTransfer, /accountability\.(collections\.manage|handovers\.manage)/);
  assert.match(assignment, /vendors\.assign/);
});

test('Handover UI is restricted without changing the management read experience', () => {
  const page = read('src/app/accountability/page.tsx');
  assert.match(page, /useEffectivePermissionQuery\('accountability\.handovers\.manage'/);
  assert.match(page, /handoverPermission\.data !== true/);
  assert.match(page, /useAccountabilityManagementSummary\(management\)/);
});

test('Accountability pages retain middleware role protection while remaining client-rendered', () => {
  const middleware = read('src/middleware.ts');
  assert.match(middleware, /'\/accountability\/:path\*'/);
  assert.match(read('src/lib/authorization.ts'), /pathname === '\/accountability'|pathname\.startsWith\('\/accountability\/'\)/);
  for (const page of ['src/app/accountability/page.tsx', 'src/app/accountability/agents/[agentId]/page.tsx', 'src/app/accountability/agents/[agentId]/cases/[deliveryId]/page.tsx']) {
    assert.match(read(page), /'use client'/, page);
  }
});
