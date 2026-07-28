import type { Transaction } from '@/lib/types';
import { getVisitLogs, createVisit } from '@/services/gasApi';

function mapVisitLogToTransaction(log: any): Transaction {
  return {
    transaction_id: log.visit_id,
    date: log.date,
    vendor_id: log.vendor_id,
    opening_stock: Number(log.opening_stock) || 0,
    stock_sold: Number(log.stock_sold) || 0,
    stock_added: Number(log.stock_added) || 0,
    cash_collected: Number(log.cash_collected) || 0,
    closing_stock: Number(log.closing_stock) || 0,
    sales_rep: log.sales_rep_id || '',
    notes: log.notes || '',
  };
}

export async function getTransactions(): Promise<Transaction[]> {
  const logs = await getVisitLogs();
  return logs.map(mapVisitLogToTransaction);
}

export async function getTransactionsByVendor(vendorId: string): Promise<Transaction[]> {
  const logs = await getVisitLogs({ vendorId });
  return logs.map(mapVisitLogToTransaction);
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
