import type { RepositoryDbClient } from './types';
import { BaseRepository } from './BaseRepository';
import { NotFoundError } from './errors';

export interface AdminStockMovementRecord {
  admin_stock_movement_id: string;
  operation_id: string;
  movement_type: 'transfer' | 'retrieval';
  product_id: string;
  source_vendor_id?: string | null;
  destination_vendor_id?: string | null;
  quantity: number;
  admin_id: string;
  timestamp: string;
  notes?: string | null;
  created_at: string;
}

export interface CreateAdminStockMovementPayload extends Omit<AdminStockMovementRecord, 'created_at'> {} 

export class AdminStockMovementRepository extends BaseRepository {
  constructor(db: RepositoryDbClient) {
    super(db);
  }

  public async findByOperationId(operationId: string): Promise<AdminStockMovementRecord | null> {
    const [rows] = await this.execute<AdminStockMovementRecord[]>(
      'SELECT * FROM admin_stock_movements WHERE operation_id = ? LIMIT 1',
      [operationId]
    );
    return rows[0] ?? null;
  }

  public async create(payload: CreateAdminStockMovementPayload): Promise<AdminStockMovementRecord> {
    await this.execute(
      `INSERT INTO admin_stock_movements (
        admin_stock_movement_id,
        operation_id,
        movement_type,
        product_id,
        source_vendor_id,
        destination_vendor_id,
        quantity,
        admin_id,
        timestamp,
        notes,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        payload.admin_stock_movement_id,
        payload.operation_id,
        payload.movement_type,
        payload.product_id,
        payload.source_vendor_id ?? null,
        payload.destination_vendor_id ?? null,
        payload.quantity,
        payload.admin_id,
        payload.timestamp,
        payload.notes ?? null,
        new Date().toISOString().slice(0, 19).replace('T', ' '),
      ]
    );

    return this.findByOperationId(payload.operation_id) as Promise<AdminStockMovementRecord>;
  }
}
