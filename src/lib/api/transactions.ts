import type { Transaction } from '@/lib/types';

function mapVisitLogToTransaction(log: any): Transaction {
  return {
    transaction_id: log.visit_id,
    visit_id: log.visit_id,
    timestamp: log.timestamp,
    date: log.date,
    vendor_id: log.vendor_id,
    vendor_name: log.vendor_name,
    product_id: log.product_id,
    product_name: log.product_name,
    sales_rep_id: log.sales_rep_id,
    opening_stock: Number(log.opening_stock) || 0,
    stock_sold: Number(log.stock_sold) || 0,
    stock_added: Number(log.stock_added) || 0,
    cash_collected: Number(log.cash_collected) || 0,
    closing_stock: Number(log.closing_stock) || 0,
    sales_rep: log.sales_rep_id || '',
    actor: log.actor || '',
    notes: log.notes || '',
    is_reversed: Boolean(log.is_reversed),
    reversed_at: log.reversed_at,
    reversed_by: log.reversed_by,
    reversal_reason: log.reversal_reason,
    reversal_operation_id: log.reversal_operation_id,
  };
}

async function fetchJson(path: string, options: RequestInit = {}) {
  const response = await fetch(path, options);
  const text = await response.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    throw new Error(`Failed to parse JSON response from ${path}`);
  }

  if (!response.ok) {
    throw new Error(json?.message || `Request failed: ${response.status}`);
  }

  return json;
}

export async function getTransactions(params?: { vendorId?: string; salesRepId?: string; productId?: string; startDate?: string; endDate?: string; market?: string }): Promise<Transaction[]> {
  const query = params ? Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&') : '';
  const path = query ? `/api/transactions?${query}` : '/api/transactions';
  const result = await fetchJson(path);
  return Array.isArray(result.data) ? result.data.map(mapVisitLogToTransaction) : [];
}

export async function getTransactionsByVendor(vendorId: string): Promise<Transaction[]> {
  return getTransactions({ vendorId });
}

export async function createVisit(payload: {
  vendor_id: string;
  product_id: string;
  sales_rep_id: string;
  stock_added: number;
  cash_collected: number;
  unit_price: number;
  payment_method: string;
  payment_reference?: string;
  client_transaction_id: string;
  latitude?: number;
  longitude?: number;
  notes?: string;
}) {
  const result = await fetchJson('/api/visit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return result.data;
}

export async function createSupply(payload: {
  vendor_id: string;
  product_id: string;
  quantity: number;
  date: string;
  notes?: string;
  client_transaction_id: string;
}) {
  const result = await fetchJson('/api/supply', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return result.data;
}
