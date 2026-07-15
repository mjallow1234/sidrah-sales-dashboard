'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import * as inventoryService from '@/services/inventoryService';
import * as transactionService from '@/services/transactionService';
import * as vendorService from '@/services/vendorService';
import type { CreateTransactionPayload } from '@/services/transactionService';
import type { DashboardStats, Inventory, Transaction, Vendor } from '@/lib/types';

export function useVendorsQuery() {
  return useQuery({
    queryKey: ['vendors'],
    queryFn: vendorService.getVendors,
  });
}

export function useVendorQuery(vendorId: string) {
  return useQuery({
    queryKey: ['vendor', vendorId],
    queryFn: () => vendorService.getVendorById(vendorId),
    enabled: !!vendorId,
  });
}

export function useInventoryRecordsQuery() {
  return useQuery({
    queryKey: ['inventory'],
    queryFn: inventoryService.getInventoryRecords,
  });
}

export function useInventoryByVendorQuery(vendorId: string) {
  return useQuery({
    queryKey: ['inventory', vendorId],
    queryFn: () => inventoryService.getInventoryByVendor(vendorId),
    enabled: !!vendorId,
  });
}

export function useTransactionsByVendorQuery(vendorId: string) {
  return useQuery({
    queryKey: ['transactions', vendorId],
    queryFn: () => transactionService.getTransactionsByVendor(vendorId),
    enabled: !!vendorId,
  });
}

export function useDashboardStatsQuery() {
  return useQuery({
    queryKey: ['dashboardStats'],
    queryFn: async () => {
      const inventory = await inventoryService.getInventoryRecords();
      const transactions = await transactionService.getTransactions();
      const today = new Date().toISOString().slice(0, 10);

      const todayTransactions = transactions.filter((item) => item.date === today);
      return {
        vendorsVisitedToday: todayTransactions.length,
        bucketsSoldToday: todayTransactions.reduce((sum, item) => sum + item.stock_sold, 0),
        cashCollectedToday: todayTransactions.reduce((sum, item) => sum + item.cash_collected, 0),
        lowStockVendors: inventory.filter((item) => item.current_stock <= 20).length,
        outstandingBalances: inventory.filter((item) => item.balance_owed > 0).length,
      };
    },
  });
}

export function useCreateVisitMutation() {
  const queryClient = useQueryClient();

  return useMutation<Transaction, Error, CreateTransactionPayload, {
      previousTransactions?: Transaction[];
      previousInventory?: Inventory;
      previousStats?: DashboardStats;
    }>({
    mutationFn: async (payload) => {
      const transaction = await transactionService.createTransaction(payload);
      await inventoryService.updateInventoryForVisit(payload.vendor_id, payload.stock_sold, payload.stock_added, payload.cash_collected);
      return transaction;
    },
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: ['transactions', payload.vendor_id] as const });
      await queryClient.cancelQueries({ queryKey: ['inventory', payload.vendor_id] as const });
      await queryClient.cancelQueries({ queryKey: ['dashboardStats'] as const });

      const previousTransactions = queryClient.getQueryData<Transaction[]>(['transactions', payload.vendor_id] as const);
      const previousInventory = queryClient.getQueryData<Inventory>(['inventory', payload.vendor_id] as const);
      const previousStats = queryClient.getQueryData<DashboardStats>(['dashboardStats'] as const);

      const newTransaction: Transaction = {
        transaction_id: `T_${Date.now()}`,
        date: new Date().toISOString().slice(0, 10),
        vendor_id: payload.vendor_id,
        opening_stock: payload.opening_stock,
        stock_sold: payload.stock_sold,
        stock_added: payload.stock_added,
        cash_collected: payload.cash_collected,
        closing_stock: payload.opening_stock - payload.stock_sold + payload.stock_added,
        sales_rep: payload.sales_rep,
        notes: payload.notes,
      };

      queryClient.setQueryData<Transaction[]>(['transactions', payload.vendor_id] as const, (old) => [newTransaction, ...(old ?? [])]);

      if (previousInventory) {
        queryClient.setQueryData<Inventory>(['inventory', payload.vendor_id] as const, {
          ...previousInventory,
          total_stock_sold: previousInventory.total_stock_sold + payload.stock_sold,
          total_stock_supplied: previousInventory.total_stock_supplied + payload.stock_added,
          current_stock: previousInventory.total_stock_supplied + payload.stock_added - (previousInventory.total_stock_sold + payload.stock_sold),
          cash_collected: previousInventory.cash_collected + payload.cash_collected,
          balance_owed: Math.max(previousInventory.expected_cash - (previousInventory.cash_collected + payload.cash_collected), 0),
        });
      }

      if (previousStats) {
        queryClient.setQueryData<DashboardStats>(['dashboardStats'] as const, {
          ...previousStats,
          vendorsVisitedToday: previousStats.vendorsVisitedToday + 1,
          bucketsSoldToday: previousStats.bucketsSoldToday + payload.stock_sold,
          cashCollectedToday: previousStats.cashCollectedToday + payload.cash_collected,
        });
      }

      return { previousTransactions, previousInventory, previousStats };
    },
    onError: (_error, payload, context) => {
      if (context?.previousTransactions) {
        queryClient.setQueryData(['transactions', payload.vendor_id] as const, context.previousTransactions);
      }
      if (context?.previousInventory) {
        queryClient.setQueryData(['inventory', payload.vendor_id] as const, context.previousInventory);
      }
      if (context?.previousStats) {
        queryClient.setQueryData(['dashboardStats'] as const, context.previousStats);
      }
    },
    onSettled: (_, __, payload) => {
      queryClient.invalidateQueries({ queryKey: ['transactions', payload.vendor_id] as const });
      queryClient.invalidateQueries({ queryKey: ['inventory', payload.vendor_id] as const });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] as const });
    },
  });
}
