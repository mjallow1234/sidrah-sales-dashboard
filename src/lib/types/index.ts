export type UserRole = 'agent' | 'supervisor' | 'admin';

export interface User {
  id: string;
  name: string;
  phone: string;
  role: UserRole;
  password?: string;
}

export interface Vendor {
  vendor_id: string;
  vendor_name: string;
  phone: string;
  location: string;
  sales_rep?: string;
  sales_rep_id?: string;
  assigned_date?: string;
  assigned_by?: string;
  date_created: string;
  last_updated?: string;
  status: 'active' | 'inactive';
  created_by?: string;
  updated_by?: string;
}

export interface Product {
  product_id: string;
  sku: string;
  product_name: string;
  category: string;
  unit: string;
  default_unit_price: number;
  currency: string;
  low_stock_threshold: number;
  active: boolean;
  date_created: string;
  last_updated: string;
  created_by?: string;
  updated_by?: string;
}

export interface SalesRep {
  sales_rep_id: string;
  name: string;
  phone: string;
  role: string;
  status: 'active' | 'inactive';
  date_created: string;
  last_updated: string;
}

export interface Inventory {
  inventory_id: string;
  vendor_id: string;
  product_id?: string;
  total_stock_supplied: number;
  total_stock_sold: number;
  current_stock: number;
  expected_cash?: number;
  cash_collected?: number;
  balance_owed?: number;
  date_created?: string;
  last_updated?: string;
}

export interface VendorInventory {
  vendor_inventory_id: string;
  vendor_id: string;
  product_id: string;
  current_stock: number;
  total_stock_received: number;
  total_stock_sold: number;
  created_at: string;
  updated_at: string;
}

export interface VendorBalance {
  vendor_id: string;
  total_expected_cash: number;
  cash_collected: number;
  balance_owed: number;
  date_created: string;
  last_updated: string;
}

export interface VendorOwing {
  vendor_id: string;
  vendor_name: string;
  balance_owed: number;
  last_visit_date: string;
}

export type SignalStatus = 'ok' | 'no_history' | 'insufficient_data' | 'sparse_data';

export interface Evidence {
  sourceTable: string;
  sourceColumns: string[];
  filterDescription: string;
  rowCount: number;
  dateRange?: { start: string; end: string };
  note?: string;
}

export type IntelligenceConfidence = 'strong' | 'moderate' | 'limited';

export interface IntelligenceSummary {
  headline: string;
  explanation: string;
  whatIsHappening: string;
  whyItMatters: string;
  whatToDo: string;
  confidence: IntelligenceConfidence;
  evidence: Evidence[];
}

export type OverallAssessment = 'Healthy' | 'Watch' | 'At Risk' | 'Insufficient Data';

export type TrendDirection = 'up' | 'down' | 'flat' | 'insufficient_data';

export interface TrendSignal {
  name: string;
  label: string;
  currentValue?: number;
  previousValue?: number;
  direction: TrendDirection;
  note: string;
  evidence: Evidence[];
}

export type IntelligenceSignalLevel = 'critical' | 'high' | 'watch' | 'opportunity' | 'healthy';

export interface IntelligenceSignal {
  title: string;
  level: IntelligenceSignalLevel;
  summary: string;
  detail: string;
  action?: string;
  evidence: Evidence[];
}

export interface IntelligenceAction {
  title: string;
  description: string;
  evidence?: Evidence[];
}

export interface ProductIntelligence {
  productId: string;
  productName?: string;
  category?: string;
  unit?: string;
  currentStock: number;
  unitsSold: number;
  salesValue: number;
  expectedValue: number;
  salesShare?: number;
  averageUnitPrice?: number;
  coverageDays?: number;
  movementClassification?: 'fast' | 'normal' | 'slow' | 'not_moving';
  trendDirection: TrendDirection;
  trendLabel: string;
  coverageNote?: string;
  recommendedAction?: string;
  evidence: Evidence[];
}

