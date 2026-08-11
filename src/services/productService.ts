import { getPool, transaction } from '@/lib/db';
import type { Product } from '@/lib/types';
import { ProductRepository } from '@/repositories/ProductRepository';
import { IdSequenceRepository } from '@/repositories/IdSequenceRepository';
import { ValidationError } from './errors';

function normalizeBoolean(value: unknown): boolean {
  if (value === undefined || value === null || value === '') {
    return false;
  }
  if (typeof value === 'boolean') {
    return value;
  }
  const normalized = String(value).trim().toLowerCase();
  return normalized === 'true' || normalized === '1';
}

function validateProductPayload(payload: Record<string, unknown>) {
  const required = ['product_name', 'category', 'unit', 'default_unit_price', 'currency', 'low_stock_threshold'];
  const missing = required.filter((field) => payload[field] === undefined || payload[field] === null || payload[field] === '');
  if (missing.length) {
    throw new ValidationError(`Missing required fields: ${missing.join(', ')}`);
  }

  if (typeof payload.product_name !== 'string') {
    throw new ValidationError('product_name must be a string.');
  }
  if (typeof payload.category !== 'string') {
    throw new ValidationError('category must be a string.');
  }
  if (typeof payload.unit !== 'string') {
    throw new ValidationError('unit must be a string.');
  }
  if (typeof payload.currency !== 'string') {
    throw new ValidationError('currency must be a string.');
  }
  if (payload.default_unit_price === undefined || payload.default_unit_price === null || Number.isNaN(Number(payload.default_unit_price))) {
    throw new ValidationError('default_unit_price must be a non-negative number.');
  }
  if (Number(payload.default_unit_price) < 0) {
    throw new ValidationError('default_unit_price must be a non-negative number.');
  }
  if (payload.low_stock_threshold === undefined || payload.low_stock_threshold === null || Number.isNaN(Number(payload.low_stock_threshold))) {
    throw new ValidationError('low_stock_threshold must be a non-negative number.');
  }
  if (Number(payload.low_stock_threshold) < 0) {
    throw new ValidationError('low_stock_threshold must be a non-negative number.');
  }
}

function validateProductUpdatePayload(payload: Record<string, unknown>) {
  if (!payload || Object.keys(payload).length === 0) {
    throw new ValidationError('At least one product field must be provided.');
  }

  if (payload.sku !== undefined) {
    throw new ValidationError('sku cannot be updated.');
  }
  if (payload.product_name !== undefined && typeof payload.product_name !== 'string') {
    throw new ValidationError('product_name must be a string.');
  }
  if (payload.category !== undefined && typeof payload.category !== 'string') {
    throw new ValidationError('category must be a string.');
  }
  if (payload.unit !== undefined && typeof payload.unit !== 'string') {
    throw new ValidationError('unit must be a string.');
  }
  if (payload.currency !== undefined && typeof payload.currency !== 'string') {
    throw new ValidationError('currency must be a string.');
  }
  if (payload.default_unit_price !== undefined && (Number.isNaN(Number(payload.default_unit_price)) || Number(payload.default_unit_price) < 0)) {
    throw new ValidationError('default_unit_price must be a non-negative number.');
  }
  if (payload.low_stock_threshold !== undefined && (Number.isNaN(Number(payload.low_stock_threshold)) || Number(payload.low_stock_threshold) < 0)) {
    throw new ValidationError('low_stock_threshold must be a non-negative number.');
  }
  if (payload.active !== undefined) {
    const normalized = String(payload.active).trim().toLowerCase();
    if (normalized !== 'true' && normalized !== 'false' && normalized !== '1' && normalized !== '0') {
      throw new ValidationError('active must be true or false.');
    }
  }
}

export async function getProducts(active?: boolean | string, category?: string): Promise<Product[]> {
  const repo = new ProductRepository(getPool());
  if (active === undefined && category === undefined) {
    return repo.findAll();
  }
  const criteria = {
    active: active === undefined ? undefined : normalizeBoolean(active),
    category,
    page: 1,
    pageSize: 200,
  };
  const paginated = await repo.search(criteria);
  return paginated.items;
}

export async function getProductById(productId: string): Promise<Product> {
  const repo = new ProductRepository(getPool());
  return repo.findById(productId);
}

export async function createProduct(payload: Record<string, unknown>): Promise<Product> {
  validateProductPayload(payload);
  return transaction(async (connection) => {
    const repo = new ProductRepository(connection);
    const sequenceRepo = new IdSequenceRepository(connection);
    const sequence = await sequenceRepo.incrementAndGetCurrentValue('Products');
    const productId = `${sequence.prefix}${String(sequence.next_value).padStart(3, '0')}`;

    const skuBase = String(payload.product_name).trim().toUpperCase()
      .replace(/[^A-Z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/-+/g, '-');

    const baseSku = skuBase || productId;
    let sku = baseSku.length > 30 ? baseSku.slice(0, 30).replace(/-+$/g, '') : baseSku;
    let suffix = 1;

    while (await repo.existsBySku(sku)) {
      sku = `${baseSku}-${suffix}`;
      suffix += 1;
    }

    const now = new Date().toISOString();
    const createdBy = payload.created_by === undefined ? null : String(payload.created_by);
    const updatedBy = payload.updated_by === undefined ? null : String(payload.updated_by);

    return repo.create({
      product_id: productId,
      sku,
      product_name: String(payload.product_name),
      category: String(payload.category),
      unit: String(payload.unit),
      default_unit_price: Number(payload.default_unit_price),
      currency: String(payload.currency),
      low_stock_threshold: Number(payload.low_stock_threshold),
      active: true,
      date_created: now.split('T')[0],
      last_updated: now,
      created_by: createdBy,
      updated_by: updatedBy,
    });
  });
}

export async function updateProduct(productId: string, payload: Record<string, unknown>): Promise<Product> {
  validateProductUpdatePayload(payload);
  const repo = new ProductRepository(getPool());

  const updatePayload: Record<string, unknown> = {};
  if (payload.product_name !== undefined) updatePayload.product_name = String(payload.product_name);
  if (payload.category !== undefined) updatePayload.category = String(payload.category);
  if (payload.unit !== undefined) updatePayload.unit = String(payload.unit);
  if (payload.default_unit_price !== undefined) updatePayload.default_unit_price = Number(payload.default_unit_price);
  if (payload.currency !== undefined) updatePayload.currency = String(payload.currency);
  if (payload.low_stock_threshold !== undefined) updatePayload.low_stock_threshold = Number(payload.low_stock_threshold);
  if (payload.active !== undefined) updatePayload.active = normalizeBoolean(payload.active);
  if (payload.updated_by !== undefined) {
    updatePayload.updated_by = payload.updated_by === null ? null : String(payload.updated_by);
  }
  updatePayload.last_updated = new Date().toISOString();

  return repo.update(productId, updatePayload as any);
}
