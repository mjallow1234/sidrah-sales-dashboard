import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { ACCESS_CATALOG, roleAllowsAccess } from '../src/lib/authorization.ts';

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('Factory pages and navigation enforce factory.view', () => {
  for (const page of ['src/app/factory/page.tsx', 'src/app/factory/production/page.tsx', 'src/app/factory/movements/page.tsx', 'src/app/factory/containers/page.tsx', 'src/app/factory/records/page.tsx']) {
    assert.match(read(page), /getPagePermission\('factory\.view'\)/);
  }
  assert.match(read('src/app/factory/expenses/page.tsx'), /getPagePermission\('factory\.expenses\.manage'\)/);
  assert.match(read('src/components/layout/admin-layout.tsx'), /useEffectivePermissionQuery\('factory\.view'/);
  assert.match(read('src/components/ui/mobile-bottom-nav.tsx'), /useEffectivePermissionQuery\('factory\.view'/);
});

test('Factory APIs use canonical permissions where the catalog is precise', () => {
  assert.match(read('src/app/api/factory/inventory/route.ts'), /requirePermission\(request, 'factory\.view'\)/);
  const movements = read('src/app/api/factory/movements/route.ts');
  assert.match(movements, /requirePermission\(request, 'factory\.view'\)/);
  assert.match(movements, /factory\.production\.create/);
  assert.match(read('src/app/api/factory/movements/reverse/route.ts'), /factory\.records\.reverse/);
  assert.match(read('src/app/api/factory/containers/movements/reverse/route.ts'), /factory\.records\.reverse/);
  assert.match(read('src/app/api/factory/expenses/route.ts'), /factory\.expenses\.manage/);
  assert.match(read('src/app/api/factory/expenses/[expenseId]/route.ts'), /factory\.expenses\.manage/);
});

test('Factory role ceiling remains unchanged', () => {
  assert.equal(roleAllowsAccess('foreman', ACCESS_CATALOG.factoryView), true);
  assert.equal(roleAllowsAccess('foreman', ACCESS_CATALOG.factoryProductionCreate), true);
  assert.equal(roleAllowsAccess('foreman', ACCESS_CATALOG.factoryMovementsCreate), false);
  assert.equal(roleAllowsAccess('foreman', ACCESS_CATALOG.factoryRecordsReverse), false);
  assert.equal(roleAllowsAccess('foreman', ACCESS_CATALOG.factoryExpensesManage), false);
  assert.equal(roleAllowsAccess('agent', ACCESS_CATALOG.factoryView), false);
  assert.equal(roleAllowsAccess('delivery', ACCESS_CATALOG.factoryView), false);
  assert.equal(roleAllowsAccess('supervisor', ACCESS_CATALOG.factoryView), false);
});

test('Factory role and business safeguards remain in operation routes', () => {
  const movements = read('src/app/api/factory/movements/route.ts');
  const reverse = read('src/app/api/factory/movements/reverse/route.ts');
  assert.match(movements, /isFactoryRole/);
  assert.match(reverse, /canReverseFactoryRecords/);
  assert.match(reverse, /reverseFactoryMovement/);
  assert.match(read('src/app/api/factory/containers/movements/reverse/route.ts'), /canReverseFactoryRecords/);
});

test('Foreman movement creation preserves the existing role boundary when no precise permission exists', () => {
  const movements = read('src/app/api/factory/movements/route.ts');
  assert.match(movements, /payload\?\.movement_type === 'production'/);
  assert.match(movements, /factory\.movements\.create/);
  assert.match(movements, /await getVerifiedSession\(request\)/);
  assert.match(movements, /isFactoryRole/);
});

test('No new Factory permission migration was created', () => {
  assert.equal(fs.existsSync(new URL('../db/migrations/0041_factory_permissions.sql', import.meta.url)), false);
});
