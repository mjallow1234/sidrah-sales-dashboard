'use client';

import { useMutation, useQuery, useQueryClient, type UseQueryResult } from '@tanstack/react-query';
import { createProduct, getProducts, getProduct, updateProduct } from '@/lib/api/products';
import { createSalesRep, getSalesReps, getSalesRep, updateSalesRep } from '@/lib/api/salesreps';
import { getStats } from '@/lib/api/stats';
import { createVendor, fetchVendorById, fetchVendors, fetchPaginatedVendors, updateVendor } from '@/lib/api/vendors';
import { createVisit, createSupply, getTransactions, getTransactionsByVendor } from '@/lib/api/transactions';
import { addDeliveryComment, claimDelivery, createDelivery, getDelivery, getDeliveries, getDeliveryActivity, getDeliveryPreparationSummary, getDeliveryUsers, markDeliveryDelivered, reassignDelivery, cancelDelivery, type DeliveryUserOption } from '@/lib/api/deliveries';
import { reverseVisit, transferStock, retrieveStock, resolveVendorInventoryValuation } from '@/lib/api/adminStock';
import { getAdminActivity } from '@/lib/api/adminActivity';
import { getInventoryRecords, getInventoryByVendor, getVendorInventory, getVendorInventoryByVendorAndProduct, getVendorBalances, getVendorsOwing } from '@/lib/api/inventory';
import { getVendorIntelligence } from '@/lib/api/intelligence';
import { getFactoryInventory, getFactoryMovements, createFactoryMovement, editFactoryMovement, reverseFactoryMovement, getFactoryRevisions } from '@/lib/api/factory';
import { getFactoryContainerInventory, getFactoryContainerMovements, createFactoryContainerMovement, editFactoryContainerMovement, reverseFactoryContainerMovement, getFactoryContainerRevisions } from '@/lib/api/factoryContainers';
import { DEFAULT_DASHBOARD_STATS, type AdminActivityRecord, type DashboardStats, type DeliveryActivity, type DeliveryItem, type DeliveryPreparationSummary, type DeliveryRecord, type FactoryContainerInventory, type FactoryContainerMovement, type FactoryInventory, type FactoryStockMovement, type Inventory, type Product, type ReverseVisitResult, type SalesRep, type Transaction, type Vendor, type VendorBalance, type VendorInventory, type VendorIntelligence, type VisitResult } from '@/lib/types';
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

export function useVendorIntelligenceQuery(vendorId?: string, market?: string) {
  return useQuery<VendorIntelligence>({
    queryKey: ['vendorIntelligence', vendorId, market],
    queryFn: () => getVendorIntelligence(vendorId ?? '', market),
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
        visit_id: log.visit_id,
        timestamp: log.timestamp,
        date: log.date,
        vendor_id: log.vendor_id,
        vendor_name: log.vendor_name,
        product_id: log.product_id,
        product_name: log.product_name,
        sales_rep_id: log.sales_rep_id,
        sales_rep_name: log.sales_rep_name,
        opening_stock: Number(log.opening_stock) || 0,
        stock_sold: Number(log.stock_sold) || 0,
        stock_added: Number(log.stock_added) || 0,
        cash_collected: Number(log.cash_collected) || 0,
        closing_stock: Number(log.closing_stock) || 0,
        sales_rep: log.sales_rep_id || '',
        actor: log.actor || '',
        notes: log.notes || '',
        is_reversed: Boolean(log.is_reversed),
        reversed_at: log.reversed_at,
        reversed_by: log.reversed_by,
        reversed_by_name: log.reversed_by_name,
        reversal_reason: log.reversal_reason,
        reversal_operation_id: log.reversal_operation_id,
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

export function useVendorsOwingQuery() {
  return useQuery({
    queryKey: ['vendorsOwing'],
    queryFn: () => getVendorsOwing(),
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

export function useFactoryInventoryQuery() {
  return useQuery<FactoryInventory[]>({ queryKey: ['factoryInventory'], queryFn: getFactoryInventory });
}

export function useFactoryMovementsQuery() {
  return useQuery<FactoryStockMovement[]>({ queryKey: ['factoryMovements'], queryFn: getFactoryMovements });
}
export function useFactoryRevisionsQuery(eventId?: string) { return useQuery<any[]>({ queryKey: ['factoryRevisions', eventId], queryFn: () => getFactoryRevisions(eventId as string), enabled: Boolean(eventId) }); }

export function useCreateFactoryMovementMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createFactoryMovement,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['factoryInventory'] });
      queryClient.invalidateQueries({ queryKey: ['factoryMovements'] });
    },
  });
}
export function useEditFactoryMovementMutation() { const queryClient = useQueryClient(); return useMutation({ mutationFn: editFactoryMovement, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['factoryInventory'] }); queryClient.invalidateQueries({ queryKey: ['factoryMovements'] }); } }); }
export function useReverseFactoryMovementMutation() { const queryClient = useQueryClient(); return useMutation({ mutationFn: reverseFactoryMovement, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['factoryInventory'] }); queryClient.invalidateQueries({ queryKey: ['factoryMovements'] }); } }); }

