import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');

test('outlet migration is isolated and supports future multi-item sales', () => {
  const sql = read('db/migrations/0038_create_outlet_sales.sql');
  assert.match(sql, /CREATE TABLE IF NOT EXISTS outlets/);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS outlet_sales/);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS outlet_sale_items/);
  assert.match(sql, /REFERENCES products/);
  assert.doesNotMatch(sql, /REFERENCES vendors|vendor_balances|deliveries|inventory|accountability/i);
});

test('outlet API is management-only and writes only outlet tables', () => {
  const route = read('src/app/api/outlets/[outletId]/sales/route.ts');
  const service = read('src/services/outletService.ts');
  const repository = read('src/repositories/OutletRepository.ts');
  assert.match(route, /isAdminRole/);
  assert.match(repository, /outlet_sales|outlet_sale_items/);
  assert.doesNotMatch(service, /vendor_balances|deliveries|accountability|inventory/i);
  assert.match(service, /quantity \* price/);
});

test('outlet UI exposes management list, detail dashboard and sale history', () => {
  const list = read('src/components/outlets/outlet-list.tsx');
  const detail = read('src/components/outlets/outlet-detail.tsx');
  assert.match(list, /Create Outlet/);
  assert.match(detail, /Record Sale/);
  assert.match(detail, /Sales history/);
  assert.match(detail, /today_sales/);
});
