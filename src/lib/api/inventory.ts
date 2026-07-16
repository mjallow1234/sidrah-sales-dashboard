import type { Inventory } from '@/lib/types';
import { getInventory } from '@/services/gasApi';

export async function getInventoryRecords(): Promise<Inventory[]> {
  return getInventory();
}

export async function getInventoryByVendor(vendorId: string): Promise<Inventory | undefined> {
  const results = await getInventory({ vendorId });
  return results[0];
}