export function useFactoryContainerInventoryQuery(enabled = true) {
  return useQuery<FactoryContainerInventory[]>({ queryKey: ['factoryContainerInventory'], queryFn: getFactoryContainerInventory, enabled });
}

export function useFactoryContainerMovementsQuery() {
  return useQuery<FactoryContainerMovement[]>({ queryKey: ['factoryContainerMovements'], queryFn: getFactoryContainerMovements });
}
export function useFactoryContainerRevisionsQuery(movementId?: string) { return useQuery<any[]>({ queryKey: ['factoryContainerRevisions', movementId], queryFn: () => getFactoryContainerRevisions(movementId as string), enabled: Boolean(movementId) }); }

export function useCreateFactoryContainerMovementMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createFactoryContainerMovement,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['factoryContainerInventory'] });
      queryClient.invalidateQueries({ queryKey: ['factoryContainerMovements'] });
    },
  });
}
export function useEditFactoryContainerMovementMutation() { const queryClient = useQueryClient(); return useMutation({ mutationFn: editFactoryContainerMovement, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['factoryContainerInventory'] }); queryClient.invalidateQueries({ queryKey: ['factoryContainerMovements'] }); } }); }
export function useReverseFactoryContainerMovementMutation() { const queryClient = useQueryClient(); return useMutation({ mutationFn: reverseFactoryContainerMovement, onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['factoryContainerInventory'] }); queryClient.invalidateQueries({ queryKey: ['factoryContainerMovements'] }); } }); }

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

