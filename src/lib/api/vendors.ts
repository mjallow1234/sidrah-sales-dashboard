import type { Vendor } from '@/lib/types';

function buildQueryString(params: Record<string, unknown | undefined>) {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    searchParams.append(key, String(value));
  }
  const query = searchParams.toString();
  return query ? `?${query}` : '';
}

export async function fetchVendors(params?: { salesRepId?: string; sales_rep_id?: string; status?: string; search?: string }): Promise<Vendor[]> {
  const query = buildQueryString({
    salesRepId: params?.salesRepId,
    sales_rep_id: params?.sales_rep_id,
    status: params?.status,
    search: params?.search,
  });
  const response = await fetch(`/api/vendors${query}`);
  if (!response.ok) {
    throw new Error('Unable to fetch vendors');
  }
  const json = await response.json();
  return json.data?.items ? json.data.items : json.data;
}

export async function fetchPaginatedVendors(params?: { salesRepId?: string; sales_rep_id?: string; status?: string; search?: string; page?: number; pageSize?: number }): Promise<{ status: string; data: { items: Vendor[]; totalCount: number; page: number; pageSize: number } }> {
  const query = buildQueryString({
    salesRepId: params?.salesRepId,
    sales_rep_id: params?.sales_rep_id,
    status: params?.status,
    search: params?.search,
    page: params?.page,
    pageSize: params?.pageSize,
  });
  const response = await fetch(`/api/vendors${query}`);
  if (!response.ok) {
    throw new Error('Unable to fetch vendors');
  }
  const json = await response.json();
  return json;
}

export async function fetchVendorById(vendorId: string): Promise<Vendor | undefined> {
  const response = await fetch(`/api/vendors/${encodeURIComponent(vendorId)}`);
  if (!response.ok) {
    if (response.status === 404) {
      return undefined;
    }
    throw new Error('Unable to fetch vendor');
  }
  const json = await response.json();
  return json.data;
}

export async function createVendor(payload: {
  vendor_name: string;
  phone: string;
  location: string;
  status: string;
  sales_rep_id?: string;
}): Promise<Vendor> {
  const response = await fetch('/api/vendors', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const json = await response.json().catch(() => null);
    throw new Error(json?.message || 'Unable to create vendor');
  }

  const json = await response.json();
  return json.data;
}

export async function updateVendor(id: string, payload: Partial<{
  vendor_name: string;
  phone: string;
  location: string;
  sales_rep_id?: string | null;
  status: string;
}>): Promise<Vendor> {
  const response = await fetch(`/api/vendors/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const json = await response.json().catch(() => null);
    throw new Error(json?.message || 'Unable to update vendor');
  }

  const json = await response.json();
  return json.data;
}
