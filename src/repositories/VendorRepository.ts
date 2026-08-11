import type { Vendor } from '@/lib/types';
import type { RepositoryDbClient } from './types';
import { BaseRepository } from './BaseRepository';
import { NotFoundError } from './errors';

export interface CreateVendorPayload {
  vendor_id: string;
  vendor_name: string;
  phone: string;
  location: string;
  sales_rep_id?: string;
  assigned_date?: string;
  assigned_by?: string;
  status: string;
  date_created: string;
  last_updated: string;
  created_by?: string;
  updated_by?: string;
}

export interface UpdateVendorPayload {
  vendor_name?: string;
  phone?: string;
  location?: string;
  sales_rep_id?: string | null;
  assigned_date?: string | null;
  assigned_by?: string | null;
  status?: string;
  updated_by?: string;
  last_updated?: string;
}

export interface VendorSearchCriteria {
  vendor_id?: string;
  vendor_name?: string;
  phone?: string;
  sales_rep_id?: string;
  status?: string;
}

export class VendorRepository extends BaseRepository {
  constructor(db: RepositoryDbClient) {
    super(db);
  }

  private mapRow(row: any): Vendor {
    return {
      vendor_id: String(row.vendor_id),
      vendor_name: String(row.vendor_name),
      phone: String(row.phone),
      location: String(row.location),
      sales_rep: row.sales_rep || undefined,
      sales_rep_id: row.sales_rep_id === null ? undefined : String(row.sales_rep_id),
      assigned_date: row.assigned_date === null ? undefined : String(row.assigned_date),
      assigned_by: row.assigned_by === null ? undefined : String(row.assigned_by),
      date_created: String(row.date_created),
      last_updated: String(row.last_updated),
      status: String(row.status) as Vendor['status'],
      created_by: row.created_by === null ? undefined : String(row.created_by),
      updated_by: row.updated_by === null ? undefined : String(row.updated_by),
    };
  }

  public async findById(vendorId: string): Promise<Vendor> {
    const [rows] = await this.execute<any[]>('SELECT * FROM vendors WHERE vendor_id = ? LIMIT 1', [vendorId]);
    if (rows.length === 0) {
      throw new NotFoundError('Vendor', vendorId);
    }
    return this.mapRow(rows[0]);
  }

  public async findAll(): Promise<Vendor[]> {
    const [rows] = await this.execute<any[]>('SELECT * FROM vendors ORDER BY vendor_name ASC');
    return rows.map((row) => this.mapRow(row));
  }

  public async search(criteria: VendorSearchCriteria): Promise<Vendor[]> {
    const filters: string[] = [];
    const params: Record<string, unknown> = {};

    if (criteria.vendor_id) {
      filters.push('vendor_id = :vendor_id');
      params.vendor_id = criteria.vendor_id;
    }
    if (criteria.vendor_name) {
      filters.push('vendor_name LIKE :vendor_name');
      params.vendor_name = `%${criteria.vendor_name}%`;
    }
    if (criteria.phone) {
      filters.push('phone = :phone');
      params.phone = criteria.phone;
    }
    if (criteria.sales_rep_id) {
      filters.push('sales_rep_id = :sales_rep_id');
      params.sales_rep_id = criteria.sales_rep_id;
    }
    if (criteria.status) {
      filters.push('status = :status');
      params.status = criteria.status;
    }

    const whereClause = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';
    const [rows] = await this.execute<any[]>(`SELECT * FROM vendors ${whereClause} ORDER BY vendor_name ASC`, params);
    return rows.map((row) => this.mapRow(row));
  }

  public async create(payload: CreateVendorPayload): Promise<Vendor> {
    await (this.db.execute as any)(
      `INSERT INTO vendors (
        vendor_id,
        vendor_name,
        phone,
        location,
        sales_rep_id,
        assigned_date,
        assigned_by,
        date_created,
        last_updated,
        status,
        created_by,
        updated_by
      ) VALUES (
        :vendor_id,
        :vendor_name,
        :phone,
        :location,
        :sales_rep_id,
        :assigned_date,
        :assigned_by,
        :date_created,
        :last_updated,
        :status,
        :created_by,
        :updated_by
      )`,
      {
        vendor_id: payload.vendor_id,
        vendor_name: payload.vendor_name,
        phone: payload.phone,
        location: payload.location,
        sales_rep_id: payload.sales_rep_id ?? null,
        assigned_date: payload.assigned_date ?? null,
        assigned_by: payload.assigned_by ?? null,
        date_created: payload.date_created,
        last_updated: payload.last_updated,
        status: payload.status,
        created_by: payload.created_by ?? null,
        updated_by: payload.updated_by ?? null,
      }
    );

    return this.findById(payload.vendor_id);
  }

  public async update(vendorId: string, updates: UpdateVendorPayload): Promise<Vendor> {
    const fields: string[] = [];
    const params: Record<string, unknown> = { vendor_id: vendorId };

    if (updates.vendor_name !== undefined) {
      fields.push('vendor_name = :vendor_name');
      params.vendor_name = updates.vendor_name;
    }
    if (updates.phone !== undefined) {
      fields.push('phone = :phone');
      params.phone = updates.phone;
    }
    if (updates.location !== undefined) {
      fields.push('location = :location');
      params.location = updates.location;
    }
    if (updates.sales_rep_id !== undefined) {
      fields.push('sales_rep_id = :sales_rep_id');
      params.sales_rep_id = updates.sales_rep_id;
    }
    if (updates.assigned_date !== undefined) {
      fields.push('assigned_date = :assigned_date');
      params.assigned_date = updates.assigned_date;
    }
    if (updates.assigned_by !== undefined) {
      fields.push('assigned_by = :assigned_by');
      params.assigned_by = updates.assigned_by;
    }
    if (updates.status !== undefined) {
      fields.push('status = :status');
      params.status = updates.status;
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
      throw new Error('No Vendor update fields were provided.');
    }

    const sql = `UPDATE vendors SET ${fields.join(', ')} WHERE vendor_id = :vendor_id`;
    const [result] = await (this.db.execute as any)(sql, params);
    if ((result as import('mysql2/promise').OkPacket).affectedRows === 0) {
      throw new NotFoundError('Vendor', vendorId);
    }

    return this.findById(vendorId);
  }

  public async delete(vendorId: string): Promise<void> {
    const [result] = await (this.db.execute as any)(
      'DELETE FROM vendors WHERE vendor_id = :vendor_id',
      { vendor_id: vendorId }
    );

    if ((result as import('mysql2/promise').OkPacket).affectedRows === 0) {
      throw new NotFoundError('Vendor', vendorId);
    }
  }

  public async exists(vendorId: string): Promise<boolean> {
    const [rows] = await this.execute<{ record_exists: number }[]>(
      'SELECT EXISTS(SELECT 1 FROM vendors WHERE vendor_id = ?) AS record_exists',
      [vendorId]
    );
    return rows.length > 0 && rows[0].record_exists === 1;
  }
}
