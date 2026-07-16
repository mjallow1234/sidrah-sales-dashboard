import type { Vendor } from '@/lib/types';
import { getVendor, getVendors } from '@/services/gasApi';

export async function fetchVendors(params?: { salesRepId?: string; sales_rep_id?: string; status?: string }): Promise<Vendor[]> {
  return getVendors(params);
}

export async function fetchVendorById(vendorId: string): Promise<Vendor | undefined> {
  return getVendor(vendorId);
}
