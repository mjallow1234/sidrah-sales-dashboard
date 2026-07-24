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

export interface AppUser {
  user_id: string;
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
  notes: string;
}

export interface DashboardStats {
  vendorsVisitedToday: number;
  bucketsSoldToday: number;
  cashCollectedToday: number;
  lowStockVendors: number;
  outstandingBalances: number;
}
