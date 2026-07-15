import type { Inventory, Transaction, Vendor } from '@/lib/types';
import type { CreateTransactionPayload } from '@/services/transactionService';

const BASE_URL = process.env.NEXT_PUBLIC_GAS_API_BASE_URL;
const API_KEY = process.env.NEXT_PUBLIC_GAS_API_KEY;

function ensureBaseUrl() {
  if (!BASE_URL) {
    throw new Error('NEXT_PUBLIC_GAS_API_BASE_URL is not configured.');
  }
  return BASE_URL;
}

function getHeaders() {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (API_KEY) {
    headers['x-api-key'] = API_KEY;
  }

  return headers;
}

async function fetchJson<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${ensureBaseUrl()}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      ...getHeaders(),
      ...(options?.headers ?? {}),
    },
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(`GAS API request failed: ${response.status} ${response.statusText} - ${message}`);
  }

  return response.json();
}

export async function fetchVendors(): Promise<Vendor[]> {
  return fetchJson<Vendor[]>('/vendors');
}

export async function fetchVendorById(vendorId: string): Promise<Vendor | undefined> {
  return fetchJson<Vendor>(`/vendors/${vendorId}`);
}

export async function fetchInventoryRecords(): Promise<Inventory[]> {
  return fetchJson<Inventory[]>('/inventory');
}

export async function fetchInventoryByVendor(vendorId: string): Promise<Inventory | undefined> {
  return fetchJson<Inventory>(`/inventory/${vendorId}`);
}

export async function fetchTransactions(): Promise<Transaction[]> {
  return fetchJson<Transaction[]>('/transactions');
}

export async function fetchTransactionsByVendor(vendorId: string): Promise<Transaction[]> {
  return fetchJson<Transaction[]>(`/transactions?vendorId=${vendorId}`);
}

export async function postTransaction(payload: CreateTransactionPayload): Promise<Transaction> {
  return fetchJson<Transaction>('/transactions', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}
