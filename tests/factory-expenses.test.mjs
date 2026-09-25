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

test('payment methods are dynamically managed and historical names remain stored on expenses', () => {
  const migration = read('db/migrations/0025_create_factory_expense_payment_methods.sql');
  const route = read('src/app/api/factory/expenses/route.ts');
  const repository = read('src/repositories/FactoryExpenseRepository.ts');
  const ui = read('src/components/factory/factory-expenses.tsx');
  assert.match(migration, /CREATE TABLE factory_expense_payment_methods/);
  assert.match(migration, /is_active/);
  assert.match(migration, /ALTER TABLE factory_expenses MODIFY payment_method VARCHAR/);
  assert.match(route, /payment-methods/);
  assert.match(repository, /listPaymentMethods/);
  assert.match(read('src/services/factoryExpenseService.ts'), /listPaymentMethods\(false\)/);
  assert.match(ui, /Manage payment methods/);
  assert.match(ui, /activePaymentMethods/);
  assert.match(ui, /Deactivate.*Reactivate/);
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

test('expense rows expose an accessible details modal while keeping the table concise', () => {
  const ui = read('src/components/factory/factory-expenses.tsx');
  assert.match(ui, /role="button"/);
  assert.match(ui, /tabIndex=\{0\}/);
  for (const label of ['Expense details', 'Recorded at', 'Void reason', 'Close expense details']) assert.match(ui, new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.match(ui, /lg:grid-cols-\[9rem_9rem/);
});

test('expense dates are rendered as compact calendar dates', () => {
  const ui = read('src/components/factory/factory-expenses.tsx');
  assert.match(ui, /const expenseDate =/);
  assert.match(ui, /expenseDate\(expense\.expense_date\)/);
  assert.match(ui, /timeZone: 'UTC'/);
  assert.doesNotMatch(ui, /<td className="px-4 py-3 whitespace-nowrap">\{expense\.expense_date\}<\/td>/);
});

test('factory expenses are restricted in navigation and authorization', () => {
  const auth = read('src/lib/authorization.ts');
  const nav = read('src/components/layout/admin-layout.tsx');
  assert.match(auth, /pathname === '\/factory\/expenses'/);
  assert.match(auth, /href === '\/factory\/expenses'/);
  assert.match(nav, /href: '\/factory\/expenses'/);
});
