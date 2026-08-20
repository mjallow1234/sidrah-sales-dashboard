import type { AdminStockMovement, ReverseVisitResult } from '@/lib/types';

function mapResponse<T>(path: string, response: Response, json: any): T {
  if (!response.ok) {
    throw new Error(json?.message || `Request failed: ${response.status}`);
  }
  return json.data as T;
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
  return { response, json };
}

export async function reverseVisit(payload: { visit_id: string; reason: string; operation_id?: string }) {
  const { response, json } = await fetchJson('/api/visit/reverse', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return mapResponse<ReverseVisitResult>('/api/visit/reverse', response, json);
}

export async function transferStock(payload: {
  source_vendor_id: string;
  destination_vendor_id: string;
  product_id: string;
  quantity: number;
  notes?: string;
  operation_id?: string;
}) {
  const { response, json } = await fetchJson('/api/admin-stock', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...payload, movement_type: 'transfer' }),
  });
  return mapResponse<any>('/api/admin-stock', response, json);
}

export async function retrieveStock(payload: {
  vendor_id: string;
  product_id: string;
  quantity: number;
  notes?: string;
  operation_id?: string;
}) {
  const { response, json } = await fetchJson('/api/admin-stock', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...payload, movement_type: 'retrieval' }),
  });
  return mapResponse<any>('/api/admin-stock', response, json);
}
