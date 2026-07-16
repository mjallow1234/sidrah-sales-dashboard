import { getInventory } from '@/services/gasApi';
import type { Inventory } from '@/lib/types';

export async function getInventoryRecords(): Promise<Inventory[]> {
  return getInventory();
}

export async function getInventoryByVendor(vendorId: string): Promise<Inventory | undefined> {
  const results = await getInventory({ vendorId });
  return results[0];
}

export async function updateInventoryForVisit(
  vendorId: string,
  stockSold: number,
  stockAdded: number,
  cashCollected: number,
): Promise<Inventory | undefined> {
  const record = await getInventoryByVendor(vendorId);
  if (!record) {
    return undefined;
  }

  return {
    ...record,
    total_stock_sold: record.total_stock_sold + stockSold,
    total_stock_supplied: record.total_stock_supplied + stockAdded,
    current_stock: record.total_stock_supplied + stockAdded - (record.total_stock_sold + stockSold),
    cash_collected: (record.cash_collected ?? 0) + cashCollected,
    balance_owed: Math.max((record.expected_cash ?? 0) - ((record.cash_collected ?? 0) + cashCollected), 0),
  };
}
