import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

test('expense migrations create seeded, soft-deletable categories and expenses', () => {
  const categories = read('db/migrations/0023_create_factory_expense_categories.sql');
  const expenses = read('db/migrations/0024_create_factory_expenses.sql');
  for (const name of ['Groundnut (Sorted)', 'Groundnut (Unsorted)', 'Sorting', 'Gas Refill', 'Cash Power', 'Transportation', 'Fuel', 'Packaging', 'Repairs & Maintenance', 'Cleaning', 'Labour', 'Water', 'Other']) assert.match(categories, new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.match(categories, /is_active/);
  assert.match(expenses, /status ENUM\('active','voided'\)/);
  assert.match(expenses, /void_reason/);
  assert.match(expenses, /payment_method ENUM\('Cash','Bank Transfer','Mobile Money','Credit','Other'\)/);
});

test('expense APIs are admin-only and preserve audit actor data', () => {
  const route = read('src/app/api/factory/expenses/route.ts');
  const service = read('src/services/factoryExpenseService.ts');
  assert.match(route, /isAdminRole\(session\.role\)/);
  assert.match(service, /recorded_by: actor/);
  assert.match(service, /transaction_journal/);
  assert.match(service, /void_reason|Void reason/);
});

test('expense UI supports categories, filters, summaries, optional fields, and voiding', () => {
  const ui = read('src/components/factory/factory-expenses.tsx');
  for (const label of ["Today's Expenditure", "This Month's Expenditure", 'Filtered Expenditure', 'Number of Expenses', 'Manage categories', 'Add expense', 'Search description/payee', 'Edit', 'Void']) assert.match(ui, new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.match(ui, /quantity/);
  assert.match(ui, /unit_price/);
  assert.match(ui, /payment_method/);
});

test('factory expenses are restricted in navigation and authorization', () => {
  const auth = read('src/lib/authorization.ts');
  const nav = read('src/components/layout/admin-layout.tsx');
  assert.match(auth, /pathname === '\/factory\/expenses'/);
  assert.match(auth, /href === '\/factory\/expenses'/);
  assert.match(nav, /href: '\/factory\/expenses'/);
});
