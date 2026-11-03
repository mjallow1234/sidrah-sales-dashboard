import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('vendor statistics endpoint requires an authenticated Admin or Super Admin directly', () => {
  const route = read('src/app/api/vendors/statistics/route.ts');
  assert.match(route, /getVerifiedSession\(request\)/);
  assert.match(route, /if \(!session\) return unauthorizedResponse\(\)/);
  assert.match(route, /session\.role !== 'admin' && session\.role !== 'super_admin'/);
  assert.match(route, /if \(session\.role !== 'admin' && session\.role !== 'super_admin'\) return forbiddenResponse\(\)/);
  assert.doesNotMatch(route, /requirePermission\(request, 'vendors\.view'\)/);
});

test('statistics use database counts and match the Vendor List effective active/inactive rules', () => {
  const route = read('src/app/api/vendors/statistics/route.ts');
  const vendorApi = read('src/app/api/vendors/route.ts');
  for (const metric of ['total_vendors', 'active_vendors', 'inactive_vendors', 'market_vendors', 'street_food_vendors', 'minimarkets', 'supermarkets', 'restaurants']) assert.match(route, new RegExp(metric));
  assert.match(route, /COUNT\(\*\) AS total_vendors/);
  assert.match(route, /MAX\(COALESCE\(timestamp, date\)\)/);
  assert.match(route, /COALESCE\(is_reversed, 0\) = 0/);
  assert.match(route, /INTERVAL 14 DAY/);
  assert.match(route, /v\.status = 'inactive'/);
  assert.match(route, /v\.status = 'active' OR \(v\.status = 'dormant'/);
  assert.match(vendorApi, /status === 'active'/);
  assert.match(vendorApi, /status === 'dormant'/);
});

test('Vendor List renders admin-only responsive database metrics and refreshes them after data changes', () => {
  const list = read('src/components/vendors/vendor-list.tsx');
  const hooks = read('src/lib/hooks/queries.ts');
  const api = read('src/lib/api/vendors.ts');
  assert.match(list, /session\?\.role === 'admin' \|\| session\?\.role === 'super_admin'/);
  assert.match(list, /useVendorStatisticsQuery\(isAdmin\)/);
  assert.match(list, /grid-cols-2[\s\S]*sm:grid-cols-4/);
  assert.match(api, /\/api\/vendors\/statistics/);
  assert.match(hooks, /queryKey: \['vendorStatistics'\]/);
  assert.match(hooks, /invalidateQueries\(\{ queryKey: \['vendorStatistics'\] \}\)/);
  assert.match(hooks, /queryKey: \['vendorStatistics'\][\s\S]{0,120}staleTime: 0/);
});

test('vendor identity APIs and main selection/detail views propagate the secondary ID', () => {
  const listApi = read('src/app/api/vendors/route.ts');
  const detailApi = read('src/app/api/vendors/[id]/route.ts');
  const list = read('src/components/vendors/vendor-list.tsx');
  const detail = read('src/components/vendors/vendor-details-shell.tsx');
  const visit = read('src/components/forms/visit-form.tsx');
  const supply = read('src/components/forms/supply-form.tsx');
  const delivery = read('src/components/deliveries/delivery-form.tsx');
  const deliveryRepository = read('src/repositories/DeliveryRepository.ts');
  const deliveryCard = read('src/components/deliveries/delivery-card.tsx');
  const dashboard = read('src/components/dashboard/admin-control-center.tsx');
  assert.match(listApi, /v\.secondary_vendor_id/);
  assert.match(listApi, /secondary_vendor_id: row\.secondary_vendor_id/);
  assert.match(detailApi, /v\.secondary_vendor_id/);
  assert.match(detailApi, /secondary_vendor_id: row\.secondary_vendor_id/);
  for (const file of [list, detail, visit, supply, delivery, deliveryRepository, deliveryCard, dashboard]) assert.match(file, /secondary_vendor_id|secondaryVendorId/);
});