export function useDeliveriesQuery(filters?: { status?: string }) {
  return useQuery<DeliveryRecord[]>({
    queryKey: ['deliveries', filters],
    queryFn: () => getDeliveries(filters),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

export function useDeliveryQuery(deliveryId?: string) {
  return useQuery<DeliveryRecord | null>({
    queryKey: ['delivery', deliveryId],
    queryFn: () => getDelivery(deliveryId ?? ''),
    enabled: !!deliveryId,
  });
}

export function useDeliveryUsersQuery(enabled = true) {
  return useQuery<DeliveryUserOption[]>({
    queryKey: ['deliveryUsers'],
    queryFn: () => getDeliveryUsers(),
    enabled,
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
        visit_id: log.visit_id,
        timestamp: log.timestamp,
        date: log.date,
        vendor_id: log.vendor_id,
        vendor_name: log.vendor_name,
        product_id: log.product_id,
        product_name: log.product_name,
        sales_rep_id: log.sales_rep_id,
        sales_rep_name: log.sales_rep_name,
        opening_stock: Number(log.opening_stock) || 0,
        stock_sold: Number(log.stock_sold) || 0,
        stock_added: Number(log.stock_added) || 0,
        cash_collected: Number(log.cash_collected) || 0,
        closing_stock: Number(log.closing_stock) || 0,
        sales_rep: log.sales_rep_id || '',
        actor: log.actor || '',
        notes: log.notes || '',
        is_reversed: Boolean(log.is_reversed),
        reversed_at: log.reversed_at,
        reversed_by: log.reversed_by,
        reversed_by_name: log.reversed_by_name,
        reversal_reason: log.reversal_reason,
        reversal_operation_id: log.reversal_operation_id,
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

export function useCreateDeliveryMutation() {
  const queryClient = useQueryClient();
  return useMutation<DeliveryRecord, Error, Parameters<typeof createDelivery>[0]>({
    mutationFn: createDelivery,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deliveries'] });
      queryClient.invalidateQueries({ queryKey: ['deliveryPreparationSummary'] });
    },
  });
}

export function useClaimDeliveryMutation() {
  const queryClient = useQueryClient();
  return useMutation<DeliveryRecord, Error, { deliveryId: string; comment?: string }>(
    {
      mutationFn: ({ deliveryId, comment }) => claimDelivery(deliveryId, comment),
      onSuccess: (_data, variables) => {
        queryClient.invalidateQueries({ queryKey: ['deliveries'] });
        queryClient.invalidateQueries({ queryKey: ['delivery'] });
        queryClient.invalidateQueries({ queryKey: ['deliveryPreparationSummary'] });
        queryClient.invalidateQueries({ queryKey: ['deliveryActivity', variables.deliveryId] });
      },
    }
  );
}

export function useMarkDeliveryDeliveredMutation() {
  const queryClient = useQueryClient();
  return useMutation<DeliveryRecord, Error, { deliveryId: string; comment?: string }>(
    {
      mutationFn: ({ deliveryId, comment }) => markDeliveryDelivered(deliveryId, comment),
      onSuccess: (_data, variables) => {
        queryClient.invalidateQueries({ queryKey: ['deliveries'] });
        queryClient.invalidateQueries({ queryKey: ['delivery'] });
        queryClient.invalidateQueries({ queryKey: ['deliveryPreparationSummary'] });
        queryClient.invalidateQueries({ queryKey: ['deliveryActivity', variables.deliveryId] });
      },
    }
  );
}

export function useReassignDeliveryMutation() {
  const queryClient = useQueryClient();
  return useMutation<DeliveryRecord, Error, { deliveryId: string; deliveryUserId: string; comment?: string }>(
    {
      mutationFn: ({ deliveryId, deliveryUserId, comment }) => reassignDelivery(deliveryId, deliveryUserId, comment),
      onSuccess: (_data, variables) => {
        queryClient.invalidateQueries({ queryKey: ['deliveries'] });
        queryClient.invalidateQueries({ queryKey: ['delivery'] });
        queryClient.invalidateQueries({ queryKey: ['deliveryPreparationSummary'] });
        queryClient.invalidateQueries({ queryKey: ['deliveryActivity', variables.deliveryId] });
      },
    }
  );
}

export function useCancelDeliveryMutation() {
  const queryClient = useQueryClient();
  return useMutation<DeliveryRecord, Error, { deliveryId: string; comment?: string }>(
    {
      mutationFn: ({ deliveryId, comment }) => cancelDelivery(deliveryId, comment),
      onSuccess: (_data, variables) => {
        queryClient.invalidateQueries({ queryKey: ['deliveries'] });
        queryClient.invalidateQueries({ queryKey: ['delivery'] });
        queryClient.invalidateQueries({ queryKey: ['deliveryPreparationSummary'] });
        queryClient.invalidateQueries({ queryKey: ['deliveryActivity', variables.deliveryId] });
      },
    }
  );
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
  const queryClient = useQueryClient();
  return useMutation<ReverseVisitResult, Error, Parameters<typeof reverseVisit>[0]>({
    mutationFn: reverseVisit,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] });
      queryClient.invalidateQueries({ queryKey: ['vendorInventory'] });
      queryClient.invalidateQueries({ queryKey: ['vendorBalance'] });
      queryClient.invalidateQueries({ queryKey: ['vendor'] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['vendorBalances'] });
      queryClient.invalidateQueries({ queryKey: ['vendorsOwing'] });
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
    },
  });
}

export function useDeliveryActivityQuery(deliveryId?: string) {
  return useQuery({
    queryKey: ['deliveryActivity', deliveryId],
    queryFn: () => getDeliveryActivity(deliveryId ?? ''),
    enabled: !!deliveryId,
  });
}

export function useAddDeliveryCommentMutation() {
  const queryClient = useQueryClient();
  return useMutation<DeliveryActivity[], Error, { deliveryId: string; comment: string }>({
    mutationFn: ({ deliveryId, comment }) => addDeliveryComment(deliveryId, comment),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['deliveryActivity', variables.deliveryId] });
    },
  });
}

