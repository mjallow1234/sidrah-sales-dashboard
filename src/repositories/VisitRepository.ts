import type { RepositoryDbClient } from './types';
import { BaseRepository } from './BaseRepository';
import { NotFoundError } from './errors';

export interface VisitLogRecord {
  visit_id: string;
  timestamp: string;
  date: string;
  vendor_id: string;
  product_id: string;
  sales_rep_id: string | null;
  opening_stock: number;
  stock_sold: number;
  stock_added: number;
  cash_collected: number;
  expected_cash: number;
  unit_price: number;
  closing_stock: number;
  payment_method: string;
  payment_reference?: string;
  client_transaction_id?: string;
  latitude?: number | null;
  longitude?: number | null;
  notes?: string;
  is_reversed?: boolean;
  reversed_at?: string | null;
  reversed_by?: string | null;
  reversal_reason?: string | null;
  reversal_operation_id?: string | null;
  date_created: string;
  last_updated: string;
  created_by?: string | null;
  updated_by?: string | null;
}

export interface CreateVisitPayload {
  visit_id: string;
  timestamp: string;
  date: string;
  vendor_id: string;
  product_id: string;
  sales_rep_id: string | null;
  opening_stock: number;
  stock_sold: number;
  stock_added: number;
  cash_collected: number;
  expected_cash: number;
  unit_price: number;
  closing_stock: number;
  payment_method: string;
  payment_reference?: string;
  client_transaction_id?: string;
  latitude?: number | null;
  longitude?: number | null;
  notes?: string;
  date_created: string;
  last_updated: string;
  created_by?: string;
  updated_by?: string;
}

export interface UpdateVisitPayload {
  stock_sold?: number;
  stock_added?: number;
  cash_collected?: number;
  expected_cash?: number;
  unit_price?: number;
  closing_stock?: number;
  payment_method?: string;
  payment_reference?: string;
  client_transaction_id?: string;
  latitude?: number | null;
  longitude?: number | null;
  notes?: string;
  updated_by?: string;
}

export interface VisitSearchCriteria {
  visit_id?: string;
  vendor_id?: string;
  sales_rep_id?: string;
  product_id?: string;
  date?: string;
  client_transaction_id?: string;
}

export class VisitRepository extends BaseRepository {
  constructor(db: RepositoryDbClient) {
    super(db);
  }

  public async findById(visitId: string): Promise<VisitLogRecord> {
    const [rows] = await this.execute<VisitLogRecord[]>(
      'SELECT * FROM visit_logs WHERE visit_id = ? LIMIT 1',
      [visitId]
    );
    if (rows.length === 0) {
      throw new NotFoundError('Visit', visitId);
    }
    return rows[0];
  }

  public async findAll(): Promise<VisitLogRecord[]> {
    const [rows] = await this.execute<VisitLogRecord[]>('SELECT * FROM visit_logs', []);
    return rows;
  }

  public async search(criteria: VisitSearchCriteria): Promise<VisitLogRecord[]> {
    const clauses: string[] = [];
    const params: unknown[] = [];

    if (criteria.visit_id) {
      clauses.push('visit_id = ?');
      params.push(criteria.visit_id);
    }
    if (criteria.vendor_id) {
      clauses.push('vendor_id = ?');
      params.push(criteria.vendor_id);
    }
    if (criteria.product_id) {
      clauses.push('product_id = ?');
      params.push(criteria.product_id);
    }
    if (criteria.sales_rep_id) {
      clauses.push('sales_rep_id = ?');
      params.push(criteria.sales_rep_id);
    }
    if (criteria.date) {
      clauses.push('date = ?');
      params.push(criteria.date);
    }
    if (criteria.client_transaction_id) {
      clauses.push('client_transaction_id = ?');
      params.push(criteria.client_transaction_id);
    }

    const where = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
    const [rows] = await this.execute<VisitLogRecord[]>(`SELECT * FROM visit_logs ${where}`, params);
    return rows;
  }

