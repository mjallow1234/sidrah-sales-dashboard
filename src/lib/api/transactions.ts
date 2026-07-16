import type { Transaction } from '@/lib/types';
import { getInventory, getVendors, getVendor, getSalesReps, getProducts, createVisit } from '@/services/gasApi';

export async function getTransactions(): Promise<Transaction[]> {
  // Transactions are retrieved from visit logs via the vendor details path.
  // Live visit transaction records are not exposed by a dedicated /transactions endpoint in the backend.
  return [];
}

export async function getTransactionsByVendor(vendorId: string): Promise<Transaction[]> {
  // This service is currently not connected to a live transactions endpoint.
  return [];
}

export async function createTransaction(payload: {
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
}) {
  return createVisit(payload);
}
