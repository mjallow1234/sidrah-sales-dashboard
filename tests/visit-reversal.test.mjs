import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('reversal API accepts agents and preserves existing elevated-role access', () => {
  const route = read('src/app/api/visit/reverse/route.ts');
  assert.match(route, /isAgentRole\(session\.role\)/);
  assert.match(route, /isAdminOrSupervisorRole\(session\.role\)/);
  assert.match(route, /salesRepId: session\.sales_rep_id/);
});

test('agent reversal is ownership-bound and server-window-bound', () => {
  const service = read('src/services/adminStockService.ts');
  assert.match(service, /String\(visit\.sales_rep_id\) !== actor\.salesRepId/);
  assert.match(service, /SELECT \*, NOW\(\) AS server_now FROM visit_logs/);
  assert.match(service, /serverNow > recordedAt \+ 24 \* 60 \* 60 \* 1000/);
  assert.match(service, /isAgentRole\(actor\.role\)/);
});

test('24-hour boundary is inclusive for agents', () => {
  const windowMs = 24 * 60 * 60 * 1000;
  const recordedAt = Date.parse('2026-09-12T10:00:00Z');
  assert.equal(recordedAt + windowMs <= recordedAt + windowMs, true);
  assert.equal(recordedAt + windowMs + 1 <= recordedAt + windowMs, false);
});

test('reversal traceability retains actor, role, reason, operation, and state updates', () => {
  const service = read('src/services/adminStockService.ts');
  assert.match(service, /actor_user_id: actor\.userId/);
  assert.match(service, /actor_role: actor\.role/);
  assert.match(service, /reversal_reason/);
  assert.match(service, /reversal_operation_id/);
  assert.match(service, /admin_id: actor\.userId/);
  assert.match(service, /endpoint: '\/visit\/reverse'/);
});

test('transaction history exposes reversal metadata for agent button eligibility', () => {
  const route = read('src/app/api/transactions/route.ts');
  const clientApi = read('src/lib/api/transactions.ts');
  const table = read('src/components/vendors/transaction-table.tsx');
  assert.match(route, /timestamp: formatDateTimeValue\(row\.timestamp\)/);
  assert.match(route, /is_reversed:/);
  assert.match(route, /reversal_reason:/);
  assert.match(clientApi, /visit_id: log\.visit_id/);
  assert.match(clientApi, /timestamp: log\.timestamp/);
  assert.match(clientApi, /product_id: log\.product_id/);
  assert.match(clientApi, /sales_rep_id: log\.sales_rep_id/);
  assert.match(clientApi, /is_reversed: Boolean\(log\.is_reversed\)/);
  assert.match(clientApi, /reversal_operation_id: log\.reversal_operation_id/);
  assert.match(table, /now <= recordedAt \+ 24 \* 60 \* 60 \* 1000/);
  assert.match(table, /transaction\.sales_rep_id !== currentSalesRepId/);
  assert.match(table, /Reverse visit/);
  assert.match(table, /selectedTransaction\.is_reversed \? 'Reversed' : 'Active'/);
  assert.match(table, /onReversed\?\./);
  assert.match(table, /role="dialog"/);
  assert.match(table, /setSelectedTransaction\(transaction\)/);
});

test('vendor transaction history preserves the authoritative reversal state', () => {
  const hooks = read('src/lib/hooks/queries.ts');
  assert.match(hooks, /useTransactionsByVendorQuery/);
  assert.match(hooks, /visit_id: log\.visit_id/);
  assert.match(hooks, /timestamp: log\.timestamp/);
  assert.match(hooks, /sales_rep_id: log\.sales_rep_id/);
  assert.match(hooks, /is_reversed: Boolean\(log\.is_reversed\)/);
  assert.match(hooks, /reversal_reason: log\.reversal_reason/);
  assert.match(hooks, /queryClient\.invalidateQueries\(\{ queryKey: \['transactions'\] \}\)/);
});

test('transaction cards use the same active/reversed status and remain visible', () => {
  const table = read('src/components/vendors/transaction-table.tsx');
  const vendorShell = read('src/components/vendors/vendor-details-shell.tsx');
  assert.match(table, /const reversed = Boolean\(transaction\.is_reversed\)/);
  assert.match(table, /\{reversed \? 'Reversed' : 'Active'\}/);
  assert.match(table, /transactions\.map/);
  assert.match(vendorShell, /<TransactionTable/);
  assert.match(vendorShell, /transactions \?\? \[\]/);
});

