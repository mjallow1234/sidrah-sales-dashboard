import type { DashboardStats, Inventory, Product, SalesRep, Transaction, Vendor, VendorBalance, VisitResult } from '@/lib/types';

const GAS_API_URL = process.env.NEXT_PUBLIC_GAS_API_URL;
const GAS_API_KEY = process.env.NEXT_PUBLIC_GAS_API_KEY;

function ensureBaseUrl() {
  if (!GAS_API_URL) {
    throw new Error('NEXT_PUBLIC_GAS_API_URL is not configured.');
  }
  return GAS_API_URL.replace(/\/+$/, '');
}

function makeUrl(path: string) {
  const base = ensureBaseUrl();
  const separator = path.includes('?') ? '&' : '?';
  const keyParam = GAS_API_KEY ? `${separator}api_key=${encodeURIComponent(GAS_API_KEY)}` : '';
  return `${base}${path}${keyParam}`;
}

function getHeaders(method: string = 'GET') {
  return method === 'POST'
    ? {
        'Content-Type': 'application/json',
      }
    : {};
}

async function fetchJson<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = makeUrl(path);
  const response = await fetch(url, {
    ...options,
    headers: {
      ...getHeaders(options.method ?? 'GET'),
      ...(options.headers ?? {}),
    },
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
  const path = query ? `/vendors?${query}` : '/vendors';
  return fetchJson<{ status: string; data: Vendor[] }>(path).then((result) => result.data);
}

export async function getVendor(id: string) {
  return fetchJson<{ status: string; data: Vendor }>(`/vendors/${encodeURIComponent(id)}`).then((result) => result.data);
}

export async function getProducts(params?: { active?: boolean | string; category?: string }) {
  const query = params ? Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&') : '';
  const path = query ? `/products?${query}` : '/products';
  return fetchJson<{ status: string; data: Product[] }>(path).then((result) => result.data);
}

export async function getProduct(id: string) {
  return fetchJson<{ status: string; data: Product }>(`/product/${encodeURIComponent(id)}`).then((result) => result.data);
}

export async function getSalesReps(params?: { status?: string }) {
  const query = params ? Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&') : '';
  const path = query ? `/salesreps?${query}` : '/salesreps';
  return fetchJson<{ status: string; data: SalesRep[] }>(path).then((result) => result.data);
}

export async function getSalesRep(id: string) {
  return fetchJson<{ status: string; data: SalesRep }>(`/salesrep/${encodeURIComponent(id)}`).then((result) => result.data);
}

export async function getInventory(params?: { vendorId?: string; productId?: string }) {
  const query = params ? Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&') : '';
  const path = query ? `/inventory?${query}` : '/inventory';
  return fetchJson<{ status: string; data: Inventory[] }>(path).then((result) => result.data);
}

export async function getVendorBalances(params?: { vendorId?: string }) {
  const query = params ? Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&') : '';
  const path = query ? `/vendorbalances?${query}` : '/vendorbalances';
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
  return fetchJson<{ status: string; data: DashboardStats }>('/stats').then((result) => result.data);
}

export async function createVendor(payload: {
  vendor_name: string;
  phone: string;
  location: string;
  sales_rep_id: string;
  assigned_date?: string;
  status?: string;
}) {
  return fetchJson<{ status: string; data: Vendor }>('/vendor', {
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
  return fetchJson<{ status: string; data: Vendor }>(`/vendor/${encodeURIComponent(id)}`, {
    method: 'POST',
    body: JSON.stringify({ _method: 'PUT', ...payload }),
  }).then((result) => result.data);
}

export async function createProduct(payload: {
  product_name: string;
  category: string;
  unit: string;
  default_unit_price: number;
  currency: string;
}) {
  return fetchJson<{ status: string; data: Product }>('/product', {
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
  const body = { _method: 'PUT', ...payload };
  return fetchJson<{ status: string; data: Product }>(`/product/${encodeURIComponent(id)}`, {
    method: 'POST',
    body: JSON.stringify(body),
  }).then((result) => result.data);
}

export async function createSalesRep(payload: { full_name: string; phone: string }) {
  return fetchJson<{ status: string; data: SalesRep }>('/salesrep', {
    method: 'POST',
    body: JSON.stringify(payload),
  }).then((result) => result.data);
}

export async function updateSalesRep(id: string, payload: Partial<{
  full_name: string;
  phone: string;
  status: string;
}>) {
  return fetchJson<{ status: string; data: SalesRep }>(`/salesrep/${encodeURIComponent(id)}`, {
    method: 'POST',
    body: JSON.stringify({ _method: 'PUT', ...payload }),
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
  return fetchJson<{ status: string; data: VisitResult }>('/visit', {
    method: 'POST',
    body: JSON.stringify(payload),
  }).then((result) => result.data);
}
