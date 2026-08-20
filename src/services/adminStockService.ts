import { randomUUID } from 'crypto';
import { getPool, transaction } from '@/lib/db';
import type { Inventory, VendorInventory, VendorBalance, VisitResult } from '@/lib/types';
import { InventoryRepository } from '@/repositories/InventoryRepository';
import { VendorInventoryRepository } from '@/repositories/VendorInventoryRepository';
import { VendorBalanceRepository } from '@/repositories/VendorBalanceRepository';
import { VisitRepository } from '@/repositories/VisitRepository';
import { AdminStockMovementRepository } from '@/repositories/AdminStockMovementRepository';
import { TransactionJournalRepository } from '@/repositories/TransactionJournalRepository';
import { ConflictError, NotFoundError, ServiceError, ValidationError } from './errors';

function generateId(prefix: string): string {
  return `${prefix}_${randomUUID().replace(/-/g, '').slice(0, 12)}`;
}

function formatDateTime(date: Date): string {
  return date.toISOString().slice(0, 19).replace('T', ' ');
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
  return value.trim();
}

function validateQuantity(value: unknown): number {
  const quantity = typeof value === 'number' ? value : typeof value === 'string' && value.trim() !== '' ? Number(value) : NaN;
  if (!Number.isFinite(quantity)) {
    throw new ValidationError('quantity must be a number.');
  }
  if (quantity <= 0) {
    throw new ValidationError('quantity must be greater than zero.');
  }
  return quantity;
}

function validateOperationId(value: unknown): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new ValidationError('operation_id is required.');
  }
  return value.trim();
}

async function createInventoryIfMissing(
  connection: any,
  inventoryRepo: InventoryRepository,
  vendorId: string,
  productId: string,
): Promise<Inventory> {
  const [rows] = await connection.execute(
    'SELECT * FROM inventory WHERE vendor_id = ? AND product_id = ? LIMIT 1 FOR UPDATE',
    [vendorId, productId]
  );
  let inventory = rows[0];
  if (!inventory) {
    inventory = await inventoryRepo.create({
      inventory_id: generateId('I'),
      vendor_id: vendorId,
      product_id: productId,
      total_stock_supplied: 0,
      total_stock_sold: 0,
      current_stock: 0,
      date_created: new Date().toISOString().slice(0, 10),
      last_updated: formatDateTime(new Date()),
    });
  }
  return inventory;
}

async function createVendorInventoryIfMissing(
  connection: any,
  vendorInventoryRepo: VendorInventoryRepository,
  vendorId: string,
  productId: string,
): Promise<VendorInventory> {
  const [rows] = await connection.execute(
    'SELECT * FROM vendor_inventory WHERE vendor_id = ? AND product_id = ? LIMIT 1 FOR UPDATE',
    [vendorId, productId]
  );
  let vendorInventory = rows[0];
  if (!vendorInventory) {
    vendorInventory = await vendorInventoryRepo.create({
      vendor_inventory_id: generateId('VI'),
      vendor_id: vendorId,
      product_id: productId,
      current_stock: 0,
      total_stock_received: 0,
      total_stock_sold: 0,
      created_at: new Date().toISOString().slice(0, 10),
      updated_at: formatDateTime(new Date()),
    });
  }
  return vendorInventory;
}

function isDuplicateEntry(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && (error as { code?: string }).code === 'ER_DUP_ENTRY');
}

export interface ReverseVisitPayload {
  visit_id: string;
  reason: string;
  operation_id?: string;
}

export interface TransferStockPayload {
  source_vendor_id: string;
  destination_vendor_id: string;
  product_id: string;
  quantity: number;
  notes?: string;
  operation_id?: string;
  admin_id?: string;
}

export interface RetrieveStockPayload {
  vendor_id: string;
  product_id: string;
  quantity: number;
  notes?: string;
  operation_id?: string;
  admin_id?: string;
}

