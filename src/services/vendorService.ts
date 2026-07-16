import type { Inventory, Vendor } from '@/lib/types';
import { getInventory, getVendor, getVendors as fetchVendors } from '@/services/gasApi';

export async function getVendorList(): Promise<Vendor[]> {
  return fetchVendors();
}

export async function getVendorById(vendorId: string): Promise<Vendor | undefined> {
  return getVendor(vendorId);
}

export async function getVendorInventory(vendorId: string): Promise<Inventory | undefined> {
  const results = await getInventory({ vendorId });
  return results[0];
}
