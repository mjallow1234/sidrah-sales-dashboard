import type { Inventory, Vendor } from '@/lib/types';
import { fetchInventoryByVendor, fetchVendorById, fetchVendors } from '@/services/gasApi';

export async function getVendors(): Promise<Vendor[]> {
  return fetchVendors();
}

export async function getVendorById(vendorId: string): Promise<Vendor | undefined> {
  return fetchVendorById(vendorId);
}

export async function getVendorInventory(vendorId: string): Promise<Inventory | undefined> {
  return fetchInventoryByVendor(vendorId);
}