export interface Signal<T> {
  name: string;
  value: T;
  status: SignalStatus;
  evidence: Evidence[];
}

export interface VendorIntelligenceOptions {
  startDate?: string;
  endDate?: string;
  productId?: string;
  salesRepId?: string;
  market?: string;
}

export interface ProductPerformanceOptions {
  startDate?: string;
  endDate?: string;
  salesRepId?: string;
  market?: string;
  minSalesDays?: number;
}

export interface ProductPerformance {
  productId: string;
  productName?: string;
  category?: string;
  unit?: string;
  unitsSold: number;
  salesValue: number;
  expectedValue: number;
  salesShare?: number;
  averageUnitPrice?: number;
  currentStock: number;
  stockRemainingDays?: number;
  movementClassification?: 'fast' | 'normal' | 'slow' | 'not_moving';
  visitCount: number;
  firstSaleDate?: string;
  lastSaleDate?: string;
}

export interface VendorIntelligence {
  vendorId: string;
  vendorName?: string;
  summary: IntelligenceSummary;
  assessment: OverallAssessment;
  topSignals: IntelligenceSignal[];
  trendSignals: TrendSignal[];
  statusSummary: {
    currentStock: number;
    recentSales: number;
    balanceOwed: number;
    collectionRate?: number;
    stockCoverageDays?: number;
  };
  salesVolume: Signal<{
    totalUnitsSold: number;
    totalSalesValue: number;
    totalCashCollected: number;
  }>;
  salesVelocity: Signal<{
    averageDailyUnits?: number;
    averageDailyValue?: number;
    visitCount: number;
    windowDays: number;
  }>;
  currentInventory: Signal<{
    totalStockUnits: number;
    totalProducts: number;
  }>;
  stockRemaining: Signal<{
    daysRemaining?: number;
    method?: 'averageDailySales';
    coverageNote?: string;
  }>;
  lastVisit: Signal<{ lastVisitDate?: string }>;
  visitFrequency: Signal<{
    visitCount: number;
    distinctVisitDays: number;
    averageDaysBetweenVisits?: number;
  }>;
  outstandingBalance: Signal<{
    balanceOwed: number;
    positiveReceivables: number;
    vendorCredits: number;
    totalExpectedCash: number;
    totalCashCollected: number;
  }>;
  paymentMetrics: Signal<{
    totalCashCollected: number;
    totalExpectedCash: number;
    collectionRate?: number;
    paymentMethodBreakdown: Record<string, number>;
  }>;
  productPerformance: Signal<ProductPerformance[]>;
  risks: IntelligenceSignal[];
  opportunities: IntelligenceSignal[];
  productIntelligence: ProductIntelligence[];
  dataQualitySignals?: IntelligenceSignal[];
}

export interface VisitResult {
  visitLog: Record<string, unknown>;
  inventory: Inventory | null;
  vendorInventory: VendorInventory | null;
  vendorBalance: VendorBalance;
}

export interface ReverseVisitResult {
  visitLog: Record<string, unknown>;
  inventory: Inventory;
  vendorInventory: VendorInventory;
  vendorBalance: VendorBalance;
}

export interface AppUser {
  user_id: string;
  username: string;
  email: string;
  phone: string;
  name: string;
  role: 'super_admin' | 'admin' | 'supervisor' | 'agent';
  status: 'active' | 'inactive' | 'suspended';
  sales_rep_id?: string;
  password_hash: string;
  password_reset_required: string;
  last_login: string;
  is_system_user: string;
  failed_login_count: number;
  last_failed_login: string;
  lockout_until: string;
  created_by: string;
  updated_by: string;
  password_changed_at: string;
  date_created: string;
  last_updated: string;
}

export interface Permission {
  permission_id: string;
  role: string;
  resource: string;
  action: string;
  allowed: boolean;
  description: string;
  date_created: string;
  last_updated: string;
}

