import { randomUUID } from 'crypto';
import type { RepositoryDbClient } from './types';
import { BaseRepository } from './BaseRepository';
import type { OutletStockBalance, OutletStockReceipt } from '@/lib/types/outlet-stock';

const dateValue = (value: unknown) => value instanceof Date ? value.toISOString().slice(0, 10) : String(value ?? '').slice(0, 10);
const dateTimeValue = (value: unknown) => value instanceof Date ? value.toISOString() : String(value ?? '');

export class OutletStockRepository extends BaseRepository {
  constructor(db: RepositoryDbClient) { super(db); }

  async create(input: { outlet_id: string; product_id: string; quantity_received: number; received_date: string; notes: string | null; created_by: string; created_at: string }): Promise<OutletStockReceipt> {
    const receiptId = `OSR_${randomUUID().replace(/-/g, '').slice(0, 20)}`;
    await this.execute('INSERT INTO outlet_stock_receipts (receipt_id,outlet_id,product_id,quantity_received,received_date,notes,created_by,created_at) VALUES (:receipt_id,:outlet_id,:product_id,:quantity_received,:received_date,:notes,:created_by,:created_at)', { receipt_id: receiptId, ...input });
    return (await this.receipts(input.outlet_id, receiptId))[0];
  }

  async receipts(outletId: string, receiptId?: string): Promise<OutletStockReceipt[]> {
    const params: Record<string, unknown> = { outlet_id: outletId }; const conditions = ['r.outlet_id = :outlet_id'];
    if (receiptId) { conditions.push('r.receipt_id = :receipt_id'); params.receipt_id = receiptId; }
    const rows = await this.executeMany<any>(`SELECT r.*, p.product_name, p.unit AS product_unit, u.name AS created_by_name FROM outlet_stock_receipts r JOIN products p ON p.product_id = r.product_id JOIN app_users u ON u.user_id = r.created_by WHERE ${conditions.join(' AND ')} ORDER BY r.received_date DESC, r.created_at DESC, r.receipt_id DESC`, params);
    return rows.map((row) => ({ receipt_id: String(row.receipt_id), outlet_id: String(row.outlet_id), product_id: String(row.product_id), product_name: String(row.product_name), product_unit: String(row.product_unit), quantity_received: Number(row.quantity_received), received_date: dateValue(row.received_date), notes: row.notes == null ? null : String(row.notes), created_by: String(row.created_by), created_by_name: row.created_by_name == null ? null : String(row.created_by_name), created_at: dateTimeValue(row.created_at) }));
  }

  async balances(outletId: string): Promise<OutletStockBalance[]> {
    const rows = await this.executeMany<any>(`SELECT p.product_id, p.product_name, p.unit AS product_unit, COALESCE(r.total_received, 0) AS total_received, COALESCE(s.total_sold, 0) AS total_sold, COALESCE(r.total_received, 0) - COALESCE(s.total_sold, 0) AS current_stock FROM products p LEFT JOIN (SELECT product_id, SUM(quantity_received) AS total_received FROM outlet_stock_receipts WHERE outlet_id = :outlet_id GROUP BY product_id) r ON r.product_id = p.product_id LEFT JOIN (SELECT i.product_id, SUM(i.quantity) AS total_sold FROM outlet_sales os JOIN outlet_sale_items i ON i.sale_id = os.sale_id WHERE os.outlet_id = :outlet_id GROUP BY i.product_id) s ON s.product_id = p.product_id WHERE r.product_id IS NOT NULL OR s.product_id IS NOT NULL ORDER BY p.product_name ASC`, { outlet_id: outletId });
    return rows.map((row) => ({ product_id: String(row.product_id), product_name: String(row.product_name), product_unit: String(row.product_unit), total_received: Number(row.total_received), total_sold: Number(row.total_sold), current_stock: Number(row.current_stock) }));
  }
}
