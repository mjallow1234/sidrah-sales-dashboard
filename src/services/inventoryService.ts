import { fetchInventoryByVendor, fetchInventoryRecords } from '@/services/gasApi';
import type { Inventory } from '@/lib/types';

export async function getInventoryRecords(): Promise<Inventory[]> {
  return fetchInventoryRecords();
}

export async function getInventoryByVendor(vendorId: string): Promise<Inventory | undefined> {
  return fetchInventoryByVendor(vendorId);
}

export async function updateInventoryForVisit(
  vendorId: string,
  stockSold: number,
  stockAdded: number,
  cashCollected: number,
): Promise<Inventory | undefined> {
  const record = await fetchInventoryByVendor(vendorId);
  if (!record) {
    return undefined;
  }

  const updatedRecord: Inventory = {
    ...record,
    total_stock_sold: record.total_stock_sold + stockSold,
    total_stock_supplied: record.total_stock_supplied + stockAdded,
    current_stock: record.total_stock_supplied + stockAdded - (record.total_stock_sold + stockSold),
    cash_collected: record.cash_collected + cashCollected,
    balance_owed: Math.max(record.expected_cash - (record.cash_collected + cashCollected), 0),
  };

  return updatedRecord;
}