export interface AuthAuditLog {
  auth_audit_id: string;
  timestamp: string;
  user_id: string;
  email: string;
  event: string;
  status: string;
  ip_address?: string;
  user_agent?: string;
  details?: string;
  date_created: string;
}

export interface PasswordResetToken {
  token_id: string;
  user_id: string;
  email: string;
  token_hash: string;
  expires_at: string;
  used: boolean;
  created_by: string;
  date_created: string;
  last_updated: string;
}

export interface Transaction {
  transaction_id: string;
  date: string;
  vendor_id: string;
  opening_stock: number;
  stock_sold: number;
  stock_added: number;
  cash_collected: number;
  closing_stock: number;
  sales_rep: string;
  actor: string;
  notes: string;
  is_reversed?: boolean;
  reversed_at?: string;
  reversed_by?: string;
  reversal_reason?: string;
  reversal_operation_id?: string;
}

export interface AdminStockMovement {
  admin_stock_movement_id: string;
  operation_id: string;
  movement_type: 'transfer' | 'retrieval';
  product_id: string;
  source_vendor_id?: string | null;
  destination_vendor_id?: string | null;
  quantity: number;
  admin_id: string;
  timestamp: string;
  notes?: string | null;
  created_at: string;
}

export interface AdminActivityRecord {
  operation_id: string;
  action_type: 'transfer' | 'retrieval' | 'reversal';
  product_id: string;
  product_name: string;
  quantity: number;
  admin_id: string;
  admin_name: string;
  source_vendor_id?: string | null;
  source_vendor_name?: string | null;
  destination_vendor_id?: string | null;
  destination_vendor_name?: string | null;
  vendor_id?: string | null;
  vendor_name?: string | null;
  notes?: string | null;
  timestamp: string;
  created_at: string;
  reversal_visit_id?: string | null;
  original_visit_timestamp?: string | null;
  original_visit_date?: string | null;
  original_sales_rep_id?: string | null;
  original_sales_rep_name?: string | null;
  original_actor?: string | null;
  reversal_reason?: string | null;
  status?: string | null;
}

export interface ReverseVisitResult {
  visitLog: Record<string, unknown>;
  inventory: Inventory;
  vendorInventory: VendorInventory;
  vendorBalance: VendorBalance;
}

export interface DashboardFilters {
  startDate: string;
  endDate: string;
  salesRepId: string;
  vendorId: string;
  productId: string;
  market: string;
}

export interface DashboardStats {
  vendorsVisited: number;
  bucketsSold: number;
  cashCollected: number;
  lowStockVendors: number;
  outstandingBalances: number;
  totalAmountOwed: number;
  totalVendorReceivables: number;
  vendorCredits: number;
  averageSalesPerVendor: number;
  totalActiveVendors: number;
  newVendorsInRange: number;
  totalBucketsOutThere: number;
  totalBucketsOutThereByProduct?: Array<{ productName: string; quantity: number }>;
  salesBySalesRep?: Array<{ sales_rep_id: string; cash_collected: number; stock_sold: number }>;
  collectionsBySalesRep?: Array<{ sales_rep_id: string; cash_collected: number }>;
  top10VendorsBySales?: Array<{ vendor_id: string; cash_collected: number }>;
}

export const DEFAULT_DASHBOARD_STATS: DashboardStats = {
  vendorsVisited: 0,
  bucketsSold: 0,
  cashCollected: 0,
  lowStockVendors: 0,
  outstandingBalances: 0,
  totalAmountOwed: 0,
  totalVendorReceivables: 0,
  vendorCredits: 0,
  averageSalesPerVendor: 0,
  totalActiveVendors: 0,
  newVendorsInRange: 0,
  totalBucketsOutThere: 0,
};

export function normalizeDashboardStats(stats?: Partial<DashboardStats>): DashboardStats {
  return {
    ...DEFAULT_DASHBOARD_STATS,
    ...(stats || {}),
  };
}
