import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('dormant vendors use the existing fourteen-day qualifying-payment rule and server-side filters', () => {
  const api = read('src/app/api/vendors/route.ts');
  assert.match(api, /status === 'dormant'/);
  assert.match(api, /COALESCE\(is_reversed, 0\) = 0/);
  assert.match(api, /INTERVAL 14 DAY/);
  assert.match(api, /vendor_type_id/);
  assert.match(api, /latest_visit_date/);
});

test('dormant card and modal are available to agents without bypassing vendor API scoping', () => {
  const dashboard = read('src/components/dashboard/dashboard-shell.tsx');
  const modal = read('src/components/dashboard/dormant-vendors-modal.tsx');
  const api = read('src/app/api/vendors/route.ts');
  assert.match(dashboard, /label: 'Dormant vendors'/);
  assert.match(dashboard, /isAgent && isDormantOpen/);
  assert.match(modal, /Location/);
  assert.match(modal, /Vendor type/);
  assert.match(modal, /last_visit_date/);
  assert.match(api, /isAgentRole\(session\.role\)/);
  assert.match(api, /session_sales_rep_id/);
});

test('admin dormant status opens the shared filtered dormant modal', () => {
  const ui = read('src/components/dashboard/admin-control-center.tsx');
  assert.match(ui, /status\.statusId === 'dormant'/);
  assert.match(ui, /kind: 'dormant'/);
  assert.match(ui, /DormantVendorsModal/);
});
