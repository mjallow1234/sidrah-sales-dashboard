import type { AdminActivityRecord } from '@/lib/types';

function buildQueryString(params: Record<string, unknown | undefined>) {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    searchParams.append(key, String(value));
  }
  const query = searchParams.toString();
  return query ? `?${query}` : '';
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

export async function getAdminActivity(filters?: {
  startDate?: string;
  endDate?: string;
  actionType?: string;
  adminId?: string;
  vendorId?: string;
  productId?: string;
  search?: string;
}): Promise<AdminActivityRecord[]> {
  const query = buildQueryString(filters ?? {});
  const result = await fetchJson(`/api/admin-activity${query}`);
  return Array.isArray(result.data) ? result.data : [];
}
