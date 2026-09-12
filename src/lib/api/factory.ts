import type { FactoryInventory, FactoryMovementItem, FactoryMovementType, FactoryStockMovement } from '@/lib/types';

async function requestJson<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, options);
  const json = await response.json();
  if (!response.ok) throw new Error(json?.message || `Request failed: ${response.status}`);
  return json.data as T;
}

export function getFactoryInventory() { return requestJson<FactoryInventory[]>('/api/factory/inventory'); }
export function getFactoryMovements() { return requestJson<FactoryStockMovement[]>('/api/factory/movements?limit=100'); }
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
