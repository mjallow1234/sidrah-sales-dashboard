import { useMemo } from 'react';
import { getInventoryRecords, getTransactions } from '@/lib/api';
import type { DashboardStats } from '@/lib/types';

export function useDashboardStats() {
  const inventory = getInventoryRecords();
  const transactions = getTransactions();

  return useMemo<DashboardStats>(() => {
    const today = new Date().toISOString().slice(0, 10);
    const todayTransactions = transactions.filter((tx) => tx.date === today);
    const visitedToday = todayTransactions.length;
    const bucketsSoldToday = todayTransactions.reduce((sum, tx) => sum + tx.stock_sold, 0);
    const cashCollectedToday = todayTransactions.reduce((sum, tx) => sum + tx.cash_collected, 0);

    return {
      vendorsVisitedToday: visitedToday,
      bucketsSoldToday,
      cashCollectedToday,
      lowStockVendors: inventory.filter((record) => record.current_stock <= 20).length,
      outstandingBalances: inventory.filter((record) => record.balance_owed > 0).length,
    };
  }, [inventory, transactions]);
}
