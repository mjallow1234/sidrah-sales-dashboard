'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { createProduct, createSalesRep, createVendor, createVisit, getInventory, getProducts, getProduct, getSalesReps, getSalesRep, getStats, getVendor, getVendors, getVendorBalances, getVisitLogs, updateProduct, updateSalesRep, updateVendor } from '@/services/gasApi';
import type { DashboardStats, Inventory, Product, SalesRep, Transaction, Vendor, VendorBalance, VisitResult } from '@/lib/types';

export function useVendorsQuery(filters?: { salesRepId?: string; sales_rep_id?: string; status?: string }) {
  return useQuery({
    queryKey: ['vendors', filters],
    queryFn: () => getVendors(filters),
  });
}

export function useVendorQuery(vendorId: string) {
  return useQuery({
    queryKey: ['vendor', vendorId],
    queryFn: () => getVendor(vendorId),
    enabled: !!vendorId,
  });
}

export function useInventoryRecordsQuery() {
  return useQuery({
    queryKey: ['inventory'],
    queryFn: () => getInventory(),
  });
}

export function useInventoryByVendorQuery(vendorId: string) {
  return useQuery({
    queryKey: ['inventory', vendorId],
    queryFn: async () => {
      const items = await getInventory({ vendorId });
      return items[0];
    },
    enabled: !!vendorId,
  });
}

export function useVendorBalancesQuery() {
  return useQuery({
    queryKey: ['vendorBalances'],
    queryFn: () => getVendorBalances(),
  });
}

export function useProductsQuery() {
  return useQuery({
    queryKey: ['products'],
    queryFn: () => getProducts(),
  });
}

export function useSalesRepsQuery() {
  return useQuery({
    queryKey: ['salesReps'],
    queryFn: () => getSalesReps(),
  });
}

export function useProductQuery(productId: string) {
  return useQuery({
    queryKey: ['product', productId],
    queryFn: () => getProduct(productId),
    enabled: !!productId,
  });
}

export function useSalesRepQuery(salesRepId: string) {
  return useQuery({
    queryKey: ['salesRep', salesRepId],
    queryFn: () => getSalesRep(salesRepId),
    enabled: !!salesRepId,
  });
}

export function useStatsQuery() {
  return useQuery({
    queryKey: ['stats'],
    queryFn: () => getStats(),
  });
}

export function useTransactionsByVendorQuery(vendorId: string) {
  return useQuery<Transaction[]>({
    queryKey: ['visitLogs', vendorId],
    queryFn: async () => {
      const logs = await getVisitLogs({ vendorId });
      return logs.map((log: any) => ({
        transaction_id: log.visit_id,
        date: log.date,
        vendor_id: log.vendor_id,
        opening_stock: Number(log.opening_stock) || 0,
        stock_sold: Number(log.stock_sold) || 0,
        stock_added: Number(log.stock_added) || 0,
        cash_collected: Number(log.cash_collected) || 0,
        closing_stock: Number(log.closing_stock) || 0,
        sales_rep: log.sales_rep_id || '',
        notes: log.notes || '',
      }));
    },
    enabled: !!vendorId,
  });
}

export function useCreateVendorMutation() {
  const queryClient = useQueryClient();
  return useMutation<Vendor, Error, Parameters<typeof createVendor>[0]>({
    mutationFn: createVendor,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });
}

export function useUpdateVendorMutation() {
  const queryClient = useQueryClient();
  return useMutation<Vendor, Error, { id: string; payload: Parameters<typeof updateVendor>[1] }>({
    mutationFn: ({ id, payload }) => updateVendor(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      queryClient.invalidateQueries({ queryKey: ['vendor'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });
}

export function useCreateProductMutation() {
  const queryClient = useQueryClient();
  return useMutation<Product, Error, Parameters<typeof createProduct>[0]>({
    mutationFn: createProduct,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });
}

export function useUpdateProductMutation() {
  const queryClient = useQueryClient();
  return useMutation<Product, Error, { id: string; payload: Parameters<typeof updateProduct>[1] }>({
    mutationFn: ({ id, payload }) => updateProduct(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });
}

export function useCreateSalesRepMutation() {
  const queryClient = useQueryClient();
  return useMutation<SalesRep, Error, Parameters<typeof createSalesRep>[0]>({
    mutationFn: createSalesRep,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salesReps'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });
}

export function useUpdateSalesRepMutation() {
  const queryClient = useQueryClient();
  return useMutation<SalesRep, Error, { id: string; payload: Parameters<typeof updateSalesRep>[1] }>({
    mutationFn: ({ id, payload }) => updateSalesRep(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salesReps'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
    },
  });
}

export function useCreateVisitMutation() {
  const queryClient = useQueryClient();

  return useMutation<VisitResult, Error, Parameters<typeof createVisit>[0]>({
    mutationFn: createVisit,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
    },
  });
}
