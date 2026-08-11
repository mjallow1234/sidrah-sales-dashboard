import type { FieldPacket, OkPacket } from 'mysql2/promise';
import type { Product } from '@/lib/types';
import type { RepositoryDbClient } from './types';
import type { PaginatedResult } from './types';
import { BaseRepository } from './BaseRepository';
import { NotFoundError } from './errors';

export interface CreateProductPayload {
  product_id: string;
  sku: string;
  product_name: string;
  category: string;
  unit: string;
  default_unit_price: number;
  currency: string;
  low_stock_threshold: number;
  active: boolean;
  created_by?: string | null;
  updated_by?: string | null;
  date_created?: string;
  last_updated?: string;
}

export interface UpdateProductPayload {
  product_name?: string;
  category?: string;
  unit?: string;
  default_unit_price?: number;
  currency?: string;
  low_stock_threshold?: number;
  active?: boolean;
  updated_by?: string | null;
  last_updated?: string;
}

export interface ProductSearchCriteria {
  category?: string;
  active?: boolean;
  page?: number;
  pageSize?: number;
}

export class ProductRepository extends BaseRepository {
  constructor(db: RepositoryDbClient) {
    super(db);
  }

  private mapRow(row: any): Product {
    return {
      product_id: String(row.product_id),
      sku: String(row.sku),
      product_name: String(row.product_name),
      category: String(row.category),
      unit: String(row.unit),
      default_unit_price: Number(row.default_unit_price),
      currency: String(row.currency),
      low_stock_threshold: Number(row.low_stock_threshold),
      active: Boolean(row.active === 1 || row.active === true || String(row.active).toLowerCase() === 'true'),
      date_created: this.formatDateValue(row.date_created),
      last_updated: this.formatDateTimeValue(row.last_updated),
      created_by: row.created_by === null ? undefined : String(row.created_by),
      updated_by: row.updated_by === null ? undefined : String(row.updated_by),
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

  public async findById(productId: string): Promise<Product> {
    const [rows] = await this.execute<any[]>('SELECT * FROM products WHERE product_id = ? LIMIT 1', [productId]);
    if (rows.length === 0) {
      throw new NotFoundError('Product', productId);
    }
    return this.mapRow(rows[0]);
  }

  public async findAll(): Promise<Product[]> {
    const [rows] = await this.execute<any[]>("SELECT * FROM products ORDER BY product_name ASC");
    return rows.map((row) => this.mapRow(row));
  }

  public async findActive(): Promise<Product[]> {
    const [rows] = await this.execute<any[]>("SELECT * FROM products WHERE active = TRUE ORDER BY product_name ASC");
    return rows.map((row) => this.mapRow(row));
  }

  public async search(criteria: ProductSearchCriteria): Promise<PaginatedResult<Product>> {
    const filters: string[] = [];
    const params: Record<string, unknown> = {};

    if (criteria.active !== undefined) {
      filters.push('active = :active');
      params.active = criteria.active ? 1 : 0;
    }

    if (criteria.category) {
      filters.push('category = :category');
      params.category = criteria.category;
    }

    const whereClause = filters.length > 0 ? `WHERE ${filters.join(' AND ')}` : '';
    const page = criteria.page ?? 1;
    const pageSize = criteria.pageSize ?? 200;
    const sql = `SELECT * FROM products ${whereClause} ORDER BY product_name ASC`;
    const countSql = `SELECT COUNT(*) AS total FROM products ${whereClause}`;
    const results = await this.paginate<Product>(sql, countSql, params, page, pageSize);
    results.items = results.items.map((row) => this.mapRow(row));
    return results;
  }

  public async create(payload: CreateProductPayload): Promise<Product> {
    await (this.db.execute as any)(
      `INSERT INTO products (
        product_id,
        sku,
        product_name,
        category,
        unit,
        default_unit_price,
        currency,
        low_stock_threshold,
        active,
        date_created,
        last_updated,
        created_by,
        updated_by
      ) VALUES (
        :product_id,
        :sku,
        :product_name,
        :category,
        :unit,
        :default_unit_price,
        :currency,
        :low_stock_threshold,
        :active,
        :date_created,
        :last_updated,
        :created_by,
        :updated_by
      )`,
      {
        product_id: payload.product_id,
        sku: payload.sku,
        product_name: payload.product_name,
        category: payload.category,
        unit: payload.unit,
        default_unit_price: payload.default_unit_price,
        currency: payload.currency,
        low_stock_threshold: payload.low_stock_threshold,
        active: payload.active ? 1 : 0,
        date_created: payload.date_created,
        last_updated: payload.last_updated,
        created_by: payload.created_by ?? null,
        updated_by: payload.updated_by ?? null,
      }
    );

    return this.findById(payload.product_id);
  }

  public async update(productId: string, updates: UpdateProductPayload): Promise<Product> {
    const fields: string[] = [];
    const params: Record<string, unknown> = { product_id: productId };

    if (updates.product_name !== undefined) {
      fields.push('product_name = :product_name');
      params.product_name = updates.product_name;
    }
    if (updates.category !== undefined) {
      fields.push('category = :category');
      params.category = updates.category;
    }
    if (updates.unit !== undefined) {
      fields.push('unit = :unit');
      params.unit = updates.unit;
    }
    if (updates.default_unit_price !== undefined) {
      fields.push('default_unit_price = :default_unit_price');
      params.default_unit_price = updates.default_unit_price;
    }
    if (updates.currency !== undefined) {
      fields.push('currency = :currency');
      params.currency = updates.currency;
    }
    if (updates.low_stock_threshold !== undefined) {
      fields.push('low_stock_threshold = :low_stock_threshold');
      params.low_stock_threshold = updates.low_stock_threshold;
    }
    if (updates.active !== undefined) {
      fields.push('active = :active');
      params.active = updates.active ? 1 : 0;
    }
    if (updates.updated_by !== undefined) {
      fields.push('updated_by = :updated_by');
      params.updated_by = updates.updated_by ?? null;
    }
    if (updates.last_updated !== undefined) {
      fields.push('last_updated = :last_updated');
      params.last_updated = updates.last_updated;
    }

    if (fields.length === 0) {
      throw new Error('No product update fields were provided.');
    }

    const sql = `UPDATE products SET ${fields.join(', ')} WHERE product_id = :product_id`;
    const [result] = await (this.db.execute as any)(sql, params);
    if ((result as OkPacket).affectedRows === 0) {
      throw new NotFoundError('Product', productId);
    }

    return this.findById(productId);
  }

  public async delete(productId: string): Promise<void> {
    const [result] = await (this.db.execute as any)(
      'DELETE FROM products WHERE product_id = :product_id',
      { product_id: productId }
    );

    if ((result as OkPacket).affectedRows === 0) {
      throw new NotFoundError('Product', productId);
    }
  }

  public async exists(productId: string): Promise<boolean> {
    const [rows] = await this.execute<{ record_exists: number }[]>(
      'SELECT EXISTS(SELECT 1 FROM products WHERE product_id = ?) AS record_exists',
      [productId]
    );
    return rows.length > 0 && rows[0].record_exists === 1;
  }

  public async existsBySku(sku: string): Promise<boolean> {
    const [rows] = await this.execute<{ record_exists: number }[]>(
      'SELECT EXISTS(SELECT 1 FROM products WHERE sku = ?) AS record_exists',
      [sku]
    );
    return rows.length > 0 && rows[0].record_exists === 1;
  }

  public async findBySku(sku: string): Promise<Product | null> {
    const [rows] = await this.execute<any>('SELECT * FROM products WHERE sku = ? LIMIT 1', [sku]);
    if (rows.length === 0) {
      return null;
    }
    return this.mapRow(rows[0]);
  }
}
