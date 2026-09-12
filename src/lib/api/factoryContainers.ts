import type { FactoryContainerInventory, FactoryContainerMovement, FactoryContainerMovementType, FactoryContainerType } from '@/lib/types';

async function requestJson<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, options); const json = await response.json();
  if (!response.ok) throw new Error(json?.message || `Request failed: ${response.status}`);
  return json.data as T;
}
export function getFactoryContainerInventory() { return requestJson<FactoryContainerInventory[]>('/api/factory/containers/inventory'); }
export function getFactoryContainerMovements() { return requestJson<FactoryContainerMovement[]>('/api/factory/containers/movements?limit=100'); }
export function createFactoryContainerMovement(payload: { operation_id: string; container_type: FactoryContainerType; movement_type: FactoryContainerMovementType; quantity: number; occurred_at?: string; reason_comment?: string }) {
  return requestJson<{ movement: FactoryContainerMovement; inventory: FactoryContainerInventory }>('/api/factory/containers/movements', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
}
