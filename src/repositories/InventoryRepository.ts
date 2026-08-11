import type { Inventory } from '@/lib/types';
import type { RepositoryDbClient } from './types';
import { BaseRepository } from './BaseRepository';
import { NotFoundError } from './errors';

export interface CreateInventoryPayload {
  inventory_id: string;
  vendor_id: string;
  product_id: string;
  total_stock_supplied: number;
  total_stock_sold: number;
  current_stock: number;
  date_created?: string;
  last_updated?: string;
  created_by?: string;
  updated_by?: string;
}

export interface UpdateInventoryPayload {
  total_stock_supplied?: number;
  total_stock_sold?: number;
  current_stock?: number;
  updated_by?: string;
}

export interface InventorySearchCriteria {
  inventory_id?: string;
  vendor_id?: string;
  product_id?: string;
}

export class InventoryRepository extends BaseRepository {
  constructor(db: RepositoryDbClient) {
    super(db);
  }

  public async findById(inventoryId: string): Promise<Inventory> {
    const [rows] = await this.execute<Inventory[]>(
      'SELECT * FROM inventory WHERE inventory_id = ? LIMIT 1',
      [inventoryId]
    );
    if (rows.length === 0) {
      throw new NotFoundError('Inventory', inventoryId);
    }
    return rows[0];
  }

  public async findAll(): Promise<Inventory[]> {
    const [rows] = await this.execute<Inventory[]>('SELECT * FROM inventory', []);
    return rows;
  }

  public async search(criteria: InventorySearchCriteria): Promise<Inventory[]> {
    const clauses: string[] = [];
    const params: unknown[] = [];

    if (criteria.inventory_id) {
      clauses.push('inventory_id = ?');
      params.push(criteria.inventory_id);
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
    const [rows] = await this.execute<Inventory[]>(`SELECT * FROM inventory ${where}`, params);
    return rows;
  }

  public async create(payload: CreateInventoryPayload): Promise<Inventory> {
    const now = new Date().toISOString();
    await this.execute(
      `INSERT INTO inventory (
        inventory_id,
        vendor_id,
        product_id,
        total_stock_supplied,
        total_stock_sold,
        current_stock,
        date_created,
        last_updated,
        created_by,
        updated_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        payload.inventory_id,
        payload.vendor_id,
        payload.product_id,
        payload.total_stock_supplied,
        payload.total_stock_sold,
        payload.current_stock,
        payload.date_created ?? now,
        payload.last_updated ?? now,
        payload.created_by ?? null,
        payload.updated_by ?? null,
      ]
    );

    return this.findById(payload.inventory_id);
  }

  public async update(inventoryId: string, updates: UpdateInventoryPayload): Promise<Inventory> {
    const parts: string[] = [];
    const params: unknown[] = [];

    if (updates.total_stock_supplied !== undefined) {
      parts.push('total_stock_supplied = ?');
      params.push(updates.total_stock_supplied);
    }
    if (updates.total_stock_sold !== undefined) {
      parts.push('total_stock_sold = ?');
      params.push(updates.total_stock_sold);
    }
    if (updates.current_stock !== undefined) {
      parts.push('current_stock = ?');
      params.push(updates.current_stock);
    }
    if (updates.updated_by !== undefined) {
      parts.push('updated_by = ?');
      params.push(updates.updated_by);
    }

    parts.push('last_updated = ?');
    params.push(new Date().toISOString());

    const sql = `UPDATE inventory SET ${parts.join(', ')} WHERE inventory_id = ?`;
    await this.execute(sql, [...params, inventoryId]);
    return this.findById(inventoryId);
  }

  public async delete(inventoryId: string): Promise<void> {
    await this.execute('DELETE FROM inventory WHERE inventory_id = ?', [inventoryId]);
  }

  public async exists(inventoryId: string): Promise<boolean> {
    const [rows] = await this.execute<Array<{ exists: number }>>(
      'SELECT COUNT(1) AS exists FROM inventory WHERE inventory_id = ?',
      [inventoryId]
    );
    return rows.length > 0 && Number(rows[0].exists) > 0;
  }
}
