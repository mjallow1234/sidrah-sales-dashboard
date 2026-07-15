import { fetchTransactions, fetchTransactionsByVendor, postTransaction } from '@/services/gasApi';
import type { Transaction } from '@/lib/types';

export interface CreateTransactionPayload {
  vendor_id: string;
  opening_stock: number;
  stock_sold: number;
  stock_added: number;
  cash_collected: number;
  sales_rep: string;
  notes: string;
}

export async function getTransactions(): Promise<Transaction[]> {
  return fetchTransactions();
}

export async function getTransactionsByVendor(vendorId: string): Promise<Transaction[]> {
  return fetchTransactionsByVendor(vendorId);
}

export async function createTransaction(payload: CreateTransactionPayload): Promise<Transaction> {
  return postTransaction(payload);
}
