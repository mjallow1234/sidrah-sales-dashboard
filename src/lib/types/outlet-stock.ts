export interface OutletStockReceipt {
  receipt_id: string;
  outlet_id: string;
  product_id: string;
  product_name: string;
  product_unit: string;
  quantity_received: number;
  received_date: string;
  notes: string | null;
  created_by: string;
  created_by_name: string | null;
  created_at: string;
}

export interface OutletStockBalance {
  product_id: string;
  product_name: string;
  product_unit: string;
  total_received: number;
  total_sold: number;
  current_stock: number;
}
