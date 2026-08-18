import type { VendorInventory } from '@/lib/types';
import type { RepositoryDbClient } from './types';
import { BaseRepository } from './BaseRepository';
import { NotFoundError } from './errors';

export interface CreateVendorInventoryPayload {
  vendor_inventory_id: string;
  vendor_id: string;
  product_id: string;
  current_stock: number;
  total_stock_received: number;
  total_stock_sold: number;
  created_at?: string;
  updated_at?: string;
  created_by?: string;
  updated_by?: string;
}

export interface UpdateVendorInventoryPayload {
  current_stock?: number;
  total_stock_received?: number;
  total_stock_sold?: number;
  updated_by?: string;
}

export interface VendorInventorySearchCriteria {
  vendor_inventory_id?: string;
  vendor_id?: string;
  product_id?: string;
}

export class VendorInventoryRepository extends BaseRepository {
  constructor(db: RepositoryDbClient) {
    super(db);
  }

  public async findById(vendorInventoryId: string): Promise<VendorInventory> {
    const [rows] = await this.execute<VendorInventory[]>(
      'SELECT * FROM vendor_inventory WHERE vendor_inventory_id = ? LIMIT 1',
      [vendorInventoryId]
    );
    if (rows.length === 0) {
      throw new NotFoundError('VendorInventory', vendorInventoryId);
    }
    return rows[0];
  }

  public async findAll(): Promise<VendorInventory[]> {
    const [rows] = await this.execute<VendorInventory[]>('SELECT * FROM vendor_inventory', []);
    return rows;
  }

  public async search(criteria: VendorInventorySearchCriteria): Promise<VendorInventory[]> {
    const clauses: string[] = [];
    const params: unknown[] = [];

    if (criteria.vendor_inventory_id) {
      clauses.push('vendor_inventory_id = ?');
      params.push(criteria.vendor_inventory_id);
    }
    if (criteria.vendor_id) {
      clauses.push('vendor_id = ?');
      params.push(criteria.vendor_id);
    }
    if (criteria.product_id) {
      clauses.push('product_id = ?');
      params.push(criteria.product_id);
    }

    const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
    const [rows] = await this.execute<VendorInventory[]>(`SELECT * FROM vendor_inventory ${where}`, params);
    return rows;
  }

  public async create(payload: CreateVendorInventoryPayload): Promise<VendorInventory> {
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
    await this.execute(
      `INSERT INTO vendor_inventory (
        vendor_inventory_id,
        vendor_id,
        product_id,
        current_stock,
        total_stock_received,
        total_stock_sold,
        created_at,
        updated_at,
        created_by,
        updated_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        payload.vendor_inventory_id,
        payload.vendor_id,
        payload.product_id,
        payload.current_stock,
        payload.total_stock_received,
        payload.total_stock_sold,
        payload.created_at ?? now,
        payload.updated_at ?? now,
        payload.created_by ?? null,
        payload.updated_by ?? null,
      ]
    );

    return this.findById(payload.vendor_inventory_id);
  }

  public async update(vendorInventoryId: string, updates: UpdateVendorInventoryPayload): Promise<VendorInventory> {
    const parts: string[] = [];
    const params: unknown[] = [];

    if (updates.current_stock !== undefined) {
      parts.push('current_stock = ?');
      params.push(updates.current_stock);
    }
    if (updates.total_stock_received !== undefined) {
      parts.push('total_stock_received = ?');
      params.push(updates.total_stock_received);
    }
    if (updates.total_stock_sold !== undefined) {
      parts.push('total_stock_sold = ?');
      params.push(updates.total_stock_sold);
    }
    if (updates.updated_by !== undefined) {
      parts.push('updated_by = ?');
      params.push(updates.updated_by);
    }

    parts.push('updated_at = ?');
    params.push(new Date().toISOString().slice(0, 19).replace('T', ' '));

    const sql = `UPDATE vendor_inventory SET ${parts.join(', ')} WHERE vendor_inventory_id = ?`;
    await this.execute(sql, [...params, vendorInventoryId]);
    return this.findById(vendorInventoryId);
  }

  public async delete(vendorInventoryId: string): Promise<void> {
    await this.execute('DELETE FROM vendor_inventory WHERE vendor_inventory_id = ?', [vendorInventoryId]);
  }

  public async exists(vendorInventoryId: string): Promise<boolean> {
    const [rows] = await this.execute<Array<{ exists: number }>>(
      'SELECT COUNT(1) AS exists FROM vendor_inventory WHERE vendor_inventory_id = ?',
      [vendorInventoryId]
    );
    return rows.length > 0 && Number(rows[0].exists) > 0;
  }
}
