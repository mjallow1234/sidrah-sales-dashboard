import { createVisit } from '@/services/gasApi';
import type { Transaction, VisitResult } from '@/lib/types';

export interface CreateTransactionPayload {
  vendor_id: string;
  product_id: string;
  sales_rep_id: string;
  stock_sold: number;
  stock_added: number;
  cash_collected: number;
  unit_price: number;
  payment_method: string;
  payment_reference?: string;
  client_transaction_id: string;
  latitude?: number;
  longitude?: number;
  notes?: string;
}

export async function getTransactions(): Promise<Transaction[]> {
  return [];
}

export async function getTransactionsByVendor(vendorId: string): Promise<Transaction[]> {
  return [];
}

export async function createTransaction(payload: CreateTransactionPayload): Promise<VisitResult> {
  return createVisit(payload);
}
