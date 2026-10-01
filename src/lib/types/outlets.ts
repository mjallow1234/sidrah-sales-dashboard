export interface Outlet {
  outlet_id: string;
  name: string;
  location: string | null;
  responsible_person: string | null;
  phone: string | null;
  description: string | null;
  active: boolean;
  created_by: string;
  updated_by: string;
  created_at: string;
  updated_at: string;
  total_sales?: number;
}

export interface OutletSale {
  sale_id: string;
  outlet_id: string;
  sale_date: string;
  payment_method: string;
  notes: string | null;
  recorded_by: string;
  recorded_by_name: string | null;
  created_at: string;
  product_id: string;
  product_name: string;
  product_unit: string;
  quantity: number;
  selling_price: number;
  line_total: number;
}

export interface OutletSummary {
  today_sales: number;
  today_quantity: number;
  month_sales: number;
  transaction_count: number;
}
