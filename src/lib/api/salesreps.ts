import type { SalesRep } from '@/lib/types';

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

export async function getSalesReps(params?: { status?: string }): Promise<SalesRep[]> {
  const path = `/api/salesreps${buildQueryString(params ?? {})}`;
  const result = await fetchJson<any>(path);
  return unwrapListResponse<SalesRep>(result);
}

export async function getSalesRep(id: string): Promise<SalesRep> {
  const result = await fetchJson<{ status: string; data: SalesRep }>(`/api/salesreps/${encodeURIComponent(id)}`);
  return result.data;
}

export async function createSalesRep(payload: { full_name: string; phone: string }) {
  const result = await fetchJson<{ status: string; data: SalesRep }>('/api/salesreps', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  return result.data;
}

export async function updateSalesRep(
  id: string,
  payload: Partial<{
    full_name: string;
    phone: string;
    status: string;
  }>
) {
  const result = await fetchJson<{ status: string; data: SalesRep }>(`/api/salesreps/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  return result.data;
}
