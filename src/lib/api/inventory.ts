import type { Inventory } from '@/lib/types';

const inventory: Inventory[] = [
  {
    vendor_id: 'V_001',
    total_stock_supplied: 120,
    total_stock_sold: 92,
    current_stock: 28,
    expected_cash: 230000,
    cash_collected: 200000,
    balance_owed: 30000,
  },
  {
    vendor_id: 'V_002',
    total_stock_supplied: 160,
    total_stock_sold: 120,
    current_stock: 40,
    expected_cash: 320000,
    cash_collected: 250000,
    balance_owed: 70000,
  },
  {
    vendor_id: 'V_003',
    total_stock_supplied: 80,
    total_stock_sold: 80,
    current_stock: 0,
    expected_cash: 160000,
    cash_collected: 160000,
    balance_owed: 0,
  },
];

export function getInventoryRecords(): Inventory[] {
  return inventory;
}

export function getInventoryByVendor(vendorId: string): Inventory | undefined {
  return inventory.find((record) => record.vendor_id === vendorId);
}