export async function reverseVisit(payload: ReverseVisitPayload, adminId: string) {
  const visitId = validateString(payload.visit_id, 'visit_id', true)!;
  const reason = validateString(payload.reason, 'reason', true)!;
  const operationId = validateString(payload.operation_id, 'operation_id') ?? `REV_${randomUUID().replace(/-/g, '').slice(0, 16)}`;
  const transactionId = generateId('T');
  const now = formatDateTime(new Date());

  const existingVisitRow = await getPool().query<any[]>(
    'SELECT * FROM visit_logs WHERE reversal_operation_id = ? LIMIT 1',
    [operationId]
  );
  if (existingVisitRow[0]?.length > 0) {
    const existing = existingVisitRow[0][0];
    return {
      visitLog: existing,
      inventory: null,
      vendorInventory: null,
      vendorBalance: null,
    } as unknown as VisitResult;
  }

  return transaction(async (connection) => {
    const visitRepo = new VisitRepository(connection);
    const inventoryRepo = new InventoryRepository(connection);
    const vendorInventoryRepo = new VendorInventoryRepository(connection);
    const vendorBalanceRepo = new VendorBalanceRepository(connection);
    const journalRepo = new TransactionJournalRepository(connection);

    const visit = await visitRepo.findById(visitId);
    if (visit.is_reversed) {
      throw new ConflictError('Visit has already been reversed.');
    }

    const [inventoryRows] = (await connection.execute(
      'SELECT * FROM inventory WHERE vendor_id = ? AND product_id = ? LIMIT 1 FOR UPDATE',
      [visit.vendor_id, visit.product_id]
    )) as [any[], unknown];
    if (inventoryRows.length === 0) {
      throw new ServiceError('Inventory row missing for visit reversal.');
    }
    const inventory = inventoryRows[0] as Inventory;

    const [vendorInventoryRows] = (await connection.execute(
      'SELECT * FROM vendor_inventory WHERE vendor_id = ? AND product_id = ? LIMIT 1 FOR UPDATE',
      [visit.vendor_id, visit.product_id]
    )) as [any[], unknown];
    if (vendorInventoryRows.length === 0) {
      throw new ServiceError('Vendor inventory row missing for visit reversal.');
    }
    const vendorInventory = vendorInventoryRows[0] as VendorInventory;

    const [balanceRows] = (await connection.execute(
      'SELECT * FROM vendor_balances WHERE vendor_id = ? LIMIT 1 FOR UPDATE',
      [visit.vendor_id]
    )) as [any[], unknown];
    if (balanceRows.length === 0) {
      throw new ServiceError('Vendor balance row missing for visit reversal.');
    }
    const vendorBalance = balanceRows[0] as VendorBalance;

    const updatedInventoryCurrent = Number(inventory.current_stock) - Number(visit.stock_added) + Number(visit.stock_sold);
    const updatedVendorInventoryCurrent = Number(vendorInventory.current_stock) - Number(visit.stock_added) + Number(visit.stock_sold);
    const updatedTotalReceived = Number(vendorInventory.total_stock_received) - Number(visit.stock_added);
    const updatedTotalSold = Number(vendorInventory.total_stock_sold) - Number(visit.stock_sold);
    const updatedTotalStockSupplied = Number(inventory.total_stock_supplied) - Number(visit.stock_added);
    const updatedTotalStockSold = Number(inventory.total_stock_sold) - Number(visit.stock_sold);
    const updatedCashCollected = Number(vendorBalance.cash_collected) - Number(visit.cash_collected);
    const updatedExpectedCash = Number(vendorBalance.total_expected_cash) - Number(visit.expected_cash);

    if (updatedInventoryCurrent < 0 || updatedVendorInventoryCurrent < 0) {
      throw new ValidationError('Reversing this visit would result in negative stock balances.');
    }
    if (updatedTotalReceived < 0 || updatedTotalSold < 0 || updatedTotalStockSupplied < 0 || updatedTotalStockSold < 0 || updatedCashCollected < 0 || updatedExpectedCash < 0) {
      throw new ValidationError('Reversing this visit would produce invalid cumulative totals.');
    }

    await journalRepo.create({
      transaction_id: transactionId,
      timestamp: now,
      endpoint: '/visit/reverse',
      stage: 'begin',
      status: 'pending',
      payload: { visit_id: visitId, reason, operation_id: operationId },
      completed: false,
      actor: null,
      error_message: null,
      duration_ms: 0,
    });

    await inventoryRepo.update(inventory.inventory_id, {
      total_stock_supplied: updatedTotalStockSupplied,
      total_stock_sold: updatedTotalStockSold,
      current_stock: updatedInventoryCurrent,
    });

    await vendorInventoryRepo.update(vendorInventory.vendor_inventory_id, {
      current_stock: updatedVendorInventoryCurrent,
      total_stock_received: updatedTotalReceived,
      total_stock_sold: updatedTotalSold,
    });

    await vendorBalanceRepo.update(visit.vendor_id, {
      total_expected_cash: updatedExpectedCash,
      cash_collected: updatedCashCollected,
      balance_owed: updatedExpectedCash - updatedCashCollected,
    });

    await connection.execute(
      `UPDATE visit_logs
       SET is_reversed = TRUE,
           reversed_at = ?,
           reversed_by = ?,
           reversal_reason = ?,
           reversal_operation_id = ?
       WHERE visit_id = ?`,
      [now, adminId, reason, operationId, visitId]
    );

    const adminStockRepo = new AdminStockMovementRepository(connection);
    const reversalQuantity = Math.abs(Number(visit.stock_sold ?? 0) - Number(visit.stock_added ?? 0));
    await adminStockRepo.create({
      admin_stock_movement_id: generateId('ASM'),
      operation_id: operationId,
      movement_type: 'retrieval',
      product_id: visit.product_id,
      source_vendor_id: visit.vendor_id,
      destination_vendor_id: null,
      quantity: reversalQuantity,
      admin_id: adminId,
      timestamp: now,
      notes: reason ?? null,
    });

    await journalRepo.create({
      transaction_id: transactionId,
      timestamp: now,
      endpoint: '/visit/reverse',
      stage: 'complete',
      status: 'success',
      payload: { visit_id: visitId, reason, operation_id: operationId },
      completed: true,
      actor: null,
      error_message: null,
      duration_ms: 0,
    });

    const updatedVisit = await visitRepo.findById(visitId);
    const refreshedInventory = await inventoryRepo.findById(inventory.inventory_id);
    const refreshedVendorInventory = await vendorInventoryRepo.findById(vendorInventory.vendor_inventory_id);
    const refreshedBalance = await vendorBalanceRepo.findById(visit.vendor_id);

    return {
      visitLog: updatedVisit as unknown as Record<string, unknown>,
      inventory: refreshedInventory,
      vendorInventory: refreshedVendorInventory,
      vendorBalance: refreshedBalance,
    } as VisitResult;
  });
}

