import type { SalesRep } from '@/lib/types';
import type { RepositoryDbClient } from './types';
import { BaseRepository } from './BaseRepository';
import { NotFoundError } from './errors';

export interface CreateSalesRepPayload {
  sales_rep_id: string;
  name: string;
  phone: string;
  role: string;
  status: string;
  is_active?: boolean;
  date_created?: string;
  last_updated?: string;
  version?: number;
  created_by?: string;
  updated_by?: string;
}

export interface UpdateSalesRepPayload {
  name?: string;
  phone?: string;
  role?: string;
  status?: string;
  is_active?: boolean;
  last_updated?: string;
  updated_by?: string;
}

export interface SalesRepSearchCriteria {
  sales_rep_id?: string;
  name?: string;
  phone?: string;
  role?: string;
  status?: string;
}

export class SalesRepRepository extends BaseRepository {
  constructor(db: RepositoryDbClient) {
    super(db);
  }

  private mapRow(row: any): SalesRep {
    return {
      sales_rep_id: String(row.sales_rep_id),
      name: String(row.name),
      phone: String(row.phone),
      role: String(row.role),
      status: String(row.status) as SalesRep['status'],
      date_created: this.formatDateValue(row.date_created),
      last_updated: this.formatDateTimeValue(row.last_updated),
    };
  }

  private formatDateValue(value: unknown): string {
    if (value instanceof Date) {
      return value.toISOString().split('T')[0];
    }
    return value === null || value === undefined ? '' : String(value);
  }

  private formatDateTimeValue(value: unknown): string {
    if (value instanceof Date) {
      return value.toISOString();
    }
    return value === null || value === undefined ? '' : String(value);
  }

  public async findById(salesRepId: string): Promise<SalesRep> {
    const [rows] = await this.execute<any[]>('SELECT * FROM sales_reps WHERE sales_rep_id = ? LIMIT 1', [salesRepId]);
    if (rows.length === 0) {
      throw new NotFoundError('SalesRep', salesRepId);
    }
    return this.mapRow(rows[0]);
  }

  public async findAll(): Promise<SalesRep[]> {
    const [rows] = await this.execute<any[]>('SELECT * FROM sales_reps ORDER BY name ASC');
    return rows.map((row) => this.mapRow(row));
  }

  public async search(criteria: SalesRepSearchCriteria): Promise<SalesRep[]> {
    const filters: string[] = [];
    const params: Record<string, unknown> = {};

    if (criteria.sales_rep_id) {
      filters.push('sales_rep_id = :sales_rep_id');
      params.sales_rep_id = criteria.sales_rep_id;
    }
    if (criteria.name) {
      filters.push('name LIKE :name');
      params.name = `%${criteria.name}%`;
    }
    if (criteria.phone) {
      filters.push('phone = :phone');
      params.phone = criteria.phone;
    }
    if (criteria.role) {
      filters.push('role = :role');
      params.role = criteria.role;
    }
    if (criteria.status) {
      filters.push('status = :status');
      params.status = criteria.status;
    }

    const whereClause = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';
    const [rows] = await this.execute<any[]>(`SELECT * FROM sales_reps ${whereClause} ORDER BY name ASC`, params);
    return rows.map((row) => this.mapRow(row));
  }

  public async create(payload: CreateSalesRepPayload): Promise<SalesRep> {
    await (this.db.execute as any)(
      `INSERT INTO sales_reps (
        sales_rep_id,
        name,
        phone,
        role,
        status,
        is_active,
        date_created,
        last_updated,
        version,
        created_by,
        updated_by
      ) VALUES (
        :sales_rep_id,
        :name,
        :phone,
        :role,
        :status,
        :is_active,
        :date_created,
        :last_updated,
        :version,
        :created_by,
        :updated_by
      )`,
      {
        sales_rep_id: payload.sales_rep_id,
        name: payload.name,
        phone: typeof payload.phone === 'number' ? String(payload.phone) : String(payload.phone).trim(),
        role: payload.role,
        status: payload.status,
        is_active: payload.is_active === undefined ? 1 : payload.is_active ? 1 : 0,
        date_created: payload.date_created,
        last_updated: payload.last_updated,
        version: payload.version ?? 1,
        created_by: payload.created_by ?? null,
        updated_by: payload.updated_by ?? null,
      }
    );

    return this.findById(payload.sales_rep_id);
  }

  public async update(salesRepId: string, updates: UpdateSalesRepPayload): Promise<SalesRep> {
    const fields: string[] = [];
    const params: Record<string, unknown> = { sales_rep_id: salesRepId };

    if (updates.name !== undefined) {
      fields.push('name = :name');
      params.name = updates.name;
    }
    if (updates.phone !== undefined) {
      fields.push('phone = :phone');
      params.phone = updates.phone;
    }
    if (updates.role !== undefined) {
      fields.push('role = :role');
      params.role = updates.role;
    }
    if (updates.status !== undefined) {
      fields.push('status = :status');
      params.status = updates.status;
    }
    if (updates.is_active !== undefined) {
      fields.push('is_active = :is_active');
      params.is_active = updates.is_active ? 1 : 0;
    }
    if (updates.updated_by !== undefined) {
      fields.push('updated_by = :updated_by');
      params.updated_by = updates.updated_by;
    }
    if (updates.last_updated !== undefined) {
      fields.push('last_updated = :last_updated');
      params.last_updated = updates.last_updated;
    }

    if (fields.length === 0) {
      throw new Error('No SalesRep update fields were provided.');
    }

    const sql = `UPDATE sales_reps SET ${fields.join(', ')} WHERE sales_rep_id = :sales_rep_id`;
    const [result] = await (this.db.execute as any)(sql, params);
    if ((result as import('mysql2/promise').OkPacket).affectedRows === 0) {
      throw new NotFoundError('SalesRep', salesRepId);
    }

    return this.findById(salesRepId);
  }

  public async delete(salesRepId: string): Promise<void> {
    const [result] = await (this.db.execute as any)(
      'DELETE FROM sales_reps WHERE sales_rep_id = :sales_rep_id',
      { sales_rep_id: salesRepId }
    );

    if ((result as import('mysql2/promise').OkPacket).affectedRows === 0) {
      throw new NotFoundError('SalesRep', salesRepId);
    }
  }

  public async exists(salesRepId: string): Promise<boolean> {
    const [rows] = await this.execute<{ record_exists: number }[]>(
      'SELECT EXISTS(SELECT 1 FROM sales_reps WHERE sales_rep_id = ?) AS record_exists',
      [salesRepId]
    );
    return rows.length > 0 && rows[0].record_exists === 1;
  }
}
