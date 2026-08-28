import type { VendorIntelligence } from '@/lib/types';

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

export async function getVendorIntelligence(vendorId: string, market?: string): Promise<VendorIntelligence> {
  const path = `/api/intelligence/${encodeURIComponent(vendorId)}${buildQueryString({ market })}`;
  const result = await fetchJson<{ status: string; data: VendorIntelligence }>(path);
  return result.data;
}