export async function transferStock(payload: TransferStockPayload) {
  const sourceVendorId = validateString(payload.source_vendor_id, 'source_vendor_id', true)!;
  const destinationVendorId = validateString(payload.destination_vendor_id, 'destination_vendor_id', true)!;
  const productId = validateString(payload.product_id, 'product_id', true)!;
  const quantity = validateQuantity(payload.quantity);
  const notes = validateString(payload.notes, 'notes');
  const operationId = validateString(payload.operation_id, 'operation_id') ?? `ASM_${randomUUID().replace(/-/g, '').slice(0, 16)}`;
  const adminId = validateString(payload.admin_id, 'admin_id', true)!;
  const transactionId = generateId('T');
  const now = formatDateTime(new Date());

  if (sourceVendorId === destinationVendorId) {
    throw new ValidationError('source_vendor_id and destination_vendor_id must differ.');
  }

  const existingMovement = await getPool().query<any[]>(
    'SELECT * FROM admin_stock_movements WHERE operation_id = ? LIMIT 1',
    [operationId]
  );
  if (existingMovement[0]?.length > 0) {
    return existingMovement[0][0];
  }

  return transaction(async (connection) => {
    const journalRepo = new TransactionJournalRepository(connection);
    const adminStockRepo = new AdminStockMovementRepository(connection);
    const inventoryRepo = new InventoryRepository(connection);
    const vendorInventoryRepo = new VendorInventoryRepository(connection);

    await journalRepo.create({
      transaction_id: transactionId,
      timestamp: now,
      endpoint: '/admin-stock',
      stage: 'begin_transfer',
      status: 'pending',
      payload: { sourceVendorId, destinationVendorId, productId, quantity, operationId, notes },
      completed: false,
      actor: null,
      error_message: null,
      duration_ms: 0,
    });

    const [[sourceVendor]] = (await connection.execute(
      'SELECT vendor_id FROM vendors WHERE vendor_id = ? LIMIT 1',
      [sourceVendorId]
    )) as [any[], unknown];
    if (!sourceVendor) {
      throw new NotFoundError('Source vendor', sourceVendorId);
    }
    const [[destinationVendor]] = (await connection.execute(
      'SELECT vendor_id FROM vendors WHERE vendor_id = ? LIMIT 1',
      [destinationVendorId]
    )) as [any[], unknown];
    if (!destinationVendor) {
      throw new NotFoundError('Destination vendor', destinationVendorId);
    }

    const [sourceInventoryRows] = (await connection.execute(
      'SELECT * FROM inventory WHERE vendor_id = ? AND product_id = ? LIMIT 1 FOR UPDATE',
      [sourceVendorId, productId]
    )) as [any[], unknown];
    if (sourceInventoryRows.length === 0) {
      throw new ServiceError('Source inventory not found.');
    }
    const sourceInventory = sourceInventoryRows[0] as Inventory;

    const [sourceVendorInventoryRows] = (await connection.execute(
      'SELECT * FROM vendor_inventory WHERE vendor_id = ? AND product_id = ? LIMIT 1 FOR UPDATE',
      [sourceVendorId, productId]
    )) as [any[], unknown];
    if (sourceVendorInventoryRows.length === 0) {
      throw new ServiceError('Source vendor inventory not found.');
    }
    const sourceVendorInventory = sourceVendorInventoryRows[0] as VendorInventory;

    if (Number(sourceInventory.current_stock) < quantity || Number(sourceVendorInventory.current_stock) < quantity) {
      throw new ValidationError('Source vendor does not have enough stock for transfer.');
    }

    const [destinationInventoryRows] = (await connection.execute(
      'SELECT * FROM inventory WHERE vendor_id = ? AND product_id = ? LIMIT 1 FOR UPDATE',
      [destinationVendorId, productId]
    )) as [any[], unknown];
    let destinationInventory = destinationInventoryRows[0] as Inventory | undefined;
    if (!destinationInventory) {
      destinationInventory = await createInventoryIfMissing(connection, inventoryRepo, destinationVendorId, productId);
    }

    const [destinationVendorInventoryRows] = (await connection.execute(
      'SELECT * FROM vendor_inventory WHERE vendor_id = ? AND product_id = ? LIMIT 1 FOR UPDATE',
      [destinationVendorId, productId]
    )) as [any[], unknown];
    let destinationVendorInventory = destinationVendorInventoryRows[0] as VendorInventory | undefined;
    if (!destinationVendorInventory) {
      destinationVendorInventory = await createVendorInventoryIfMissing(connection, vendorInventoryRepo, destinationVendorId, productId);
    }

    const updatedSourceInventory = await inventoryRepo.update(sourceInventory.inventory_id, {
      current_stock: Number(sourceInventory.current_stock) - quantity,
    });
    const updatedSourceVendorInventory = await vendorInventoryRepo.update(sourceVendorInventory.vendor_inventory_id, {
      current_stock: Number(sourceVendorInventory.current_stock) - quantity,
    });
    const updatedDestinationInventory = await inventoryRepo.update(destinationInventory.inventory_id, {
      current_stock: Number(destinationInventory.current_stock) + quantity,
    });
    const updatedDestinationVendorInventory = await vendorInventoryRepo.update(destinationVendorInventory.vendor_inventory_id, {
      current_stock: Number(destinationVendorInventory.current_stock) + quantity,
    });

    const movement = await adminStockRepo.create({
      admin_stock_movement_id: generateId('ASM'),
      operation_id: operationId,
      movement_type: 'transfer',
      product_id: productId,
      source_vendor_id: sourceVendorId,
      destination_vendor_id: destinationVendorId,
      quantity,
      admin_id: adminId,
      timestamp: now,
      notes: notes ?? null,
    });

    await journalRepo.create({
      transaction_id: transactionId,
      timestamp: now,
      endpoint: '/admin-stock',
      stage: 'complete_transfer',
      status: 'success',
      payload: { movement, sourceInventory: updatedSourceInventory, destinationInventory: updatedDestinationInventory },
      completed: true,
      actor: null,
      error_message: null,
      duration_ms: 0,
    });

    return {
      movement,
      sourceInventory: updatedSourceInventory,
      destinationInventory: updatedDestinationInventory,
      sourceVendorInventory: updatedSourceVendorInventory,
      destinationVendorInventory: updatedDestinationVendorInventory,
    };
  });
}