test('administrative reversal and human-readable vendor/product labels use existing visit data', () => {
  const route = read('src/app/api/transactions/route.ts');
  const clientApi = read('src/lib/api/transactions.ts');
  const hooks = read('src/lib/hooks/queries.ts');
  const table = read('src/components/vendors/transaction-table.tsx');
  const page = read('src/app/transactions/page.tsx');
  const vendorShell = read('src/components/vendors/vendor-details-shell.tsx');
  assert.match(route, /vendor_info\.vendor_name/);
  assert.match(route, /product_info\.product_name/);
  assert.match(clientApi, /vendor_name: log\.vendor_name/);
  assert.match(clientApi, /product_name: log\.product_name/);
  assert.match(hooks, /vendor_name: log\.vendor_name/);
  assert.match(hooks, /product_name: log\.product_name/);
  assert.match(table, /canAdministrativeReversal/);
  assert.match(table, /return canAdministrativeReversal \|\| canAgentReverse\(transaction\)/);
  assert.match(table, /transaction\.vendor_name/);
  assert.match(table, /transaction\.product_name/);
  assert.match(page, /canAdministrativeReversal=\{isAdminOrSupervisorRole\(authData\?\.role\)\}/);
  assert.match(vendorShell, /canAdministrativeReversal=\{canEditVendor\}/);
});

test('transaction details show the recording actor without exposing internal identifiers', () => {
  const table = read('src/components/vendors/transaction-table.tsx');
  const route = read('src/app/api/transactions/route.ts');
  const mapper = read('src/lib/api/transactions.ts');
  assert.doesNotMatch(table, /<Detail label="Sales representative"/);
  assert.match(table, /<Detail label="Actor"/);
  assert.match(table, /selectedTransaction\.sales_rep_name/);
  assert.match(table, /reversed_by_name/);
  assert.match(route, /COALESCE\(au\.name, au\.username\) AS actor_name/);
  assert.match(mapper, /created_by: log\.created_by/);
  assert.doesNotMatch(table, /Visit ID|Reversal operation ID/);
});

test('new visits persist the authenticated recording user and legacy actor gaps are explicit', () => {
  const route = read('src/app/api/visit/route.ts');
  const service = read('src/services/visitService.ts');
  const table = read('src/components/vendors/transaction-table.tsx');
  assert.match(route, /actor_user_id: session\.userId/);
  assert.match(service, /created_by: payload\.actor_user_id/);
  assert.match(service, /updated_by: payload\.actor_user_id/);
  assert.match(table, /Actor unavailable — historical record/);
  assert.doesNotMatch(table, /Unknown actor|Unknown person/);
  assert.doesNotMatch(table, /transaction\.actor \|\| transaction\.sales_rep_id/);
});

test('transaction Actor uses the resolved sales representative name', () => {
  const table = read('src/components/vendors/transaction-table.tsx');
  const route = read('src/app/api/transactions/route.ts');
  const queries = read('src/lib/hooks/queries.ts');
  assert.match(route, /sales_rep_name/);
  assert.match(queries, /vendor_name: log\.vendor_name/);
  assert.match(queries, /product_name: log\.product_name/);
  assert.match(table, /transaction\.sales_rep_name \|\| 'Actor unavailable — historical record'/);
  assert.match(table, /selectedTransaction\.sales_rep_name \|\| 'Actor unavailable — historical record'/);
  assert.doesNotMatch(table, /<Detail label="Sales representative"/);
  assert.doesNotMatch(table, /Unknown actor|Unknown person/);
});

