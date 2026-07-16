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
  sales_rep: string;
  sales_rep_id?: string;
  date_created: string;
  status: 'active' | 'inactive';
}

export interface Product {
  product_id: string;
  product_name: string;
  category: string;
  unit: string;
  default_unit_price: number;
  currency: string;
  active: boolean;
  date_created: string;
  last_updated: string;
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

export interface VendorBalance {
  vendor_id: string;
  total_expected_cash: number;
  cash_collected: number;
  balance_owed: number;
  date_created: string;
  last_updated: string;
}

export interface VisitResult {
  visitLog: Record<string, unknown>;
  inventory: Inventory;
  vendorBalance: VendorBalance;
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
  notes: string;
}

export interface DashboardStats {
  vendorsVisitedToday: number;
  bucketsSoldToday: number;
  cashCollectedToday: number;
  lowStockVendors: number;
  outstandingBalances: number;
}