export async function retrieveStock(payload: RetrieveStockPayload) {
  const vendorId = validateString(payload.vendor_id, 'vendor_id', true)!;
  const productId = validateString(payload.product_id, 'product_id', true)!;
  const quantity = validateQuantity(payload.quantity);
  const notes = validateString(payload.notes, 'notes');
  const operationId = validateString(payload.operation_id, 'operation_id') ?? `ASM_${randomUUID().replace(/-/g, '').slice(0, 16)}`;
  const adminId = validateString(payload.admin_id, 'admin_id', true)!;
  const transactionId = generateId('T');
  const now = formatDateTime(new Date());

  const existingMovement = await getPool().query<any[]>(
    'SELECT * FROM admin_stock_movements WHERE operation_id = ? LIMIT 1',
    [operationId]
  );
  if (existingMovement[0]?.length > 0) {
    return existingMovement[0][0];
  }

  return transaction(async (connection) => {
    const journalRepo = new TransactionJournalRepository(connection);
    const adminStockRepo = new AdminStockMovementRepository(connection);
    const inventoryRepo = new InventoryRepository(connection);
    const vendorInventoryRepo = new VendorInventoryRepository(connection);

    await journalRepo.create({
      transaction_id: transactionId,
      timestamp: now,
      endpoint: '/admin-stock',
      stage: 'begin_retrieval',
      status: 'pending',
      payload: { vendorId, productId, quantity, operationId, notes },
      completed: false,
      actor: null,
      error_message: null,
      duration_ms: 0,
    });

    const [[vendor]] = (await connection.execute(
      'SELECT vendor_id FROM vendors WHERE vendor_id = ? LIMIT 1',
      [vendorId]
    )) as [any[], unknown];
    if (!vendor) {
      throw new NotFoundError('Vendor', vendorId);
    }

    const [inventoryRows] = (await connection.execute(
      'SELECT * FROM inventory WHERE vendor_id = ? AND product_id = ? LIMIT 1 FOR UPDATE',
      [vendorId, productId]
    )) as [any[], unknown];
    if (inventoryRows.length === 0) {
      throw new ServiceError('Inventory not found for vendor.');
    }
    const inventory = inventoryRows[0] as Inventory;

    const [vendorInventoryRows] = (await connection.execute(
      'SELECT * FROM vendor_inventory WHERE vendor_id = ? AND product_id = ? LIMIT 1 FOR UPDATE',
      [vendorId, productId]
    )) as [any[], unknown];
    if (vendorInventoryRows.length === 0) {
      throw new ServiceError('Vendor inventory not found.');
    }
    const vendorInventory = vendorInventoryRows[0] as VendorInventory;

    if (Number(inventory.current_stock) < quantity || Number(vendorInventory.current_stock) < quantity) {
      throw new ValidationError('Vendor does not have enough stock to retrieve.');
    }

    const updatedInventory = await inventoryRepo.update(inventory.inventory_id, {
      current_stock: Number(inventory.current_stock) - quantity,
    });
    const updatedVendorInventory = await vendorInventoryRepo.update(vendorInventory.vendor_inventory_id, {
      current_stock: Number(vendorInventory.current_stock) - quantity,
    });

    const movement = await adminStockRepo.create({
      admin_stock_movement_id: generateId('ASM'),
      operation_id: operationId,
      movement_type: 'retrieval',
      product_id: productId,
      source_vendor_id: vendorId,
      destination_vendor_id: null,
      quantity,
      admin_id: adminId,
      timestamp: now,
      notes: notes ?? null,
    });

    await journalRepo.create({
      transaction_id: transactionId,
      timestamp: now,
      endpoint: '/admin-stock',
      stage: 'complete_retrieval',
      status: 'success',
      payload: { movement, inventory: updatedInventory },
      completed: true,
      actor: null,
      error_message: null,
      duration_ms: 0,
    });

    return { movement, inventory: updatedInventory, vendorInventory: updatedVendorInventory };
  });
}
