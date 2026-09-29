import type { FactoryInventory, FactoryMovementItem, FactoryMovementType, FactoryStockMovement } from '@/lib/types';

async function requestJson<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, options);
  const json = await response.json();
  if (!response.ok) throw new Error(json?.message || `Request failed: ${response.status}`);
  return json.data as T;
}

export function getFactoryInventory(filters?: { productId?: string }) { const query = filters?.productId ? `?productId=${encodeURIComponent(filters.productId)}` : ''; return requestJson<FactoryInventory[]>(`/api/factory/inventory${query}`); }
export function getFactoryMovements(filters?: { startDate?: string; endDate?: string; productId?: string; movementType?: string }) { const query = new URLSearchParams({ limit: '100', ...(filters?.startDate ? { startDate: filters.startDate } : {}), ...(filters?.endDate ? { endDate: filters.endDate } : {}), ...(filters?.productId ? { productId: filters.productId } : {}), ...(filters?.movementType ? { movementType: filters.movementType } : {}) }); return requestJson<FactoryStockMovement[]>(`/api/factory/movements?${query.toString()}`); }
export function createFactoryMovement(payload: {
  operation_id: string;
  movement_type: FactoryMovementType;
  items?: FactoryMovementItem[];
  product_id?: string;
  quantity?: number;
  occurred_at?: string;
  raw_material?: string;
  temperature_c?: number;
  processing_duration_hours?: number;
  processing_duration_minutes?: number;
  reason_comment?: string;
  batch_reference?: string;
  input_quantity?: number;
  input_unit?: string;
}) {
  return requestJson<{ movement: FactoryStockMovement; inventory: FactoryInventory }>('/api/factory/movements', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
  });
}
export function editFactoryMovement(payload: Record<string, unknown>) { return requestJson('/api/factory/movements', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); }
export function reverseFactoryMovement(payload: { event_id: string; reason: string; operation_id?: string }) { return requestJson('/api/factory/movements/reverse', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) }); }
export function getFactoryRevisions(eventId: string) { return requestJson<any[]>(`/api/factory/revisions?event_id=${encodeURIComponent(eventId)}`); }
