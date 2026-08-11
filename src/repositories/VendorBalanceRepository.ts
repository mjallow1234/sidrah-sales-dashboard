import type { VendorBalance } from '@/lib/types';
import type { RepositoryDbClient } from './types';
import { BaseRepository } from './BaseRepository';
import { NotFoundError } from './errors';

export interface CreateVendorBalancePayload {
  vendor_id: string;
  total_expected_cash: number;
  cash_collected: number;
  balance_owed: number;
  date_created?: string;
  last_updated?: string;
  created_by?: string;
  updated_by?: string;
}

export interface UpdateVendorBalancePayload {
  total_expected_cash?: number;
  cash_collected?: number;
  balance_owed?: number;
  updated_by?: string;
}

export interface VendorBalanceSearchCriteria {
  vendor_id?: string;
}

export class VendorBalanceRepository extends BaseRepository {
  constructor(db: RepositoryDbClient) {
    super(db);
  }

  public async findById(vendorId: string): Promise<VendorBalance> {
    const [rows] = await this.execute<VendorBalance[]>(
      'SELECT * FROM vendor_balances WHERE vendor_id = ? LIMIT 1',
      [vendorId]
    );
    if (rows.length === 0) {
      throw new NotFoundError('VendorBalance', vendorId);
    }
    return rows[0];
  }

  public async findAll(): Promise<VendorBalance[]> {
    const [rows] = await this.execute<VendorBalance[]>('SELECT * FROM vendor_balances', []);
    return rows;
  }

  public async search(criteria: VendorBalanceSearchCriteria): Promise<VendorBalance[]> {
    const clauses: string[] = [];
    const params: unknown[] = [];

    if (criteria.vendor_id) {
      clauses.push('vendor_id = ?');
      params.push(criteria.vendor_id);
    }

    const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
    const [rows] = await this.execute<VendorBalance[]>(`SELECT * FROM vendor_balances ${where}`, params);
    return rows;
  }

  public async create(payload: CreateVendorBalancePayload): Promise<VendorBalance> {
    const now = new Date().toISOString();
    await this.execute(
      `INSERT INTO vendor_balances (
        vendor_id,
        total_expected_cash,
        cash_collected,
        balance_owed,
        date_created,
        last_updated,
        created_by,
        updated_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        payload.vendor_id,
        payload.total_expected_cash,
        payload.cash_collected,
        payload.balance_owed,
        payload.date_created ?? now,
        payload.last_updated ?? now,
        payload.created_by ?? null,
        payload.updated_by ?? null,
      ]
    );

    return this.findById(payload.vendor_id);
  }

  public async update(vendorId: string, updates: UpdateVendorBalancePayload): Promise<VendorBalance> {
    const parts: string[] = [];
    const params: unknown[] = [];

    if (updates.total_expected_cash !== undefined) {
      parts.push('total_expected_cash = ?');
      params.push(updates.total_expected_cash);
    }
    if (updates.cash_collected !== undefined) {
      parts.push('cash_collected = ?');
      params.push(updates.cash_collected);
    }
    if (updates.balance_owed !== undefined) {
      parts.push('balance_owed = ?');
      params.push(updates.balance_owed);
    }
    if (updates.updated_by !== undefined) {
      parts.push('updated_by = ?');
      params.push(updates.updated_by);
    }

    parts.push('last_updated = ?');
    params.push(new Date().toISOString());

    const sql = `UPDATE vendor_balances SET ${parts.join(', ')} WHERE vendor_id = ?`;
    await this.execute(sql, [...params, vendorId]);
    return this.findById(vendorId);
  }

  public async delete(vendorId: string): Promise<void> {
    await this.execute('DELETE FROM vendor_balances WHERE vendor_id = ?', [vendorId]);
  }

  public async exists(vendorId: string): Promise<boolean> {
    const [rows] = await this.execute<Array<{ exists: number }>>(
      'SELECT COUNT(1) AS exists FROM vendor_balances WHERE vendor_id = ?',
      [vendorId]
    );
    return rows.length > 0 && Number(rows[0].exists) > 0;
  }
}
