import { normalizeDashboardStats, type AppUser, type DashboardStats, type Inventory, type Product, type SalesRep, type Transaction, type Vendor, type VendorBalance, type VendorInventory, type VisitResult } from '@/lib/types';


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

  let json;
  try {
    json = JSON.parse(text);
  } catch (error) {
    throw new Error('Failed to parse JSON response from GAS API.');
  }

  if (json && typeof json === 'object' && 'status' in json && json.status !== 'success') {
    const message = json.message ?? json.error ?? 'Unknown GAS API error';
    throw new Error(`GAS API error: ${message}`);
  }

  return json as T;
}

function unwrapListResponse<T>(result: { status: string; data: T[] } | { status: string; data: { items?: T[] } }) {
  if (Array.isArray((result as any).data)) {
    return (result as any).data as T[];
  }
  if (Array.isArray((result as any).data?.items)) {
    return (result as any).data.items as T[];
  }
  return [] as T[];
}

export async function getVendors(params?: { salesRepId?: string; sales_rep_id?: string; status?: string; search?: string; page?: number; pageSize?: number }): Promise<Vendor[]> {
  const queryParams = {
    ...params,
    page: params?.page ?? 1,
    pageSize: params?.pageSize ?? 200,
  };

  const query = Object.entries(queryParams)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&');
  const path = query ? `/api/vendors?${query}` : '/api/vendors';
  return fetchJson<any>(path).then((result) => unwrapListResponse<Vendor>(result));
}

export async function getVendorsPage(params?: { salesRepId?: string; sales_rep_id?: string; status?: string; search?: string; page?: number; pageSize?: number }) {
  const query = params ? Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&') : '';
  const path = query ? `/api/vendors?${query}` : '/api/vendors';
  return fetchJson<any>(path);
}

export async function getVendor(id: string) {
  return fetchJson<{ status: string; data: Vendor }>(`/api/vendors/${encodeURIComponent(id)}`).then((result) => result.data);
}

export async function getProducts(params?: { active?: boolean | string; category?: string }): Promise<Product[]> {
  const query = params ? Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&') : '';
  const path = query ? `/api/products?${query}` : '/api/products';
  return fetchJson<any>(path).then((result) => unwrapListResponse<Product>(result));
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
  return fetchJson<any>(path).then((result) => {
    if (Array.isArray(result.data)) {
      return result.data as SalesRep[];
    }

    if (Array.isArray(result.data?.items)) {
      return result.data.items as SalesRep[];
    }

    return [] as SalesRep[];
  });
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
  return fetchJson<any>(path).then((result) => unwrapListResponse<Inventory>(result));
}

export async function getVendorBalances(params?: { vendorId?: string }) {
  const query = params ? Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&') : '';
  const path = query ? `/api/vendorbalances?${query}` : '/api/vendorbalances';
  return fetchJson<any>(path).then((result) => unwrapListResponse<VendorBalance>(result));
}

export async function getVendorInventory(params?: { vendorId?: string; productId?: string }): Promise<VendorInventory[]> {
  const query = params ? Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&') : '';
  const path = query ? `/api/vendorinventory?${query}` : '/api/vendorinventory';
  return fetchJson<any>(path).then((result) => unwrapListResponse<VendorInventory>(result));
}

export async function getVisitLogs(params?: { vendorId?: string; salesRepId?: string; productId?: string; paymentMethod?: string; startDate?: string; endDate?: string; market?: string }) {
  const query = params ? Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&') : '';
  const path = query ? `/api/visitlogs?${query}` : '/api/visitlogs';
  return fetchJson<any>(path).then((result) => unwrapListResponse<any>(result));
}

export async function getTransactions(params?: { vendorId?: string; salesRepId?: string; productId?: string; paymentMethod?: string; startDate?: string; endDate?: string; market?: string }) {
  const query = params ? Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&') : '';
  const path = query ? `/api/transactions?${query}` : '/api/transactions';
  return fetchJson<any>(path).then((result) => unwrapListResponse<any>(result));
}

export async function getStats(params?: { vendorId?: string; salesRepId?: string; productId?: string; startDate?: string; endDate?: string; market?: string }) {
  const query = params ? Object.entries(params)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
    .join('&') : '';
  const path = query ? `/api/stats?${query}` : '/api/stats';
  return fetchJson<{ status: string; data?: Partial<DashboardStats> }>(path).then((result) => normalizeDashboardStats(result.data));
}

export async function getTransactionsByVendor(vendorId: string) {
  return getTransactions({ vendorId });
}

export async function getVendorInventoryByVendor(vendorId: string) {
  return getVendorInventory({ vendorId });
}

export async function getVendorInventoryByVendorAndProduct(vendorId: string, productId: string): Promise<VendorInventory | null> {
  const result = await getVendorInventory({ vendorId, productId });
  return result[0] ?? null;
}

export async function createSupply(payload: {
  vendor_id: string;
  product_id: string;
  quantity: number;
  date: string;
  notes?: string;
  client_transaction_id: string;
}) {
  return fetchJson<{ status: string; data: any }>('/api/supply', {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: {
      'Content-Type': 'application/json',
    },
  }).then((result) => result.data);
}

export async function createVendor(payload: {
  vendor_name: string;
  phone: string;
  location: string;
  sales_rep_id?: string;
  assigned_date?: string;
  assigned_by?: string;
  reason?: string;
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
  sales_rep_id?: string;
  assigned_date?: string;
  assigned_by?: string;
  reason?: string;
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
  low_stock_threshold: number;
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
  low_stock_threshold: number;
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

export async function getAppUsers(params?: { role?: string; status?: string; phone?: string }) {
  const query = params
    ? Object.entries(params)
        .filter(([, value]) => value !== undefined && value !== null && value !== '')
        .map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`)
        .join('&')
    : '';
  const path = query ? `/api/appusers?${query}` : '/api/appusers';
  return fetchJson<any>(path).then((result) => {
    if (Array.isArray(result.data)) {
      return result.data as AppUser[];
    }

    if (Array.isArray(result.data?.items)) {
      return result.data.items as AppUser[];
    }

    return [] as AppUser[];
  });
}

export async function getAppUser(id: string) {
  return fetchJson<{ status: string; data: AppUser }>(`/api/appusers/${encodeURIComponent(id)}`).then((result) => result.data);
}

export async function createAppUser(payload: {
  email: string;
  phone: string;
  name: string;
  role: 'super_admin' | 'admin' | 'supervisor' | 'agent' | 'delivery';
  status: 'active' | 'inactive' | 'suspended';
  sales_rep_id?: string;
  password_hash: string;
  password_reset_required?: string;
  last_login?: string;
  is_system_user?: string;
  created_by: string;
  updated_by: string;
}) {
  return fetchJson<{ status: string; data: AppUser }>('/api/appusers', {
    method: 'POST',
    body: JSON.stringify(payload),
  }).then((result) => result.data);
}

export async function updateAppUser(id: string, payload: Partial<{
  email: string;
  phone: string;
  name: string;
  role: 'super_admin' | 'admin' | 'supervisor' | 'agent' | 'delivery';
  status: 'active' | 'inactive' | 'suspended';
  sales_rep_id: string;
  password_hash: string;
  password_reset_required: string;
  last_login: string;
  is_system_user: string;
  failed_login_count: number;
  last_failed_login: string;
  lockout_until: string;
  updated_by: string;
  password_changed_at: string;
}>): Promise<AppUser> {
  return fetchJson<{ status: string; data: AppUser }>(`/api/appusers/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  }).then((result) => result.data);
}
