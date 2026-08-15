import { randomUUID } from 'crypto';
import { getPool, transaction } from '@/lib/db';
import type { Inventory, VendorInventory } from '@/lib/types';
import { InventoryRepository } from '@/repositories/InventoryRepository';
import { VendorInventoryRepository } from '@/repositories/VendorInventoryRepository';
import { TransactionJournalRepository } from '@/repositories/TransactionJournalRepository';
import { VisitRepository, type VisitLogRecord } from '@/repositories/VisitRepository';
import { ConflictError, NotFoundError, ServiceError, ValidationError } from './errors';

export interface CreateSupplyPayload {
  vendor_id: string;
  product_id: string;
  quantity: number | string;
  date?: string;
  notes?: string;
  sales_rep_id?: string;
  payment_reference?: string;
  client_transaction_id: string;
  actor_role?: string;
  actor_sales_rep_id?: string;
}

export interface SupplyResult {
  supplyLog: VisitLogRecord;
  inventory: Inventory;
  vendorInventory: VendorInventory;
}

function generateId(prefix: string): string {
  return `${prefix}_${randomUUID().replace(/-/g, '').slice(0, 12)}`;
}

function toDateString(value: string | undefined): string {
  if (!value) {
    return new Date().toISOString().slice(0, 10);
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new ValidationError('date must be a valid ISO date or datetime string.');
  }
  return parsed.toISOString().slice(0, 10);
}

function validateString(value: unknown, fieldName: string, required = false): string | undefined {
  if (value === undefined || value === null || value === '') {
    if (required) {
      throw new ValidationError(`${fieldName} is required.`);
    }
    return undefined;
  }
  if (typeof value !== 'string') {
    throw new ValidationError(`${fieldName} must be a string.`);
  }
  return value;
}

function validateQuantity(value: unknown): number {
  const quantity = typeof value === 'number' ? value : typeof value === 'string' && value.trim() !== '' ? Number(value) : NaN;
  if (!Number.isFinite(quantity)) {
    throw new ValidationError('quantity must be a number.');
  }
  if (quantity <= 0) {
    throw new ValidationError('Quantity must be greater than zero.');
  }
  return quantity;
}

function validateClientTransactionId(value: unknown): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new ValidationError('client_transaction_id is required.');
  }
  return value.trim();
}

function isDuplicateEntry(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && (error as { code?: string }).code === 'ER_DUP_ENTRY');
}

async function getExistingSupplyResult(clientTransactionId: string): Promise<SupplyResult> {
  const [rows] = await getPool().query<any[]>(
    'SELECT * FROM visit_logs WHERE client_transaction_id = ? LIMIT 1',
    [clientTransactionId],
  );
  const existing = rows[0];
  if (!existing) {
    throw new ConflictError('A supply request with this client_transaction_id is already being processed.');
  }
  if (existing.payment_method !== 'supply') {
    throw new ConflictError('client_transaction_id is already used by another operation.');
  }

  const [inventoryRows] = await getPool().query<any[]>(
    'SELECT * FROM inventory WHERE vendor_id = ? AND product_id = ? LIMIT 1',
    [existing.vendor_id, existing.product_id],
  );
  const [vendorInventoryRows] = await getPool().query<any[]>(
    'SELECT * FROM vendor_inventory WHERE vendor_id = ? AND product_id = ? LIMIT 1',
    [existing.vendor_id, existing.product_id],
  );
  if (!inventoryRows[0] || !vendorInventoryRows[0]) {
    throw new ServiceError('Existing Supply VisitLog is missing related inventory state.');
  }
  return { supplyLog: existing, inventory: inventoryRows[0], vendorInventory: vendorInventoryRows[0] };
}

