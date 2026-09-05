import { getInventoryRecords, getTransactions } from '@/lib/api';
import { DEFAULT_DASHBOARD_STATS } from '@/lib/types';
import type { DashboardStats } from '@/lib/types';

export async function useDashboardStats(): Promise<DashboardStats> {
  const inventory = await getInventoryRecords();
  const transactions = await getTransactions();
  const today = new Date().toISOString().slice(0, 10);
  const todayTransactions = transactions.filter((tx) => tx.date === today);
  const visitedToday = todayTransactions.length;
  const bucketsSuppliedToday = todayTransactions.reduce((sum, tx) => sum + tx.stock_added, 0);
  const cashCollectedToday = todayTransactions.reduce((sum, tx) => sum + tx.cash_collected, 0);

  return {
    ...DEFAULT_DASHBOARD_STATS,
    vendorsVisited: visitedToday,
    bucketsSupplied: bucketsSuppliedToday,
    cashCollected: cashCollectedToday,
    lowStockVendors: inventory.filter((record) => record.current_stock <= 20).length,
    outstandingBalances: inventory.filter((record) => (record.balance_owed ?? 0) > 0).length,
    totalActiveVendors: inventory.filter((record) => record.current_stock > 0).length,
  };
}
