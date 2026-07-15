import type { Transaction } from '@/lib/types';

const transactions: Transaction[] = [
  {
    transaction_id: 'T_1001',
    date: '2026-07-14',
    vendor_id: 'V_001',
    opening_stock: 32,
    stock_sold: 15,
    stock_added: 11,
    cash_collected: 45000,
    closing_stock: 28,
    sales_rep: 'Sales Team A',
    notes: 'Morning delivery and cash pickup.',
  },
  {
    transaction_id: 'T_1002',
    date: '2026-07-14',
    vendor_id: 'V_002',
    opening_stock: 50,
    stock_sold: 30,
    stock_added: 20,
    cash_collected: 65000,
    closing_stock: 40,
    sales_rep: 'Sales Team B',
    notes: 'Added stock for weekend demand.',
  },
  {
    transaction_id: 'T_1003',
    date: '2026-07-13',
    vendor_id: 'V_001',
    opening_stock: 45,
    stock_sold: 13,
    stock_added: 0,
    cash_collected: 40000,
    closing_stock: 32,
    sales_rep: 'Sales Team A',
    notes: 'Cash collection from previous sales.',
  },
];

export function getTransactions(): Transaction[] {
  return transactions;
}

export function getTransactionsByVendor(vendorId: string): Transaction[] {
  return transactions.filter((transaction) => transaction.vendor_id === vendorId).slice(0, 10);
}
