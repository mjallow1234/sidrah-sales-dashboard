import { randomUUID } from 'crypto';
import type { RepositoryDbClient } from './types';
import { BaseRepository } from './BaseRepository';
import type { Outlet, OutletSale, OutletSummary } from '@/lib/types/outlets';

const dateValue = (value: unknown) => value instanceof Date ? value.toISOString().slice(0, 10) : String(value ?? '').slice(0, 10);
const dateTimeValue = (value: unknown) => value instanceof Date ? value.toISOString() : String(value ?? '');
const nullable = (value: unknown) => value == null ? null : String(value);

export class OutletRepository extends BaseRepository {
  constructor(db: RepositoryDbClient) { super(db); }

  async list(): Promise<Outlet[]> {
    const rows = await this.executeMany<any>(`SELECT o.*, COALESCE(SUM(i.line_total), 0) AS total_sales
      FROM outlets o LEFT JOIN outlet_sales s ON s.outlet_id = o.outlet_id LEFT JOIN outlet_sale_items i ON i.sale_id = s.sale_id
      GROUP BY o.outlet_id ORDER BY o.active DESC, o.name ASC`);
    return rows.map((row) => this.mapOutlet(row));
  }

  async findById(outletId: string): Promise<Outlet | null> {
    const rows = await this.executeMany<any>('SELECT o.*, COALESCE(SUM(i.line_total), 0) AS total_sales FROM outlets o LEFT JOIN outlet_sales s ON s.outlet_id = o.outlet_id LEFT JOIN outlet_sale_items i ON i.sale_id = s.sale_id WHERE o.outlet_id = :outlet_id GROUP BY o.outlet_id', { outlet_id: outletId });
    return rows.length ? this.mapOutlet(rows[0]) : null;
  }

  async create(input: { outlet_id: string; name: string; location: string | null; responsible_person: string | null; phone: string | null; description: string | null; active: boolean; created_by: string; updated_by: string; created_at: string; updated_at: string }): Promise<Outlet> {
    await this.execute(`INSERT INTO outlets (outlet_id,name,location,responsible_person,phone,description,active,created_by,updated_by,created_at,updated_at) VALUES (:outlet_id,:name,:location,:responsible_person,:phone,:description,:active,:created_by,:updated_by,:created_at,:updated_at)`, input);
    return (await this.findById(input.outlet_id)) as Outlet;
  }

  async update(outletId: string, input: Record<string, unknown>): Promise<Outlet | null> {
    const allowed = ['name', 'location', 'responsible_person', 'phone', 'description', 'active', 'updated_by', 'updated_at'];
    const fields = Object.keys(input).filter((key) => allowed.includes(key));
    if (fields.length) await this.execute(`UPDATE outlets SET ${fields.map((field) => `${field} = :${field}`).join(', ')} WHERE outlet_id = :outlet_id`, { outlet_id: outletId, ...input });
    return this.findById(outletId);
  }

  async createSale(input: { sale_id: string; sale_item_id: string; outlet_id: string; product_id: string; quantity: number; selling_price: number; line_total: number; sale_date: string; payment_method: string; notes: string | null; recorded_by: string; created_at: string }): Promise<OutletSale> {
    await this.execute('INSERT INTO outlet_sales (sale_id,outlet_id,sale_date,payment_method,notes,recorded_by,created_at) VALUES (:sale_id,:outlet_id,:sale_date,:payment_method,:notes,:recorded_by,:created_at)', input);
    await this.execute('INSERT INTO outlet_sale_items (sale_item_id,sale_id,product_id,quantity,selling_price,line_total) VALUES (:sale_item_id,:sale_id,:product_id,:quantity,:selling_price,:line_total)', input);
    return (await this.sales(input.outlet_id, { saleId: input.sale_id }))[0];
  }

  async sales(outletId: string, filters: { from?: string; to?: string; saleId?: string } = {}): Promise<OutletSale[]> {
    const conditions = ['s.outlet_id = :outlet_id'];
    const params: Record<string, unknown> = { outlet_id: outletId };
    if (filters.from) { conditions.push('s.sale_date >= :from'); params.from = filters.from; }
    if (filters.to) { conditions.push('s.sale_date <= :to'); params.to = filters.to; }
    if (filters.saleId) { conditions.push('s.sale_id = :sale_id'); params.sale_id = filters.saleId; }
    const rows = await this.executeMany<any>(`SELECT s.*, i.product_id, i.quantity, i.selling_price, i.line_total, p.product_name, p.unit AS product_unit, u.name AS recorded_by_name FROM outlet_sales s JOIN outlet_sale_items i ON i.sale_id = s.sale_id JOIN products p ON p.product_id = i.product_id JOIN app_users u ON u.user_id = s.recorded_by WHERE ${conditions.join(' AND ')} ORDER BY s.sale_date DESC, s.created_at DESC, s.sale_id DESC`, params);
    return rows.map((row) => ({ sale_id: String(row.sale_id), outlet_id: String(row.outlet_id), sale_date: dateValue(row.sale_date), payment_method: String(row.payment_method), notes: nullable(row.notes), recorded_by: String(row.recorded_by), recorded_by_name: nullable(row.recorded_by_name), created_at: dateTimeValue(row.created_at), product_id: String(row.product_id), product_name: String(row.product_name), product_unit: String(row.product_unit), quantity: Number(row.quantity), selling_price: Number(row.selling_price), line_total: Number(row.line_total) }));
  }

  async summary(outletId: string, today: string, monthStart: string): Promise<OutletSummary> {
    const rows = await this.executeMany<any>(`SELECT COALESCE(SUM(CASE WHEN s.sale_date = :today THEN i.line_total ELSE 0 END),0) AS today_sales, COALESCE(SUM(CASE WHEN s.sale_date = :today THEN i.quantity ELSE 0 END),0) AS today_quantity, COALESCE(SUM(CASE WHEN s.sale_date >= :month_start THEN i.line_total ELSE 0 END),0) AS month_sales, COUNT(DISTINCT CASE WHEN s.sale_date = :today THEN s.sale_id END) AS transaction_count FROM outlet_sales s JOIN outlet_sale_items i ON i.sale_id = s.sale_id WHERE s.outlet_id = :outlet_id`, { outlet_id: outletId, today, month_start: monthStart });
    const row = rows[0] ?? {};
    return { today_sales: Number(row.today_sales ?? 0), today_quantity: Number(row.today_quantity ?? 0), month_sales: Number(row.month_sales ?? 0), transaction_count: Number(row.transaction_count ?? 0) };
  }

  private mapOutlet(row: any): Outlet { return { outlet_id: String(row.outlet_id), name: String(row.name), location: nullable(row.location), responsible_person: nullable(row.responsible_person), phone: nullable(row.phone), description: nullable(row.description), active: Boolean(row.active === 1 || row.active === true), created_by: String(row.created_by), updated_by: String(row.updated_by), created_at: dateTimeValue(row.created_at), updated_at: dateTimeValue(row.updated_at), total_sales: Number(row.total_sales ?? 0) }; }
}
