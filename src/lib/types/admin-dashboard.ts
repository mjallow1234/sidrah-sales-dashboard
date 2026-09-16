export type AdminDashboardTrendMetric = 'cash_collected' | 'supplied_quantity' | 'supplied_value';

export interface AdminDashboardFilters {
  startDate: string;
  endDate: string;
  productId?: string;
  location?: string;
  salesRepId?: string;
}

export interface AdminDashboardKpi {
  value: number;
  label?: string;
  count?: number;
}

export interface AdminDashboardSnapshot {
  period: {
    cashCollected: number;
    suppliedQuantity: number;
    suppliedValue: number;
    visitCount: number;
    vendorsVisited: number;
  };
  current: {
    vendorReceivables: number;
    vendorsOwing: number;
    vendorCredits: number;
    vendorsInCredit: number;
    outstandingDeliveryRequests: number;
    outstandingDeliveryQuantity: number;
    factoryFinishedStock: number;
  };
}

export interface AdminDashboardTrendPoint {
  date: string;
  cashCollected: number;
  suppliedQuantity: number;
  suppliedValue: number;
}

export interface AdminDashboardLocationRow {
  location: string;
  suppliedQuantity: number;
  suppliedValue: number;
  cashCollected: number;
  activeVendors: number;
}

export interface AdminDashboardProductRow {
  productId: string;
  productName: string;
  unit: string;
  suppliedQuantity: number;
  suppliedValue: number;
  cashCollected: number;
}

export interface AdminDashboardSalesRepRow {
  salesRepId?: string;
  salesRepName: string;
  visits: number;
  vendorsVisited: number;
  suppliedQuantity: number;
  suppliedValue: number;
  cashCollected: number;
  hasUnresolvedIdentity?: boolean;
}

export interface AdminDashboardDeliverySummary {
  outstandingRequests: number;
  outstandingQuantity: number;
  unassignedRequests: number;
}

export interface AdminDashboardFactoryProduct {
  productId: string;
  productName: string;
  unit: string;
  currentQuantity: number;
}

export interface AdminDashboardFactorySummary {
  finishedStockQuantity: number;
  products: AdminDashboardFactoryProduct[];
  productionQuantity: number;
  outflowQuantity: number;
  lowStockProducts: AdminDashboardFactoryProduct[];
}

export interface AdminDashboardVendorAttention {
  vendorId: string;
  vendorName: string;
  location: string;
  amount: number;
}

export interface AdminDashboardAttention {
  topVendorsOwing: AdminDashboardVendorAttention[];
  vendorCredits: AdminDashboardVendorAttention[];
  unassignedDeliveries: number;
  outstandingDeliveries: number;
  outstandingDeliveryQuantity: number;
  lowFactoryStock: AdminDashboardFactoryProduct[];
}

export interface AdminDashboardDataQuality {
  unknownLocationVendors: number;
  visitRowsWithMissingActor: number;
  reversedVisitRowsExcluded: number;
  notes: string[];
}

export interface AdminDashboardFilterOptions {
  locations: string[];
}

export interface AdminDashboardSummary {
  filters: AdminDashboardFilters;
  snapshot: AdminDashboardSnapshot;
  trends: AdminDashboardTrendPoint[];
  locations: AdminDashboardLocationRow[];
  products: AdminDashboardProductRow[];
  salesReps: AdminDashboardSalesRepRow[];
  deliveries: AdminDashboardDeliverySummary;
  factory: AdminDashboardFactorySummary;
  attention: AdminDashboardAttention;
  dataQuality: AdminDashboardDataQuality;
  filterOptions: AdminDashboardFilterOptions;
}
