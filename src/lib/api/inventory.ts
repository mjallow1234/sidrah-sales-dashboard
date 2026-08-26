import type { Inventory, VendorBalance, VendorInventory, VendorOwing } from '@/lib/types';

function buildQueryString(params: Record<string, unknown | undefined>) {
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    searchParams.append(key, String(value));
  }
  const query = searchParams.toString();
  return query ? `?${query}` : '';
}

export async function getInventoryRecords(): Promise<Inventory[]> {
  const response = await fetch('/api/inventory');
  if (!response.ok) {
    throw new Error('Unable to fetch inventory records');
  }
  const json = await response.json();
  return json.data;
}

export async function getInventoryByVendor(vendorId: string): Promise<Inventory | undefined> {
  const response = await fetch(`/api/inventory${buildQueryString({ vendorId })}`);
  if (!response.ok) {
    throw new Error('Unable to fetch vendor inventory');
  }
  const json = await response.json();
  return Array.isArray(json.data) ? json.data[0] : json.data;
}

export async function getVendorInventory(vendorId: string): Promise<VendorInventory[]> {
  const response = await fetch(`/api/vendorinventory${buildQueryString({ vendorId })}`);
  if (!response.ok) {
    throw new Error('Unable to fetch vendor inventory');
  }
  const json = await response.json();
  return json.data;
}

export async function getVendorInventoryByVendorAndProduct(vendorId: string, productId: string): Promise<VendorInventory | null> {
  const response = await fetch(`/api/vendorinventory${buildQueryString({ vendorId, productId })}`);
  if (!response.ok) {
    throw new Error('Unable to fetch vendor inventory record');
  }
  const json = await response.json();
  return Array.isArray(json.data) && json.data.length > 0 ? json.data[0] : null;
}

export async function getVendorBalances(vendorId?: string): Promise<VendorBalance[]> {
  const response = await fetch(`/api/vendorbalances${buildQueryString({ vendorId })}`);
  if (!response.ok) {
    throw new Error('Unable to fetch vendor balances');
  }
  const json = await response.json();
  return json.data;
}

export async function getVendorsOwing(): Promise<VendorOwing[]> {
  const response = await fetch('/api/vendorbalances/owing');
  if (!response.ok) {
    throw new Error('Unable to fetch vendors owing');
  }
  const json = await response.json();
  return json.data;
}
