import type { DashboardStats, Inventory, Product, SalesRep, Transaction, Vendor, VendorBalance, VisitResult } from '@/lib/types';


function getHeaders(method: string = 'GET'): HeadersInit {
  return method === 'POST'
    ? {
        'Content-Type': 'application/json',
      }
    : {};
}

async function fetchJson<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = path;
  let headers: HeadersInit = getHeaders(options.method ?? 'GET');

  if (options.headers) {
    const merged = new Headers(headers);
    new Headers(options.headers).forEach(function(value, key) {
      merged.set(key, value);
    });
    headers = merged;
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`GAS API request failed: ${response.status} ${response.statusText} - ${text}`);
  }

  try {
    return JSON.parse(text) as T;
  } catch (error) {
    throw new Error('Failed to parse JSON response from GAS API.');
  }
}

export async function getVendors(params?: { salesRepId?: string; sales_rep_id?: string; status?: string }) {
  const query = params ? Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&') : '';
  const path = query ? `/api/vendors?${query}` : '/api/vendors';
  return fetchJson<{ status: string; data: Vendor[] }>(path).then((result) => result.data);
}

export async function getVendor(id: string) {
  return fetchJson<{ status: string; data: Vendor }>(`/api/vendors/${encodeURIComponent(id)}`).then((result) => result.data);
}

export async function getProducts(params?: { active?: boolean | string; category?: string }) {
  const query = params ? Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&') : '';
  const path = query ? `/api/products?${query}` : '/api/products';
  return fetchJson<{ status: string; data: Product[] }>(path).then((result) => result.data);
}

export async function getProduct(id: string) {
  return fetchJson<{ status: string; data: Product }>(`/api/products/${encodeURIComponent(id)}`).then((result) => result.data);
}

export async function getSalesReps(params?: { status?: string }) {
  const query = params ? Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&') : '';
  const path = query ? `/api/salesreps?${query}` : '/api/salesreps';
  return fetchJson<{ status: string; data: SalesRep[] }>(path).then((result) => result.data);
}

export async function getSalesRep(id: string) {
  return fetchJson<{ status: string; data: SalesRep }>(`/api/salesreps/${encodeURIComponent(id)}`).then((result) => result.data);
}

export async function getInventory(params?: { vendorId?: string; productId?: string }) {
  const query = params ? Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&') : '';
  const path = query ? `/api/inventory?${query}` : '/api/inventory';
  return fetchJson<{ status: string; data: Inventory[] }>(path).then((result) => result.data);
}

export async function getVendorBalances(params?: { vendorId?: string }) {
  const query = params ? Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&') : '';
  const path = query ? `/api/vendorbalances?${query}` : '/api/vendorbalances';
  return fetchJson<{ status: string; data: VendorBalance[] }>(path).then((result) => result.data);
}

export async function getVisitLogs(params?: { vendorId?: string; salesRepId?: string; productId?: string; paymentMethod?: string; startDate?: string; endDate?: string }) {
  const query = params ? Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&') : '';
  const path = query ? `/visitlogs?${query}` : '/visitlogs';
  return fetchJson<{ status: string; data: any[] }>(path).then((result) => result.data);
}

export async function getStats() {
  return fetchJson<{ status: string; data: DashboardStats }>('/api/stats').then((result) => result.data);
}

export async function createVendor(payload: {
  vendor_name: string;
  phone: string;
  location: string;
  sales_rep_id: string;
  assigned_date?: string;
  status?: string;
}) {
  return fetchJson<{ status: string; data: Vendor }>('/api/vendors', {
    method: 'POST',
    body: JSON.stringify(payload),
  }).then((result) => result.data);
}

export async function updateVendor(id: string, payload: Partial<{
  vendor_name: string;
  phone: string;
  location: string;
  sales_rep_id: string;
  status: string;
}>) {
  return fetchJson<{ status: string; data: Vendor }>(`/api/vendors/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  }).then((result) => result.data);
}

export async function createProduct(payload: {
  product_name: string;
  category: string;
  unit: string;
  default_unit_price: number;
  currency: string;
}) {
  return fetchJson<{ status: string; data: Product }>('/api/products', {
    method: 'POST',
    body: JSON.stringify(payload),
  }).then((result) => result.data);
}

export async function updateProduct(id: string, payload: Partial<{
  product_name: string;
  category: string;
  unit: string;
  default_unit_price: number;
  currency: string;
  active: boolean;
}>) {
  return fetchJson<{ status: string; data: Product }>(`/api/products/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  }).then((result) => result.data);
}

export async function createSalesRep(payload: { full_name: string; phone: string }) {
  return fetchJson<{ status: string; data: SalesRep }>('/api/salesreps', {
    method: 'POST',
    body: JSON.stringify(payload),
  }).then((result) => result.data);
}

export async function updateSalesRep(id: string, payload: Partial<{
  full_name: string;
  phone: string;
  status: string;
}>) {
  return fetchJson<{ status: string; data: SalesRep }>(`/api/salesreps/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  }).then((result) => result.data);
}

export async function createVisit(payload: {
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
}) {
  return fetchJson<{ status: string; data: VisitResult }>('/api/visit', {
    method: 'POST',
    body: JSON.stringify(payload),
  }).then((result) => result.data);
}