export function useDeliveryPreparationSummaryQuery(enabled = true) {
  return useQuery<DeliveryPreparationSummary>({
    queryKey: ['deliveryPreparationSummary'],
    queryFn: getDeliveryPreparationSummary,
    enabled,
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });
}

export function useTransferStockMutation() {
  const queryClient = useQueryClient();
  return useMutation<any, Error, Parameters<typeof transferStock>[0]>({
    mutationFn: transferStock,
    onSuccess: (_data, variables) => {
      for (const vendorId of [variables.source_vendor_id, variables.destination_vendor_id]) {
        queryClient.invalidateQueries({ queryKey: ['vendorInventory', vendorId] });
        queryClient.invalidateQueries({ queryKey: ['vendorBalance', vendorId] });
        queryClient.invalidateQueries({ queryKey: ['vendor', vendorId] });
        queryClient.invalidateQueries({ queryKey: ['inventory', vendorId] });
      }
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['vendorBalances'] });
      queryClient.invalidateQueries({ queryKey: ['vendorsOwing'] });
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      queryClient.invalidateQueries({ queryKey: ['adminActivity'] });
    },
  });
}

export function useRetrieveStockMutation() {
  const queryClient = useQueryClient();
  return useMutation<any, Error, Parameters<typeof retrieveStock>[0]>({
    mutationFn: retrieveStock,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['vendorInventory', variables.vendor_id] });
      queryClient.invalidateQueries({ queryKey: ['vendorBalance', variables.vendor_id] });
      queryClient.invalidateQueries({ queryKey: ['vendor', variables.vendor_id] });
      queryClient.invalidateQueries({ queryKey: ['inventory', variables.vendor_id] });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['vendorBalances'] });
      queryClient.invalidateQueries({ queryKey: ['vendorsOwing'] });
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      queryClient.invalidateQueries({ queryKey: ['adminActivity'] });
    },
  });
}

export function useResolveVendorInventoryValuationMutation() {
  const queryClient = useQueryClient();
  return useMutation<any, Error, Parameters<typeof resolveVendorInventoryValuation>[0]>({
    mutationFn: resolveVendorInventoryValuation,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['vendorInventory', variables.vendor_id] });
      queryClient.invalidateQueries({ queryKey: ['vendorBalance', variables.vendor_id] });
      queryClient.invalidateQueries({ queryKey: ['vendor', variables.vendor_id] });
      queryClient.invalidateQueries({ queryKey: ['adminActivity'] });
    },
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

export function useAdminActivityQuery(filters?: { startDate?: string; endDate?: string; actionType?: string; adminId?: string; vendorId?: string; sourceVendorId?: string; productId?: string; search?: string }, options?: { enabled?: boolean }) {
  return useQuery<AdminActivityRecord[]>({
    queryKey: ['adminActivity', filters],
    queryFn: () => getAdminActivity(filters),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    enabled: options?.enabled ?? true,
  });
}
