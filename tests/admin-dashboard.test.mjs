import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('admin dashboard summary is a dedicated admin-only API', () => {
  const route = read('src/app/api/admin/dashboard/summary/route.ts');
  assert.match(route, /getVerifiedSession/);
  assert.match(route, /isAdminRole\(session\.role\)/);
  assert.match(route, /forbiddenResponse\(\)/);
  assert.match(route, /getAdminDashboardSummary/);
  assert.doesNotMatch(route, /isAdminOrSupervisorRole/);
});

test('admin control center is shown only to admin and super_admin in the dashboard shell', () => {
  const shell = read('src/components/dashboard/dashboard-shell.tsx');
  assert.match(shell, /AdminControlCenter/);
  assert.match(shell, /role === 'admin' \|\| role === 'super_admin'/);
  assert.match(shell, /return <AdminControlCenter \/>/);
  assert.match(shell, /const isAgent = role === 'agent'/);
});

test('summary service validates date filters and defaults to a period range', () => {
  const service = read('src/services/adminDashboardService.ts');
  assert.match(service, /normalizeAdminDashboardFilters/);
  assert.match(service, /\^\\d\{4\}-\\d\{2\}-\\d\{2\}\$/);
  assert.match(service, /startDate must be before or equal to endDate/);
  assert.match(service, /defaultStartDate/);
});

test('dashboard repository performs server-side aggregation without using stock_sold as a KPI', () => {
  const repository = read('src/repositories/AdminDashboardRepository.ts');
  assert.match(repository, /SUM\(vl\.cash_collected\)/);
  assert.match(repository, /SUM\(vl\.stock_added\)/);
  assert.match(repository, /SUM\(vl\.expected_cash\)/);
  assert.match(repository, /COALESCE\(vl\.is_reversed, 0\) = 0/);
  assert.doesNotMatch(repository, /vl\.stock_sold|SUM\([^)]*stock_sold/);
  assert.match(repository, /GROUP BY vl\.date/);
});

test('vendor balances use vendor_balances and do not recompute balances in React', () => {
  const repository = read('src/repositories/AdminDashboardRepository.ts');
  const ui = read('src/components/dashboard/admin-control-center.tsx');
  assert.match(repository, /FROM vendor_balances vb/);
  assert.match(repository, /vb\.balance_owed > 0/);
  assert.match(repository, /vb\.balance_owed < 0/);
  assert.match(ui, /Vendor Balances/);
  assert.match(ui, /Vendor Balances Owing/);
  assert.doesNotMatch(ui, /total_expected_cash.*cash_collected/);
});

test('outstanding deliveries use pending and ongoing statuses through JSON item aggregation', () => {
  const repository = read('src/repositories/AdminDashboardRepository.ts');
  assert.match(repository, /JSON_TABLE/);
  assert.match(repository, /d\.status IN \('pending', 'ongoing'\)/);
  assert.doesNotMatch(repository, /delivered'.*outstanding/s);
  assert.doesNotMatch(repository, /cancelled'.*outstanding/s);
});

test('factory metrics are operational and exclude reversed events', () => {
  const repository = read('src/repositories/AdminDashboardRepository.ts');
  const ui = read('src/components/dashboard/admin-control-center.tsx');
  assert.match(repository, /factory_inventory/);
  assert.match(repository, /factory_movement_events/);
  assert.match(repository, /e\.status = \\\'active\\\'/);
  assert.match(ui, /Factory Finished Stock/);
  assert.match(ui, /Factory Operations/);
  assert.doesNotMatch(ui, /Factory Sales/);
});

test('dashboard response is strongly typed and structured by management sections', () => {
  const types = read('src/lib/types/admin-dashboard.ts');
  for (const key of ['snapshot', 'trends', 'locations', 'products', 'salesReps', 'deliveries', 'factory', 'attention', 'dataQuality']) {
    assert.match(types, new RegExp(key));
  }
  assert.match(types, /AdminDashboardSummary/);
  assert.match(types, /AdminDashboardTrendMetric/);
});

test('dashboard filters are explicit and preserve current-state versus period semantics', () => {
  const ui = read('src/components/dashboard/admin-control-center.tsx');
  const repository = read('src/repositories/AdminDashboardRepository.ts');
  for (const label of ['Start date', 'End date', 'Product', 'Location', 'Sales Representative']) {
    assert.match(ui, new RegExp(label));
  }
  assert.match(ui, /Current-state cards stay current/);
  assert.match(repository, /vendorConditions/);
  assert.match(repository, /visitConditions/);
});

test('management UI avoids completed-sales and revenue terminology for supply metrics', () => {
  const ui = read('src/components/dashboard/admin-control-center.tsx');
  assert.match(ui, /Cash Collected/);
  assert.match(ui, /Supplied Quantity/);
  assert.match(ui, /Supplied Value/);
  assert.doesNotMatch(ui, /Customer Sales/);
  assert.doesNotMatch(ui, /Units Sold/);
  assert.doesNotMatch(ui, /Revenue by Product/);
});

test('location, product, sales representative, and attention sections are present', () => {
  const ui = read('src/components/dashboard/admin-control-center.tsx');
  const repository = read('src/repositories/AdminDashboardRepository.ts');
  for (const label of ['Supply by Location', 'Supply by Product', 'Sales Representative Activity', 'Needs Attention', 'Vendor Balances Owing']) {
    assert.match(ui, new RegExp(label));
  }
  assert.match(repository, /Actor unavailable - historical record/);
  assert.match(ui, /Unknown location/);
});

test('location aggregation is deterministic under only_full_group_by', () => {
  const repository = read('src/repositories/AdminDashboardRepository.ts');
  assert.match(repository, /location_activity/);
  assert.match(repository, /active_vendor_counts/);
  assert.match(repository, /ON active_vendor_counts\.location = location_activity\.location/);
  assert.doesNotMatch(repository, /= COALESCE\(NULLIF\(TRIM\(v\.location\), ''\), 'Unknown location'\)/);
});

test('dashboard has loading, empty, error, metric switching, and drill-down links', () => {
  const ui = read('src/components/dashboard/admin-control-center.tsx');
  assert.match(ui, /Loading Admin Control Center/);
  assert.match(ui, /Unable to load dashboard summary/);
  assert.match(ui, /No period activity found/);
  assert.match(ui, /MetricTabs/);
  for (const href of ['/transactions', '/vendors', '/deliveries', '/factory', '/factory/production', '/factory/movements']) {
    assert.match(ui, new RegExp(href.replace(/\//g, '\\/')));
  }
});

test('react query hook uses a scoped dashboard query key', () => {
  const hook = read('src/lib/hooks/use-admin-dashboard-summary.ts');
  const api = read('src/lib/api/adminDashboard.ts');
  assert.match(hook, /\['adminDashboardSummary', filters\]/);
  assert.match(hook, /getAdminDashboardSummary/);
  assert.match(api, /\/api\/admin\/dashboard\/summary/);
});
