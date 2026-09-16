import type { AdminDashboardFilters, AdminDashboardSummary } from '@/lib/types/admin-dashboard';

function buildQueryString(params: Partial<AdminDashboardFilters>) {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.set(key, String(value));
    }
  }
  const query = searchParams.toString();
  return query ? `?${query}` : '';
}

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(path);
  const text = await response.text();
  let json: { status?: string; message?: string; data?: T };
  try {
    json = JSON.parse(text) as { status?: string; message?: string; data?: T };
  } catch {
    throw new Error(`Failed to parse JSON response from ${path}`);
  }
  if (!response.ok || json.status === 'error') {
    throw new Error(json.message || `Request failed: ${response.status}`);
  }
  if (json.data === undefined) {
    throw new Error('Dashboard summary response did not include data.');
  }
  return json.data;
}

export async function getAdminDashboardSummary(filters: AdminDashboardFilters): Promise<AdminDashboardSummary> {
  return fetchJson<AdminDashboardSummary>(`/api/admin/dashboard/summary${buildQueryString(filters)}`);
}
