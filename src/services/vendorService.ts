import { randomUUID } from 'crypto';
import { getPool, transaction } from '@/lib/db';
import type { Inventory, Vendor } from '@/lib/types';
import { IdSequenceRepository } from '@/repositories/IdSequenceRepository';
import { InventoryRepository } from '@/repositories/InventoryRepository';
import { ProductRepository } from '@/repositories/ProductRepository';
import { VendorBalanceRepository } from '@/repositories/VendorBalanceRepository';
import { VendorInventoryRepository } from '@/repositories/VendorInventoryRepository';
import { VendorRepository } from '@/repositories/VendorRepository';
import { allocateSecondaryVendorSequence } from '@/repositories/SecondaryVendorIdSequenceRepository';
import { ValidationError, NotFoundError } from './errors';
import { formatSecondaryVendorId, getSecondaryVendorPrefix, VENDOR_CATEGORY_CODES } from '@/lib/vendorSecondaryId';

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

  if (payload.acquired_by !== undefined && payload.acquired_by !== null && payload.acquired_by !== '') {
    if (typeof payload.acquired_by !== 'string') {
      throw new ValidationError('acquired_by must be a string.');
    }
  }

  if (payload.vendor_type_id !== undefined && payload.vendor_type_id !== null && payload.vendor_type_id !== '') {
    if (typeof payload.vendor_type_id !== 'string') {
      throw new ValidationError('vendor_type_id must be a string.');
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

function generateVendorInventoryId(): string {
  return `VI_${randomUUID().replace(/-/g, '').slice(0, 12)}`;
}

async function allocateSecondaryVendorId(connection: any, vendorTypeId: string | null, acquiredById: string | null): Promise<string | null> {
  const { prefix, issue } = await getSecondaryVendorIdPrefix(connection, vendorTypeId, acquiredById);
  if (issue?.startsWith('Unsupported vendor category')) throw new ValidationError(`${issue}.`);
  if (!prefix) return null;

  // The caller's createVendor transaction holds this prefix row lock through insert.
  let sequence: number;
  try {
    sequence = await allocateSecondaryVendorSequence(connection, prefix);
  } catch (error) {
    if (error instanceof Error && error.message.includes('sequence exhausted')) throw new ValidationError(error.message);
    throw error;
  }
  return formatSecondaryVendorId(prefix, sequence);
}

async function getSecondaryVendorIdPrefix(
  connection: any,
  vendorTypeId: string | null,
  acquiredById: string | null,
): Promise<{ prefix: string | null; issue?: string }> {
  if (!vendorTypeId) return { prefix: null, issue: 'A vendor category is required to assign a secondary ID.' };
  const [rows] = await connection.execute(
    'SELECT vt.name AS type_name, ab.name AS acquired_name FROM vendor_types vt LEFT JOIN acquired_by_names ab ON ab.acquired_by_id = ? WHERE vt.vendor_type_id = ? LIMIT 1',
    [acquiredById, vendorTypeId],
  );
  const row = (rows as any[])[0];
  if (!row?.type_name) return { prefix: null, issue: 'The vendor category is missing or unavailable.' };
  const category = String(row.type_name);
  if (!Object.prototype.hasOwnProperty.call(VENDOR_CATEGORY_CODES, category)) {
    return { prefix: null, issue: `Unsupported vendor category: ${category}.` };
  }
  if (!acquiredById || !row.acquired_name) {
    return { prefix: null, issue: 'An Acquired By name is required to assign a secondary ID.' };
  }
  const prefix = getSecondaryVendorPrefix(category, String(row.acquired_name));
  if (!prefix) return { prefix: null, issue: 'The Acquired By name does not have a usable initial.' };
  return { prefix };
}

export async function getVendorList(): Promise<Vendor[]> {
  return new VendorRepository(getPool()).findAll();
}

export async function getVendorById(vendorId: string): Promise<Vendor | undefined> {
  try {
    return await new VendorRepository(getPool()).findById(vendorId);
  } catch (error: unknown) {
    if (error instanceof NotFoundError) {
      return undefined;
    }
    throw error;
  }
}

export async function getVendorInventory(vendorId: string): Promise<Inventory | undefined> {
  const [inventoryRows] = await getPool().query<any[]>(
    `SELECT
       COALESCE(SUM(current_stock), 0) AS current_stock,
       COALESCE(SUM(total_stock_supplied), 0) AS total_stock_supplied,
       COALESCE(SUM(total_stock_sold), 0) AS total_stock_sold
     FROM vendor_inventory
     WHERE vendor_id = ?`,
    [vendorId]
  );

  const [balanceRows] = await getPool().query<any[]>(
    `SELECT total_expected_cash AS expected_cash, cash_collected, balance_owed FROM vendor_balances WHERE vendor_id = ? LIMIT 1`,
    [vendorId]
  );

  if (!inventoryRows || inventoryRows.length === 0) {
    return undefined;
  }

  const inventory = inventoryRows[0];
  const balance = balanceRows?.[0] ?? { expected_cash: 0, cash_collected: 0, balance_owed: 0 };

  return {
    inventory_id: `summary_${vendorId}`,
    vendor_id: vendorId,
    current_stock: Number(inventory.current_stock) || 0,
    total_stock_supplied: Number(inventory.total_stock_supplied) || 0,
    total_stock_sold: Number(inventory.total_stock_sold) || 0,
    expected_cash: Number(balance.expected_cash) || 0,
    cash_collected: Number(balance.cash_collected) || 0,
    balance_owed: Number(balance.balance_owed) || 0,
  };
}

export async function createVendor(payload: Record<string, unknown>): Promise<Vendor> {
  validateVendorPayload(payload);

  return transaction(async (connection) => {
    const now = new Date();
    const nowDate = now.toISOString().slice(0, 10);
    const nowDateTime = now.toISOString().slice(0, 19).replace('T', ' ');
    const vendorRepository = new VendorRepository(connection);
    const productRepository = new ProductRepository(connection);
    const inventoryRepository = new InventoryRepository(connection);
    const vendorInventoryRepository = new VendorInventoryRepository(connection);
    const balanceRepository = new VendorBalanceRepository(connection);
    const sequenceRepository = new IdSequenceRepository(connection);
    const salesRepId = typeof payload.sales_rep_id === 'string' && payload.sales_rep_id !== ''
      ? payload.sales_rep_id
      : null;
    const acquiredBy = typeof payload.acquired_by === 'string' && payload.acquired_by !== ''
      ? payload.acquired_by
      : null;
    const vendorTypeId = typeof payload.vendor_type_id === 'string' && payload.vendor_type_id !== ''
      ? payload.vendor_type_id
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

    if (acquiredBy) {
      const [nameRows] = await connection.execute(
        'SELECT acquired_by_id FROM acquired_by_names WHERE acquired_by_id = ? AND is_active = 1 LIMIT 1',
        [acquiredBy],
      );
      if ((nameRows as unknown[]).length === 0) {
        throw new ValidationError('This Acquired By name is not available for selection.');
      }
    }

    if (vendorTypeId) {
      const [typeRows] = await connection.execute(
        'SELECT vendor_type_id FROM vendor_types WHERE vendor_type_id = ? AND is_active = 1 LIMIT 1',
        [vendorTypeId],
      );
      if ((typeRows as unknown[]).length === 0) {
        throw new ValidationError('Invalid vendor type.');
      }
    }

    const status = typeof payload.status === 'string' && payload.status !== '' ? payload.status : 'active';
    const [statusRows] = await connection.execute(
      'SELECT status_id FROM vendor_statuses WHERE status_id = ? AND is_active = 1 LIMIT 1',
      [status],
    );
    if ((statusRows as unknown[]).length === 0) throw new ValidationError('Invalid vendor status.');

    const sequence = await sequenceRepository.incrementAndGetCurrentValue('Vendors');
    const vendorId = `${sequence.prefix}${String(sequence.next_value).padStart(3, '0')}`;
    const secondaryVendorId = await allocateSecondaryVendorId(connection, vendorTypeId, acquiredBy);
    const createdBy = typeof payload.created_by === 'string' ? payload.created_by : null;
    const assignedDate = salesRepId
      ? (typeof payload.assigned_date === 'string' && payload.assigned_date !== '' ? payload.assigned_date : nowDate)
      : null;
    const assignedBy = salesRepId
      ? (typeof payload.assigned_by === 'string' ? payload.assigned_by : null)
      : null;

    await vendorRepository.create({
      vendor_id: vendorId,
      secondary_vendor_id: secondaryVendorId,
      vendor_name: String(payload.vendor_name),
      phone: String(payload.phone),
      location: String(payload.location),
      sales_rep_id: salesRepId ?? undefined,
      acquired_by: acquiredBy ?? undefined,
      vendor_type_id: vendorTypeId,
      assigned_date: assignedDate ?? undefined,
      assigned_by: assignedBy ?? undefined,
      status,
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

      await vendorInventoryRepository.create({
        vendor_inventory_id: generateVendorInventoryId(),
        vendor_id: vendorId,
        product_id: product.product_id,
        current_stock: 0,
        total_stock_received: 0,
        total_stock_sold: 0,
        created_at: nowDate,
        updated_at: nowDateTime,
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

export async function updateVendor(
  vendorId: string,
  payload: Record<string, unknown>,
): Promise<Vendor & { secondary_vendor_id_assignment_issue?: string }> {
  const updates: Record<string, unknown> = {};

  if (payload.vendor_name !== undefined) updates.vendor_name = String(payload.vendor_name);
  if (payload.phone !== undefined) updates.phone = String(payload.phone);
  if (payload.location !== undefined) updates.location = String(payload.location);
  if (payload.sales_rep_id !== undefined) {
    updates.sales_rep_id = payload.sales_rep_id === null || payload.sales_rep_id === ''
      ? null
      : String(payload.sales_rep_id);
  }
  if (payload.acquired_by !== undefined) {
    updates.acquired_by = payload.acquired_by === null || payload.acquired_by === ''
      ? null
      : String(payload.acquired_by);
  }
  if (payload.vendor_type_id !== undefined) {
    updates.vendor_type_id = payload.vendor_type_id === null || payload.vendor_type_id === '' ? null : String(payload.vendor_type_id);
  }
  if (payload.status !== undefined) updates.status = String(payload.status);

  updates.last_updated = new Date().toISOString().slice(0, 19).replace('T', ' ');
  if (payload.updated_by !== undefined) {
    updates.updated_by = payload.updated_by === null ? null : String(payload.updated_by);
  }

  return transaction(async (connection) => {
    const [currentRows] = await connection.execute(
      'SELECT vendor_type_id, acquired_by, secondary_vendor_id FROM vendors WHERE vendor_id = ? FOR UPDATE',
      [vendorId],
    );
    const current = (currentRows as any[])[0];
    if (!current) throw new NotFoundError('Vendor', vendorId);

    if (updates.sales_rep_id !== undefined && updates.sales_rep_id !== null) {
      const [salesRepRows] = await connection.execute(
        'SELECT sales_rep_id FROM sales_reps WHERE sales_rep_id = ? LIMIT 1',
        [String(updates.sales_rep_id)],
      );
      if ((salesRepRows as unknown[]).length === 0) throw new ValidationError('Invalid sales_rep_id.');
    }

    if (updates.acquired_by !== undefined && updates.acquired_by !== null) {
      const [nameRows] = await connection.execute(
        'SELECT acquired_by_id, is_active FROM acquired_by_names WHERE acquired_by_id = ? LIMIT 1',
        [String(updates.acquired_by)],
      );
      if ((nameRows as any[]).length === 0 || !Boolean((nameRows as any[])[0].is_active)) {
        const isExistingAssignment = current.acquired_by === updates.acquired_by;
        if (!isExistingAssignment) throw new ValidationError('This Acquired By name is not available for selection.');
      }
    }

    if (updates.vendor_type_id !== undefined && updates.vendor_type_id !== null) {
      const [typeRows] = await connection.execute(
        'SELECT vendor_type_id FROM vendor_types WHERE vendor_type_id = ? AND is_active = 1 LIMIT 1',
        [String(updates.vendor_type_id)],
      );
      if ((typeRows as unknown[]).length === 0) throw new ValidationError('Invalid vendor type.');
    }

    if (updates.status !== undefined) {
      const [statusRows] = await connection.execute(
        'SELECT status_id FROM vendor_statuses WHERE status_id = ? AND is_active = 1 LIMIT 1',
        [String(updates.status)],
      );
      if ((statusRows as unknown[]).length === 0) throw new ValidationError('Invalid vendor status.');
    }

    const vendorRepository = new VendorRepository(connection);
    await vendorRepository.update(vendorId, updates as any);

    let assignmentIssue: string | undefined;
    if (current.secondary_vendor_id === null || current.secondary_vendor_id === undefined) {
      const vendorTypeId = updates.vendor_type_id === undefined ? current.vendor_type_id : updates.vendor_type_id;
      const acquiredById = updates.acquired_by === undefined ? current.acquired_by : updates.acquired_by;
      const { prefix, issue } = await getSecondaryVendorIdPrefix(connection, vendorTypeId, acquiredById);
      if (prefix) {
        let sequence: number;
        try {
          sequence = await allocateSecondaryVendorSequence(connection, prefix);
        } catch (error) {
          if (error instanceof Error && error.message.includes('sequence exhausted')) throw new ValidationError(error.message);
          throw error;
        }
        const assigned = await vendorRepository.assignSecondaryVendorIdIfNull(
          vendorId,
          formatSecondaryVendorId(prefix, sequence),
        );
        if (!assigned) throw new Error('Secondary vendor ID assignment changed unexpectedly; update was rolled back.');
      } else {
        assignmentIssue = issue;
      }
    }

    const updated = await vendorRepository.findById(vendorId);
    return assignmentIssue ? { ...updated, secondary_vendor_id_assignment_issue: assignmentIssue } : updated;
  });
}