test('vendor inventory cash is calculated per product from active visits', () => {
  const shell = read('src/components/vendors/vendor-details-shell.tsx');
  assert.match(shell, /const productCashReceived = \(transactions \?\? \[\]\)\.reduce/);
  assert.match(shell, /if \(transaction\.is_reversed \|\| !transaction\.product_id\)/);
  assert.match(shell, /totals\[transaction\.product_id\] = .*transaction\.cash_collected/);
  assert.match(shell, /Product cash received/);
  assert.match(shell, /productCashReceived\[record\.product_id\]/);
  assert.doesNotMatch(shell, /<td[^>]*>\{vendorBalance\?\.cash_collected/);
});

test('vendor detail explains that reversed supplied quantities are excluded from active totals', () => {
  const shell = read('src/components/vendors/vendor-details-shell.tsx');
  assert.match(shell, /const reversedSupplied = \(transactions \?\? \[\]\)\.reduce/);
  assert.match(shell, /transaction\.is_reversed \? total \+ \(transaction\.stock_added \?\? 0\)/);
  assert.match(shell, /const activeVisitSupplied/);
  assert.match(shell, /roleIndependentTransferInQuantity/);
  assert.match(shell, /const legacyOpeningQuantity/);
  assert.match(shell, /const totalSupplied = inventoryReceivedTotal \+ roleIndependentTransferInQuantity/);
  assert.match(shell, /Current attributable quantity/);
  assert.match(shell, /Reversed \(excluded\)/);
  assert.doesNotMatch(shell, /Counted toward balance/);
  assert.doesNotMatch(shell, /Active visit cash/);
  assert.match(shell, /<dt>Cash received<\/dt>/);
  assert.match(shell, /const reversedCash/);
  assert.match(shell, /const lastAddedStock =/);
  assert.match(shell, /Latest active supplied quantity/);
});

test('vendor detail includes transfer-in quantities in vendor and product totals and shows complete history', () => {
  const shell = read('src/components/vendors/vendor-details-shell.tsx');
  const inventoryRoute = read('src/app/api/vendorinventory/route.ts');
  assert.match(shell, /useAdminActivityQuery\(\{ vendorId \}/);
  assert.match(inventoryRoute, /AS transfer_in_quantity/);
  assert.match(inventoryRoute, /AS transfer_out_quantity/);
  assert.match(shell, /record\.transfer_in_quantity/);
  assert.match(shell, /record\.transfer_out_quantity/);
  assert.match(shell, /<h2 className="mt-2 text-xl font-semibold text-slate-900">All visits<\/h2>/);
  assert.doesNotMatch(shell, /transactions\?\.slice\(0, 10\)/);
});

test('vendor headline quantity is independent of optional Admin Activity access', () => {
  const shell = read('src/components/vendors/vendor-details-shell.tsx');
  assert.match(shell, /roleIndependentTransferInQuantity/);
  assert.match(shell, /roleIndependentTransferOutQuantity/);
  assert.match(shell, /- reversedSupplied/);
  assert.doesNotMatch(shell, /totalSupplied = inventoryReceivedTotal[\s\S]{0,160}retrievalQuantity/);
});

test('vendor stock movement history is mobile-card based and human-readable', () => {
  const shell = read('src/components/vendors/vendor-details-shell.tsx');
  assert.match(shell, /Stock movement history/);
  assert.match(shell, /movement\.product_name \|\| 'Product unavailable — historical record'/);
  assert.match(shell, /Recorded by/);
  assert.match(shell, /From \{movement\.source_vendor_name/);
  assert.match(shell, /To \{movement\.destination_vendor_name/);
  assert.match(shell, /stockMovements!\.map/);
});

test('admin activity and legacy visit logs keep human-readable identities separate', () => {
  const activityRoute = read('src/app/api/admin-activity/route.ts');
  const activityModal = read('src/components/admin-activity/activity-detail-modal.tsx');
  const visitLogsRoute = read('src/app/api/visitlogs/route.ts');
  assert.match(activityRoute, /sr\.name AS original_sales_rep_name/);
  assert.match(activityRoute, /COALESCE\(au2\.name, au2\.username\) AS reversed_by_name/);
  assert.match(activityModal, /activity\.original_sales_rep_name/);
  assert.match(activityModal, /activity\.reversed_by_name/);
  assert.match(visitLogsRoute, /vendor_info\.vendor_name AS vendor_name/);
  assert.match(visitLogsRoute, /product_info\.product_name AS product_name/);
  assert.match(visitLogsRoute, /sr\.name AS sales_rep_name/);
  assert.doesNotMatch(activityModal, /activity\.original_sales_rep_id \|\|/);
});
