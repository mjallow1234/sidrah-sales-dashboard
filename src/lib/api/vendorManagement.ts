import type { AcquiredByAgent, VendorType } from '@/lib/types';

async function parseResponse<T>(response: Response, fallback: string): Promise<T> {
  const json = await response.json().catch(() => null);
  if (!response.ok) throw new Error(json?.message || fallback);
  return json.data as T;
}

export async function getVendorTypes(): Promise<VendorType[]> {
  return parseResponse<VendorType[]>(await fetch('/api/vendor-types'), 'Unable to load vendor types.');
}

export async function createVendorType(name: string): Promise<VendorType> {
  return parseResponse<VendorType>(await fetch('/api/vendor-types', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) }), 'Unable to create vendor type.');
}

export async function deleteVendorType(id: string): Promise<void> {
  await parseResponse<unknown>(await fetch(`/api/vendor-types/${encodeURIComponent(id)}`, { method: 'DELETE' }), 'Unable to delete vendor type.');
}

export async function getAcquiredByAgents(): Promise<AcquiredByAgent[]> {
  return parseResponse<AcquiredByAgent[]>(await fetch('/api/acquired-by-agents'), 'Unable to load Acquired By agents.');
}

export async function addAcquiredByAgent(name: string): Promise<AcquiredByAgent> {
  return parseResponse<AcquiredByAgent>(await fetch('/api/acquired-by-agents', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name }) }), 'Unable to add Acquired By name.');
}

export async function removeAcquiredByAgent(acquiredById: string): Promise<void> {
  await parseResponse<unknown>(await fetch(`/api/acquired-by-agents/${encodeURIComponent(acquiredById)}`, { method: 'DELETE' }), 'Unable to remove Acquired By name.');
}
