import type { Product } from '@/lib/types';

function buildQueryString(params: Record<string, unknown | undefined>) {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    searchParams.append(key, String(value));
  }
  const query = searchParams.toString();
  return query ? `?${query}` : '';
}

async function fetchJson<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(path, options);
  const text = await response.text();
  let json;

  try {
    json = JSON.parse(text);
  } catch (error) {
    throw new Error(`Failed to parse JSON response from ${path}`);
  }

  if (!response.ok) {
    throw new Error(json?.message || `Request failed: ${response.status}`);
  }

  return json as T;
}

function unwrapListResponse<T>(result: any): T[] {
  if (Array.isArray(result?.data)) {
    return result.data as T[];
  }
  if (Array.isArray(result?.data?.items)) {
    return result.data.items as T[];
  }
  return [] as T[];
}

export async function getProducts(params?: { active?: boolean | string; category?: string }): Promise<Product[]> {
  const path = `/api/products${buildQueryString(params ?? {})}`;
  const result = await fetchJson<any>(path);
  return unwrapListResponse<Product>(result);
}

export async function getProduct(id: string): Promise<Product> {
  const result = await fetchJson<{ status: string; data: Product }>(`/api/products/${encodeURIComponent(id)}`);
  return result.data;
}

export async function createProduct(payload: {
  product_name: string;
  category: string;
  unit: string;
  default_unit_price: number;
  currency: string;
  low_stock_threshold: number;
}) {
  const result = await fetchJson<{ status: string; data: Product }>('/api/products', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  return result.data;
}

export async function updateProduct(
  id: string,
  payload: Partial<{
    product_name: string;
    category: string;
    unit: string;
    default_unit_price: number;
    currency: string;
    low_stock_threshold: number;
    active: boolean;
  }>
) {
  const result = await fetchJson<{ status: string; data: Product }>(`/api/products/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  return result.data;
}
