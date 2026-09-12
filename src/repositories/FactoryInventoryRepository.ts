import type { FactoryInventory } from '@/lib/types';
import type { RepositoryDbClient } from './types';
import { BaseRepository } from './BaseRepository';

function mapInventory(row: any): FactoryInventory {
  return {
    factory_inventory_id: row.factory_inventory_id === null || row.factory_inventory_id === undefined ? '' : String(row.factory_inventory_id),
    product_id: String(row.product_id),
    product_name: row.product_name === null || row.product_name === undefined ? undefined : String(row.product_name),
    unit: row.unit === null || row.unit === undefined ? undefined : String(row.unit),
    current_quantity: Number(row.current_quantity),
    created_at: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at ?? ''),
    updated_at: row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at ?? ''),
  };
}

export class FactoryInventoryRepository extends BaseRepository {
  constructor(db: RepositoryDbClient) {
    super(db);
  }

  async findAll(): Promise<FactoryInventory[]> {
    const [rows] = await this.execute<any[]>(
      `SELECT fi.factory_inventory_id, p.product_id, p.product_name, p.unit,
              COALESCE(fi.current_quantity, 0) AS current_quantity,
              fi.created_at, fi.updated_at
       FROM products p
       LEFT JOIN factory_inventory fi ON fi.product_id = p.product_id
       WHERE p.active = TRUE
       ORDER BY p.product_name ASC`,
    );
    return rows.map(mapInventory);
  }

  async findByProduct(productId: string, forUpdate = false): Promise<FactoryInventory | null> {
    const [rows] = await this.execute<any[]>(
      `SELECT fi.*, p.product_name, p.unit
       FROM factory_inventory fi
       INNER JOIN products p ON p.product_id = fi.product_id
       WHERE fi.product_id = ? LIMIT 1${forUpdate ? ' FOR UPDATE' : ''}`,
      [productId],
    );
    return rows.length > 0 ? mapInventory(rows[0]) : null;
  }

  async create(productId: string, quantity: number, now: string, inventoryId: string): Promise<FactoryInventory> {
    await this.execute(
      `INSERT INTO factory_inventory (factory_inventory_id, product_id, current_quantity, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?)`,
      [inventoryId, productId, quantity, now, now],
    );
    return (await this.findByProduct(productId, true)) as FactoryInventory;
  }

  async updateQuantity(productId: string, quantity: number, now: string): Promise<FactoryInventory> {
    await this.execute(
      'UPDATE factory_inventory SET current_quantity = ?, updated_at = ? WHERE product_id = ?',
      [quantity, now, productId],
    );
    return (await this.findByProduct(productId, true)) as FactoryInventory;
  }
}
