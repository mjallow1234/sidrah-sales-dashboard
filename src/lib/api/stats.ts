import type { DashboardStats } from '@/lib/types';

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

export async function getStats(params?: { vendorId?: string; salesRepId?: string; productId?: string; startDate?: string; endDate?: string; market?: string }): Promise<DashboardStats> {
  const path = `/api/stats${buildQueryString(params ?? {})}`;
  const result = await fetchJson<{ status: string; data: DashboardStats }>(path);
  return result.data;
}
