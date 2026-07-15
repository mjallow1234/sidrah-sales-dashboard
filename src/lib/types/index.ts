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
  date_created: string;
  status: 'active' | 'inactive';
}

export interface Inventory {
  vendor_id: string;
  total_stock_supplied: number;
  total_stock_sold: number;
  current_stock: number;
  expected_cash: number;
  cash_collected: number;
  balance_owed: number;
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
