'use client';

import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { createProduct, getProducts, getProduct, updateProduct } from '@/lib/api/products';
import { createSalesRep, getSalesReps, getSalesRep, updateSalesRep } from '@/lib/api/salesreps';
import { getStats } from '@/lib/api/stats';
import { createVendor, fetchVendorById, fetchVendors, fetchPaginatedVendors, updateVendor } from '@/lib/api/vendors';
import { createVisit, createSupply, getTransactions, getTransactionsByVendor } from '@/lib/api/transactions';
import { reverseVisit, transferStock, retrieveStock } from '@/lib/api/adminStock';
import { getAdminActivity } from '@/lib/api/adminActivity';
import { getInventoryRecords, getInventoryByVendor, getVendorInventory, getVendorInventoryByVendorAndProduct, getVendorBalances } from '@/lib/api/inventory';
import { DEFAULT_DASHBOARD_STATS, type AdminActivityRecord, type DashboardStats, type Inventory, type Product, type ReverseVisitResult, type SalesRep, type Transaction, type Vendor, type VendorBalance, type VendorInventory, type VisitResult } from '@/lib/types';
import type { SessionVerificationResult } from '@/lib/session';

export interface PaginatedResult<T> {
  status: string;
  data: {
    items: T[];
    totalCount: number;
    page: number;
    pageSize: number;
  };
}

export function useVendorsQuery(filters?: { salesRepId?: string; sales_rep_id?: string; status?: string }) {
  return useQuery({
    queryKey: ['vendors', filters],
    queryFn: () => fetchVendors(filters),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

export function usePaginatedVendorsQuery(
  filters?: { salesRepId?: string; sales_rep_id?: string; status?: string; search?: string },
  page = 1,
  pageSize = 50
) {
  return useQuery<PaginatedResult<Vendor>>({
    queryKey: ['vendorsPage', filters, page, pageSize],
    queryFn: () => fetchPaginatedVendors({ ...filters, page, pageSize }),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

export function useVendorQuery(vendorId: string) {
  return useQuery({
    queryKey: ['vendor', vendorId],
    queryFn: () => fetchVendorById(vendorId),
    enabled: !!vendorId,
  });
}

export function useInventoryRecordsQuery() {
  return useQuery({
    queryKey: ['inventory'],
    queryFn: () => getInventoryRecords(),
  });
}

export function useInventoryByVendorQuery(vendorId: string) {
  return useQuery({
    queryKey: ['inventory', vendorId],
    queryFn: () => getInventoryByVendor(vendorId),
    enabled: !!vendorId,
  });
}

export function useVendorInventoryQuery(vendorId: string) {
  return useQuery({
    queryKey: ['vendorInventory', vendorId],
    queryFn: () => getVendorInventory(vendorId),
    enabled: !!vendorId,
  });
}

export function useVendorInventoryByVendorAndProductQuery(vendorId: string, productId: string) {
  return useQuery<VendorInventory | null>({
    queryKey: ['vendorInventory', vendorId, productId],
    queryFn: () => getVendorInventoryByVendorAndProduct(vendorId, productId),
    enabled: !!vendorId && !!productId,
  });
}

export function useVendorBalanceQuery(vendorId: string) {
  return useQuery<VendorBalance | null>({
    queryKey: ['vendorBalance', vendorId],
    queryFn: async () => {
      const balances = await getVendorBalances(vendorId);
      return balances.length > 0 ? balances[0] : null;
    },
    enabled: !!vendorId,
  });
}

export function useTransactionsQuery(filters?: { vendorId?: string; salesRepId?: string; productId?: string; startDate?: string; endDate?: string; market?: string }) {
  return useQuery<Transaction[]>({
    queryKey: ['transactions', filters],
    queryFn: async () => {
      const logs = await getTransactions(filters);
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
        actor: log.actor || '',
        notes: log.notes || '',
      }));
    },
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
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

export function useAuthQuery() {
  return useQuery<SessionVerificationResult>({
    queryKey: ['auth'],
    queryFn: async () => {
      const response = await fetch('/api/auth');
      if (!response.ok) {
        throw new Error('Unable to fetch auth session.');
      }
      return response.json() as Promise<SessionVerificationResult>;
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

export function useSalesRepsQuery(enabled = true) {
  return useQuery({
    queryKey: ['salesReps'],
    queryFn: () => getSalesReps(),
    enabled,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
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

export function useStatsQuery(
  filters?: { vendorId?: string; salesRepId?: string; productId?: string; startDate?: string; endDate?: string; market?: string },
  options?: { enabled?: boolean }
): UseQueryResult<DashboardStats, Error> {
  return useQuery<DashboardStats, Error, DashboardStats>({
    queryKey: ['stats', filters],
    queryFn: () => getStats(filters),
    initialData: DEFAULT_DASHBOARD_STATS,
    enabled: options?.enabled,
  });
}

export function useTransactionsByVendorQuery(vendorId: string) {
  return useQuery<Transaction[]>({
    queryKey: ['transactions', vendorId],
    queryFn: async () => {
      const logs = await getTransactionsByVendor(vendorId);
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
        actor: log.actor || '',
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
      queryClient.invalidateQueries({ queryKey: ['vendorInventory'] });
      queryClient.invalidateQueries({ queryKey: ['stats'] });
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
    },
  });
}

export function useReverseVisitMutation() {
  return useMutation<ReverseVisitResult, Error, Parameters<typeof reverseVisit>[0]>({
    mutationFn: reverseVisit,
  });
}

export function useTransferStockMutation() {
  return useMutation<any, Error, Parameters<typeof transferStock>[0]>({
    mutationFn: transferStock,
  });
}

export function useRetrieveStockMutation() {
  return useMutation<any, Error, Parameters<typeof retrieveStock>[0]>({
    mutationFn: retrieveStock,
  });
}

export function useCreateSupplyMutation() {
  const queryClient = useQueryClient();

  return useMutation<any, Error, Parameters<typeof createSupply>[0]>({
    mutationFn: createSupply,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['vendorInventory', variables.vendor_id] });
      queryClient.invalidateQueries({ queryKey: ['vendor', variables.vendor_id] });
      queryClient.invalidateQueries({ queryKey: ['visitLogs', variables.vendor_id] });
      queryClient.invalidateQueries({ queryKey: ['adminActivity'] });
    },
  });
}

export function useAdminActivityQuery(filters?: { startDate?: string; endDate?: string; actionType?: string; adminId?: string; vendorId?: string; productId?: string; search?: string }) {
  return useQuery<AdminActivityRecord[]>({
    queryKey: ['adminActivity', filters],
    queryFn: () => getAdminActivity(filters),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
