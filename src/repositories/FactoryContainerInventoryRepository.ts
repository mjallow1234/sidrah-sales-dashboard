import type { FactoryContainerInventory, FactoryContainerType } from '@/lib/types';
import type { RepositoryDbClient } from './types';
import { BaseRepository } from './BaseRepository';

function mapInventory(row: any): FactoryContainerInventory {
  return {
    container_type: row.container_type as FactoryContainerType,
    current_quantity: Number(row.current_quantity ?? 0),
    created_at: row.created_at instanceof Date ? row.created_at.toISOString() : String(row.created_at ?? ''),
    updated_at: row.updated_at instanceof Date ? row.updated_at.toISOString() : String(row.updated_at ?? ''),
  };
}

export class FactoryContainerInventoryRepository extends BaseRepository {
  async findAll(): Promise<FactoryContainerInventory[]> {
    const [rows] = await this.execute<any[]>(
      `SELECT types.container_type, COALESCE(i.current_quantity, 0) AS current_quantity,
              i.created_at, i.updated_at
       FROM (SELECT 'gallon' AS container_type UNION ALL SELECT 'bucket_5l' UNION ALL SELECT 'bucket_1kg') types
       LEFT JOIN factory_container_inventory i ON i.container_type = types.container_type
       ORDER BY FIELD(types.container_type, 'gallon', 'bucket_5l', 'bucket_1kg')`,
    );
    return rows.map(mapInventory);
  }

  async findByType(containerType: FactoryContainerType, forUpdate = false): Promise<FactoryContainerInventory | null> {
    const [rows] = await this.execute<any[]>(
      `SELECT container_type, current_quantity, created_at, updated_at
       FROM factory_container_inventory WHERE container_type = ? LIMIT 1${forUpdate ? ' FOR UPDATE' : ''}`,
      [containerType],
    );
    return rows.length > 0 ? mapInventory(rows[0]) : null;
  }

  async create(containerType: FactoryContainerType, quantity: number, now: string): Promise<FactoryContainerInventory> {
    await this.execute(
      `INSERT INTO factory_container_inventory (container_type, current_quantity, created_at, updated_at)
       VALUES (?, ?, ?, ?)`, [containerType, quantity, now, now],
    );
    return (await this.findByType(containerType, true)) as FactoryContainerInventory;
  }

  async updateQuantity(containerType: FactoryContainerType, quantity: number, now: string): Promise<FactoryContainerInventory> {
    await this.execute('UPDATE factory_container_inventory SET current_quantity = ?, updated_at = ? WHERE container_type = ?', [quantity, now, containerType]);
    return (await this.findByType(containerType, true)) as FactoryContainerInventory;
  }
}