export async function createSupply(payload: CreateSupplyPayload): Promise<SupplyResult> {
  const vendorId = validateString(payload.vendor_id, 'vendor_id', true)!;
  const productId = validateString(payload.product_id, 'product_id', true)!;
  const quantity = validateQuantity(payload.quantity);
  const date = toDateString(payload.date);
  const notes = validateString(payload.notes, 'notes');
  const salesRepId = validateString(payload.sales_rep_id, 'sales_rep_id');
  const paymentReference = validateString(payload.payment_reference, 'payment_reference') ?? '';
  const clientTransactionId = validateClientTransactionId(payload.client_transaction_id);
  const actor = payload.actor_role ? String(payload.actor_role) : undefined;
  const transactionId = generateId('T');
  const now = new Date().toISOString();
  const journalPayload = { ...payload, client_transaction_id: clientTransactionId };

  try {
    return await transaction(async (connection) => {
      const journalRepo = new TransactionJournalRepository(connection);
      const inventoryRepo = new InventoryRepository(connection);
      const vendorInventoryRepo = new VendorInventoryRepository(connection);
      const visitRepo = new VisitRepository(connection);

      const journal = async (stage: string, status: 'pending' | 'success' | 'failure', completed = false, errorMessage: string | null = null) => {
        await journalRepo.create({
          transaction_id: transactionId,
          timestamp: new Date().toISOString(),
          endpoint: '/supply',
          stage,
          status,
          payload: journalPayload,
          completed,
          actor,
          error_message: errorMessage,
          duration_ms: 0,
        });
      };

      await journal('begin', 'pending');

      if (clientTransactionId) {
        const [existingRows] = await connection.execute<any[]>(
          'SELECT * FROM visit_logs WHERE client_transaction_id = ? LIMIT 1 FOR UPDATE',
          [clientTransactionId],
        );
        if (existingRows[0]) {
          if (existingRows[0].payment_method !== 'supply') {
            throw new ConflictError('client_transaction_id is already used by another operation.');
          }
          const inventoryRows = await inventoryRepo.search({ vendor_id: existingRows[0].vendor_id, product_id: existingRows[0].product_id });
          const vendorInventoryRows = await vendorInventoryRepo.search({ vendor_id: existingRows[0].vendor_id, product_id: existingRows[0].product_id });
          if (!inventoryRows[0] || !vendorInventoryRows[0]) {
            throw new ServiceError('Existing Supply VisitLog is missing related inventory state.');
          }
          await journal('duplicate_return', 'success', true);
          return { supplyLog: existingRows[0], inventory: inventoryRows[0], vendorInventory: vendorInventoryRows[0] };
        }
      }

      const [vendorRows] = await connection.execute<any[]>(
        'SELECT vendor_id FROM vendors WHERE vendor_id = ? LIMIT 1',
        [vendorId],
      );
      if (vendorRows.length === 0) {
        throw new NotFoundError('Vendor', vendorId);
      }

      const [productRows] = await connection.execute<any[]>(
        'SELECT product_id FROM products WHERE product_id = ? LIMIT 1',
        [productId],
      );
      if (productRows.length === 0) {
        throw new NotFoundError('Product', productId);
      }

      if (salesRepId) {
        const [salesRepRows] = await connection.execute<any[]>(
          'SELECT sales_rep_id FROM sales_reps WHERE sales_rep_id = ? LIMIT 1',
          [salesRepId],
        );
        if (salesRepRows.length === 0) {
          throw new ValidationError('Invalid sales_rep_id.');
        }
      }

      const [inventoryRows] = await connection.execute<any[]>(
        'SELECT * FROM inventory WHERE vendor_id = ? AND product_id = ? LIMIT 1 FOR UPDATE',
        [vendorId, productId],
      );
      const inventory = inventoryRows[0];
      if (!inventory) {
        throw new ServiceError('Inventory row missing for vendor/product.', 500, 'INVENTORY_MISSING');
      }

      const [vendorInventoryRows] = await connection.execute<any[]>(
        'SELECT * FROM vendor_inventory WHERE vendor_id = ? AND product_id = ? LIMIT 1 FOR UPDATE',
        [vendorId, productId],
      );
      const vendorInventory = vendorInventoryRows[0];
      if (!vendorInventory) {
        throw new ServiceError('VendorInventory row missing after migration. Data integrity error.', 500, 'VENDOR_INVENTORY_MISSING');
      }

      await journal('inventory', 'pending');
      const updatedInventory = await inventoryRepo.update(inventory.inventory_id, {
        total_stock_supplied: Number(inventory.total_stock_supplied) + quantity,
        current_stock: Number(inventory.current_stock) + quantity,
      });
      await journal('inventory', 'success');

      await journal('vendor_inventory', 'pending');
      const updatedVendorInventory = await vendorInventoryRepo.update(vendorInventory.vendor_inventory_id, {
        current_stock: Number(vendorInventory.current_stock) + quantity,
        total_stock_received: Number(vendorInventory.total_stock_received) + quantity,
      });
      await journal('vendor_inventory', 'success');

      const supplyLog = await visitRepo.create({
        visit_id: generateId('VL'),
        timestamp: now,
        date,
        vendor_id: vendorId,
        product_id: productId,
        sales_rep_id: salesRepId ?? null,
        opening_stock: Number(vendorInventory.current_stock),
        stock_sold: 0,
        stock_added: quantity,
        cash_collected: 0,
        expected_cash: 0,
        unit_price: 0,
        closing_stock: Number(vendorInventory.current_stock) + quantity,
        payment_method: 'supply',
        payment_reference: paymentReference,
        client_transaction_id: clientTransactionId,
        notes: notes ?? '',
        date_created: now,
        last_updated: now,
      });
      await journal('visit_append', 'success');
      await journal('complete', 'success', true);

      return { supplyLog, inventory: updatedInventory, vendorInventory: updatedVendorInventory };
    });
  } catch (error) {
    if (clientTransactionId && isDuplicateEntry(error)) {
      return getExistingSupplyResult(clientTransactionId);
    }
    try {
      await new TransactionJournalRepository(getPool()).create({
        transaction_id: transactionId,
        timestamp: new Date().toISOString(),
        endpoint: '/supply',
        stage: 'failure',
        status: 'failure',
        payload: { error: error instanceof Error ? error.message : String(error) },
        completed: false,
        actor,
        error_message: error instanceof Error ? error.message : String(error),
        duration_ms: 0,
      });
    } catch {}
    throw error;
  }
}