  public async create(payload: CreateVisitPayload): Promise<VisitLogRecord> {
    await this.execute(
      `INSERT INTO visit_logs (
        visit_id,
        timestamp,
        date,
        vendor_id,
        product_id,
        sales_rep_id,
        opening_stock,
        stock_sold,
        stock_added,
        cash_collected,
        expected_cash,
        unit_price,
        closing_stock,
        payment_method,
        payment_reference,
        client_transaction_id,
        latitude,
        longitude,
        notes,
        date_created,
        last_updated,
        created_by,
        updated_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ,
      [
        payload.visit_id,
        payload.timestamp,
        payload.date,
        payload.vendor_id,
        payload.product_id,
        payload.sales_rep_id,
        payload.opening_stock,
        payload.stock_sold,
        payload.stock_added,
        payload.cash_collected,
        payload.expected_cash,
        payload.unit_price,
        payload.closing_stock,
        payload.payment_method,
        payload.payment_reference ?? '',
        payload.client_transaction_id ?? null,
        payload.latitude ?? null,
        payload.longitude ?? null,
        payload.notes ?? '',
        payload.date_created,
        payload.last_updated,
        payload.created_by ?? null,
        payload.updated_by ?? null,
      ]
    );

    return this.findById(payload.visit_id);
  }

  public async update(visitId: string, updates: UpdateVisitPayload): Promise<VisitLogRecord> {
    const parts: string[] = [];
    const params: unknown[] = [];

    if (updates.stock_sold !== undefined) {
      parts.push('stock_sold = ?');
      params.push(updates.stock_sold);
    }
    if (updates.stock_added !== undefined) {
      parts.push('stock_added = ?');
      params.push(updates.stock_added);
    }
    if (updates.cash_collected !== undefined) {
      parts.push('cash_collected = ?');
      params.push(updates.cash_collected);
    }
    if (updates.expected_cash !== undefined) {
      parts.push('expected_cash = ?');
      params.push(updates.expected_cash);
    }
    if (updates.unit_price !== undefined) {
      parts.push('unit_price = ?');
      params.push(updates.unit_price);
    }
    if (updates.closing_stock !== undefined) {
      parts.push('closing_stock = ?');
      params.push(updates.closing_stock);
    }
    if (updates.payment_method !== undefined) {
      parts.push('payment_method = ?');
      params.push(updates.payment_method);
    }
    if (updates.payment_reference !== undefined) {
      parts.push('payment_reference = ?');
      params.push(updates.payment_reference);
    }
    if (updates.client_transaction_id !== undefined) {
      parts.push('client_transaction_id = ?');
      params.push(updates.client_transaction_id);
    }
    if (updates.latitude !== undefined) {
      parts.push('latitude = ?');
      params.push(updates.latitude);
    }
    if (updates.longitude !== undefined) {
      parts.push('longitude = ?');
      params.push(updates.longitude);
    }
    if (updates.notes !== undefined) {
      parts.push('notes = ?');
      params.push(updates.notes);
    }
    if (updates.updated_by !== undefined) {
      parts.push('updated_by = ?');
      params.push(updates.updated_by);
    }

    parts.push('last_updated = ?');
    params.push(new Date().toISOString().slice(0, 19).replace('T', ' '));

    const sql = `UPDATE visit_logs SET ${parts.join(', ')} WHERE visit_id = ?`;
    await this.execute(sql, [...params, visitId]);
    return this.findById(visitId);
  }

  public async delete(visitId: string): Promise<void> {
    await this.execute('DELETE FROM visit_logs WHERE visit_id = ?', [visitId]);
  }

  public async exists(visitId: string): Promise<boolean> {
    const [rows] = await this.execute<Array<{ exists: number }>>(
      'SELECT COUNT(1) AS exists FROM visit_logs WHERE visit_id = ?',
      [visitId]
    );
    return rows.length > 0 && Number(rows[0].exists) > 0;
  }
}
