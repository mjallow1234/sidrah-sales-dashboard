import { randomUUID } from 'crypto';
import { getPool, transaction } from '@/lib/db';
import type { Inventory, Vendor } from '@/lib/types';
import { IdSequenceRepository } from '@/repositories/IdSequenceRepository';
import { InventoryRepository } from '@/repositories/InventoryRepository';
import { ProductRepository } from '@/repositories/ProductRepository';
import { VendorBalanceRepository } from '@/repositories/VendorBalanceRepository';
import { VendorRepository } from '@/repositories/VendorRepository';
import { ValidationError } from './errors';
import { getInventory, getVendor, getVendors as fetchVendors } from '@/services/gasApi';

function validateVendorPayload(payload: Record<string, unknown>): void {
  const required = ['vendor_name', 'phone', 'location'];
  const missing = required.filter((field) => payload[field] === undefined || payload[field] === null || payload[field] === '');
  if (missing.length > 0) {
    throw new ValidationError(`Missing required fields: ${missing.join(', ')}`);
  }

  for (const field of required) {
    if (typeof payload[field] !== 'string') {
      throw new ValidationError(`${field} must be a string.`);
    }
  }

  if (payload.sales_rep_id !== undefined && payload.sales_rep_id !== null && payload.sales_rep_id !== '') {
    if (typeof payload.sales_rep_id !== 'string') {
      throw new ValidationError('sales_rep_id must be a string.');
    }
  }

  if (payload.assigned_date !== undefined && payload.assigned_date !== null && payload.assigned_date !== '') {
    if (typeof payload.assigned_date !== 'string' || Number.isNaN(Date.parse(payload.assigned_date))) {
      throw new ValidationError('assigned_date must be a valid date.');
    }
  }
}

function generateInventoryId(): string {
  return `I_${randomUUID().replace(/-/g, '').slice(0, 12)}`;
}

export async function getVendorList(): Promise<Vendor[]> {
  return fetchVendors();
}

export async function getVendorById(vendorId: string): Promise<Vendor | undefined> {
  return getVendor(vendorId);
}

export async function getVendorInventory(vendorId: string): Promise<Inventory | undefined> {
  const results = await getInventory({ vendorId });
  return results[0];
}

export async function createVendor(payload: Record<string, unknown>): Promise<Vendor> {
  validateVendorPayload(payload);

  return transaction(async (connection) => {
    const now = new Date();
    const nowDate = now.toISOString().slice(0, 10);
    const nowDateTime = now.toISOString();
    const vendorRepository = new VendorRepository(connection);
    const productRepository = new ProductRepository(connection);
    const inventoryRepository = new InventoryRepository(connection);
    const balanceRepository = new VendorBalanceRepository(connection);
    const sequenceRepository = new IdSequenceRepository(connection);
    const salesRepId = typeof payload.sales_rep_id === 'string' && payload.sales_rep_id !== ''
      ? payload.sales_rep_id
      : null;

    if (salesRepId) {
      const [salesRepRows] = await connection.execute(
        'SELECT sales_rep_id FROM sales_reps WHERE sales_rep_id = ? LIMIT 1',
        [salesRepId],
      );
      if ((salesRepRows as unknown[]).length === 0) {
        throw new ValidationError('Invalid sales_rep_id.');
      }
    }

    const sequence = await sequenceRepository.incrementAndGetCurrentValue('Vendors');
    const vendorId = `${sequence.prefix}${String(sequence.next_value).padStart(3, '0')}`;
    const createdBy = typeof payload.created_by === 'string' ? payload.created_by : null;
    const assignedDate = salesRepId
      ? (typeof payload.assigned_date === 'string' && payload.assigned_date !== '' ? payload.assigned_date : nowDate)
      : null;
    const assignedBy = salesRepId
      ? (typeof payload.assigned_by === 'string' ? payload.assigned_by : null)
      : null;

    await vendorRepository.create({
      vendor_id: vendorId,
      vendor_name: String(payload.vendor_name),
      phone: String(payload.phone),
      location: String(payload.location),
      sales_rep_id: salesRepId ?? undefined,
      assigned_date: assignedDate ?? undefined,
      assigned_by: assignedBy ?? undefined,
      status: typeof payload.status === 'string' && payload.status !== '' ? payload.status : 'active',
      date_created: typeof payload.date_created === 'string' && payload.date_created !== '' ? payload.date_created : nowDate,
      last_updated: nowDateTime,
      created_by: createdBy ?? undefined,
      updated_by: typeof payload.updated_by === 'string' ? payload.updated_by : undefined,
    });

    const activeProducts = await productRepository.findActive();
    for (const product of activeProducts) {
      await inventoryRepository.create({
        inventory_id: generateInventoryId(),
        vendor_id: vendorId,
        product_id: product.product_id,
        total_stock_supplied: 0,
        total_stock_sold: 0,
        current_stock: 0,
        date_created: nowDate,
        last_updated: nowDateTime,
        created_by: createdBy ?? undefined,
      });
    }

    await balanceRepository.create({
      vendor_id: vendorId,
      total_expected_cash: 0,
      cash_collected: 0,
      balance_owed: 0,
      date_created: nowDate,
      last_updated: nowDateTime,
      created_by: createdBy ?? undefined,
    });

    return vendorRepository.findById(vendorId);
  });
}

export async function updateVendor(vendorId: string, payload: Record<string, unknown>): Promise<Vendor> {
  const updates: Record<string, unknown> = {};

  if (payload.vendor_name !== undefined) updates.vendor_name = String(payload.vendor_name);
  if (payload.phone !== undefined) updates.phone = String(payload.phone);
  if (payload.location !== undefined) updates.location = String(payload.location);
  if (payload.sales_rep_id !== undefined) {
    updates.sales_rep_id = payload.sales_rep_id === null || payload.sales_rep_id === ''
      ? null
      : String(payload.sales_rep_id);
  }
  if (payload.status !== undefined) updates.status = String(payload.status);

  if (updates.sales_rep_id !== undefined && updates.sales_rep_id !== null) {
    const [salesRepRows] = await getPool().query(
      'SELECT sales_rep_id FROM sales_reps WHERE sales_rep_id = ? LIMIT 1',
      [updates.sales_rep_id],
    );
    if ((salesRepRows as unknown[]).length === 0) {
      throw new ValidationError('Invalid sales_rep_id.');
    }
  }

  updates.last_updated = new Date().toISOString();
  if (payload.updated_by !== undefined) {
    updates.updated_by = payload.updated_by === null ? null : String(payload.updated_by);
  }

  return new VendorRepository(getPool()).update(vendorId, updates as any);
}
