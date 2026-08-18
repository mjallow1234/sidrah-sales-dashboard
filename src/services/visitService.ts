import { randomUUID } from 'crypto';
import { getPool, transaction } from '@/lib/db';
import type { VisitResult, Inventory, VendorInventory, VendorBalance } from '@/lib/types';
import { InventoryRepository } from '@/repositories/InventoryRepository';
import { VendorInventoryRepository } from '@/repositories/VendorInventoryRepository';
import { VendorBalanceRepository } from '@/repositories/VendorBalanceRepository';
import { VisitRepository } from '@/repositories/VisitRepository';
import { TransactionJournalRepository } from '@/repositories/TransactionJournalRepository';
import { OperationIdempotencyRepository } from '@/repositories/OperationIdempotencyRepository';

export interface CreateVisitPayload {
  vendor_id: string;
  product_id: string;
  sales_rep_id: string;
  stock_sold: number;
  stock_added: number;
  cash_collected: number;
  unit_price: number;
  payment_method: string;
  payment_reference?: string;
  client_transaction_id: string;
  latitude?: number | null;
  longitude?: number | null;
  notes?: string;
  actor_role?: string;
  actor_sales_rep_id?: string;
}

class HttpError extends Error {
  public readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function toNumber(value: unknown): number {
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }
  throw new HttpError(400, 'Invalid numeric value.');
}

function isNonNegativeNumber(value: unknown): boolean {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function getDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function getDateTimeString(date: Date): string {
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

function generateId(prefix: string): string {
  const randomPart = randomUUID().replace(/-/g, '').slice(0, 12);
  return `${prefix}_${randomPart}`;
}

function validateRequiredString(value: unknown, fieldName: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new HttpError(400, `${fieldName} is required.`);
  }
  return value.trim();
}

function validateClientTransactionId(value: unknown): string {
  return validateRequiredString(value, 'client_transaction_id');
}

function isDuplicateEntry(error: unknown): boolean {
  return Boolean(error && typeof error === 'object' && (error as { code?: string }).code === 'ER_DUP_ENTRY');
}

async function getExistingVisitResult(clientTransactionId: string): Promise<VisitResult> {
  const [visitRows] = await getPool().query<any[]>(
    'SELECT * FROM visit_logs WHERE client_transaction_id = ? LIMIT 1',
    [clientTransactionId],
  );
  const existingVisit = visitRows[0];
  if (!existingVisit) {
    throw new HttpError(409, 'A visit with this client_transaction_id is already being processed.');
  }

  const [inventoryRows] = await getPool().query<any[]>(
    'SELECT * FROM inventory WHERE vendor_id = ? AND product_id = ? LIMIT 1',
    [existingVisit.vendor_id, existingVisit.product_id],
  );
  const [vendorInventoryRows] = await getPool().query<any[]>(
    'SELECT * FROM vendor_inventory WHERE vendor_id = ? AND product_id = ? LIMIT 1',
    [existingVisit.vendor_id, existingVisit.product_id],
  );
  const [balanceRows] = await getPool().query<any[]>(
    'SELECT * FROM vendor_balances WHERE vendor_id = ? LIMIT 1',
    [existingVisit.vendor_id],
  );

  return {
    visitLog: existingVisit as Record<string, unknown>,
    inventory: inventoryRows[0] ?? null,
    vendorInventory: vendorInventoryRows[0] ?? null,
    vendorBalance: balanceRows[0] ?? null,
  } as VisitResult;
}

export async function createVisit(payload: CreateVisitPayload): Promise<VisitResult> {
  const vendorId = String(payload.vendor_id ?? '');
  const productId = String(payload.product_id ?? '');
  const salesRepId = String(payload.sales_rep_id ?? '');
  const paymentMethod = String(payload.payment_method ?? '');

  const stockSold = Number(payload.stock_sold);
  const stockAdded = Number(payload.stock_added);
  const cashCollected = Number(payload.cash_collected);
  const unitPrice = Number(payload.unit_price);

  const clientTransactionId = validateClientTransactionId(payload.client_transaction_id);
  const paymentReference = payload.payment_reference ? String(payload.payment_reference) : '';
  const notes = payload.notes ? String(payload.notes) : '';
  const latitude = payload.latitude ?? null;
  const longitude = payload.longitude ?? null;
  const actor = payload.actor_role ? String(payload.actor_role) : undefined;

  const now = new Date();
  const nowDate = getDateString(now);
  const nowDateTime = getDateTimeString(now);
  const transactionId = generateId('T');
  const journalPayload = {
    ...payload,
    client_transaction_id: clientTransactionId,
  };

  const beginJournalRepo = new TransactionJournalRepository(getPool());
  await beginJournalRepo.create({
    transaction_id: transactionId,
    timestamp: nowDateTime,
    endpoint: '/visit',
    stage: 'begin',
    status: 'pending',
    payload: journalPayload,
    completed: false,
    actor,
    error_message: null,
    duration_ms: 0,
  });

  async function createFailureJournalEntry(error: unknown): Promise<void> {
    const journalRepo = new TransactionJournalRepository(getPool());
    await journalRepo.create({
      transaction_id: transactionId,
      timestamp: getDateTimeString(new Date()),
      endpoint: '/visit',
      stage: 'failure',
      status: 'failure',
      payload: {
        error: error instanceof Error ? error.message : String(error),
      },
      completed: false,
      actor,
      error_message: null,
      duration_ms: 0,
    });
  }

  try {
    return await transaction(async (connection) => {
    const inventoryRepo = new InventoryRepository(connection);
    const vendorInventoryRepo = new VendorInventoryRepository(connection);
    const vendorBalanceRepo = new VendorBalanceRepository(connection);
    const visitRepo = new VisitRepository(connection);
    const journalRepo = new TransactionJournalRepository(connection);
    const idempotencyRepo = new OperationIdempotencyRepository(connection);

    const createJournalEntry = async (stage: string, status: 'pending' | 'success' | 'failure', completed: boolean) => {
      await journalRepo.create({
        transaction_id: transactionId,
        timestamp: nowDateTime,
        endpoint: '/visit',
        stage,
        status,
        payload: journalPayload,
        completed,
        actor,
        error_message: null,
        duration_ms: 0,
      });
    };

    await createJournalEntry('reservation', 'pending', false);
    const ownsReservation = await idempotencyRepo.claim(clientTransactionId, '/visit', transactionId);
    if (!ownsReservation) {
      const reservation = await idempotencyRepo.findByIdForUpdate(clientTransactionId);
      if (!reservation || reservation.endpoint !== '/visit') {
        throw new HttpError(409, 'A request with this client_transaction_id is already being processed.');
      }
      if (reservation.status !== 'completed' || !reservation.result_visit_id) {
        throw new HttpError(409, 'A visit with this client_transaction_id is still processing.');
      }

        await createJournalEntry('reservation', 'success', false);
        await journalRepo.create({
          transaction_id: transactionId,
          timestamp: nowDateTime,
          endpoint: '/visit',
          stage: 'duplicate_return',
          status: 'success',
          payload: journalPayload,
          completed: true,
          actor,
          error_message: null,
          duration_ms: 0,
        });

        const freshVisitRepo = new VisitRepository(getPool());
        const freshInventoryRepo = new InventoryRepository(getPool());
        const freshVendorBalanceRepo = new VendorBalanceRepository(getPool());

        const existingVisit = await freshVisitRepo.findById(reservation.result_visit_id);
        const inventoryRows = await freshInventoryRepo.search({ vendor_id: vendorId, product_id: productId });
        const [vendorInventoryRows] = await getPool().execute<any[]>(
          'SELECT * FROM vendor_inventory WHERE vendor_id = ? AND product_id = ? LIMIT 1',
          [existingVisit.vendor_id, existingVisit.product_id],
        );
        const vendorBalance = await freshVendorBalanceRepo.findById(existingVisit.vendor_id);

        return {
          visitLog: existingVisit as unknown as Record<string, unknown>,
          inventory: inventoryRows[0] ?? null,
          vendorInventory: vendorInventoryRows[0] ?? null,
          vendorBalance,
        } as unknown as VisitResult;
    }
    await createJournalEntry('reservation', 'success', false);

    const [vendorRows] = (await connection.execute(
      'SELECT COUNT(1) AS count FROM vendors WHERE vendor_id = ?',
      [vendorId]
    )) as [{ count: number }[], unknown];
    if (vendorRows.length === 0 || Number(vendorRows[0].count) === 0) {
      await journalRepo.create({
        transaction_id: transactionId,
        timestamp: nowDateTime,
        endpoint: '/visit',
        stage: 'invalid_vendor',
        status: 'failure',
        payload: {
          ...payload,
          client_transaction_id: clientTransactionId,
        },
        completed: false,
        actor,
        error_message: 'Invalid vendor_id.',
        duration_ms: 0,
      });
      throw new HttpError(400, 'Invalid vendor_id.');
    }

    const [productRows] = (await connection.execute(
      'SELECT COUNT(1) AS count FROM products WHERE product_id = ?',
      [productId]
    )) as [{ count: number }[], unknown];
    if (productRows.length === 0 || Number(productRows[0].count) === 0) {
      await journalRepo.create({
        transaction_id: transactionId,
        timestamp: nowDateTime,
        endpoint: '/visit',
        stage: 'invalid_product',
        status: 'failure',
        payload: {
          ...payload,
          client_transaction_id: clientTransactionId,
        },
        completed: false,
        actor,
        error_message: 'Invalid product_id.',
        duration_ms: 0,
      });
      throw new HttpError(400, 'Invalid product_id.');
    }

    const [salesRepRows] = (await connection.execute(
      'SELECT COUNT(1) AS count FROM sales_reps WHERE sales_rep_id = ?',
      [salesRepId]
    )) as [{ count: number }[], unknown];
    if (salesRepRows.length === 0 || Number(salesRepRows[0].count) === 0) {
      await journalRepo.create({
        transaction_id: transactionId,
        timestamp: nowDateTime,
        endpoint: '/visit',
        stage: 'invalid_sales_rep',
        status: 'failure',
        payload: {
          ...payload,
          client_transaction_id: clientTransactionId,
        },
        completed: false,
        actor,
        error_message: 'Invalid sales_rep_id.',
        duration_ms: 0,
      });
      throw new HttpError(400, 'Invalid sales_rep_id.');
    }

    const [inventoryRows] = (await connection.execute(
      'SELECT * FROM inventory WHERE vendor_id = ? AND product_id = ? LIMIT 1 FOR UPDATE',
      [vendorId, productId]
    )) as [Inventory[], unknown];
    let inventoryRow = inventoryRows.length > 0 ? inventoryRows[0] : null;
    let inventoryId = inventoryRow?.inventory_id;
    let inventoryExisted = Boolean(inventoryRow);

    const [vendorInventoryRows] = (await connection.execute(
      'SELECT * FROM vendor_inventory WHERE vendor_id = ? AND product_id = ? LIMIT 1 FOR UPDATE',
      [vendorId, productId]
    )) as [VendorInventory[], unknown];
    const vendorInventoryRow = vendorInventoryRows.length > 0 ? vendorInventoryRows[0] : null;

    if (!vendorInventoryRow) {
      await journalRepo.create({
        transaction_id: transactionId,
        timestamp: nowDateTime,
        endpoint: '/visit',
        stage: 'vendor_inventory_missing_after_migration',
        status: 'failure',
        payload: {
          ...payload,
          client_transaction_id: clientTransactionId,
        },
        completed: false,
        actor,
        error_message: 'VendorInventory row missing after migration. Data integrity error.',
        duration_ms: 0,
      });
      throw new HttpError(500, 'VendorInventory row missing after migration. Data integrity error.');
    }

    const openingStock = inventoryRow ? Number(inventoryRow.current_stock) || 0 : 0;
    const vendorOpeningStock = Number(vendorInventoryRow.current_stock) || openingStock;
    const availableVendorStock = vendorOpeningStock + stockAdded;

    if (stockSold > openingStock) {
      await journalRepo.create({
        transaction_id: transactionId,
        timestamp: nowDateTime,
        endpoint: '/visit',
        stage: 'stock_overflow',
        status: 'failure',
        payload: {
          ...payload,
          client_transaction_id: clientTransactionId,
        },
        completed: false,
        actor,
        error_message: 'stock_sold cannot exceed opening_stock.',
        duration_ms: 0,
      });
      throw new HttpError(400, 'stock_sold cannot exceed opening_stock.');
    }

    if (stockSold > availableVendorStock) {
      await journalRepo.create({
        transaction_id: transactionId,
        timestamp: nowDateTime,
        endpoint: '/visit',
        stage: 'vendor_stock_overflow',
        status: 'failure',
        payload: {
          ...payload,
          client_transaction_id: clientTransactionId,
        },
        completed: false,
        actor,
        error_message: 'Vendor does not have enough stock for this sale.',
        duration_ms: 0,
      });
      throw new HttpError(400, 'Vendor does not have enough stock for this sale.');
    }

    if (!inventoryExisted) {
      inventoryId = generateId('I');
      await inventoryRepo.create({
        inventory_id: inventoryId,
        vendor_id: vendorId,
        product_id: productId,
        total_stock_supplied: 0,
        total_stock_sold: 0,
        current_stock: 0,
        date_created: nowDate,
        last_updated: nowDateTime,
      });
      inventoryRow = await inventoryRepo.findById(inventoryId);
      inventoryExisted = true;
    }

    const expectedCash = stockSold * unitPrice;
    const closingStock = openingStock - stockSold + stockAdded;

    const [balanceRows] = (await connection.execute(
      'SELECT * FROM vendor_balances WHERE vendor_id = ? LIMIT 1 FOR UPDATE',
      [vendorId]
    )) as [VendorBalance[], unknown];
    const balanceRow = balanceRows.length > 0 ? balanceRows[0] : null;

    await createJournalEntry('inventory_update', 'pending', false);
    const updatedInventory = await inventoryRepo.update(inventoryRow!.inventory_id, {
      total_stock_supplied: Number(inventoryRow!.total_stock_supplied) + stockAdded,
      total_stock_sold: Number(inventoryRow!.total_stock_sold) + stockSold,
      current_stock: closingStock,
    });
    await journalRepo.create({
      transaction_id: transactionId,
      timestamp: nowDateTime,
      endpoint: '/visit',
      stage: 'inventory_update',
      status: 'success',
      payload: {
        ...payload,
        client_transaction_id: clientTransactionId,
      },
      completed: false,
      actor,
      error_message: null,
      duration_ms: 0,
    });

    await createJournalEntry('vendor_inventory_update', 'pending', false);
    const updatedVendorInventory = await vendorInventoryRepo.update(vendorInventoryRow.vendor_inventory_id, {
      current_stock: Number(vendorInventoryRow.current_stock) + stockAdded - stockSold,
      total_stock_received: Number(vendorInventoryRow.total_stock_received) + stockAdded,
      total_stock_sold: Number(vendorInventoryRow.total_stock_sold) + stockSold,
    });
    await journalRepo.create({
      transaction_id: transactionId,
      timestamp: nowDateTime,
      endpoint: '/visit',
      stage: 'vendor_inventory_update',
      status: 'success',
      payload: {
        ...payload,
        client_transaction_id: clientTransactionId,
      },
      completed: false,
      actor,
      error_message: null,
      duration_ms: 0,
    });

    await createJournalEntry('balance_update', 'pending', false);
    let updatedVendorBalance: VendorBalance;
    if (!balanceRow) {
      updatedVendorBalance = await vendorBalanceRepo.create({
        vendor_id: vendorId,
        total_expected_cash: expectedCash,
        cash_collected: cashCollected,
        balance_owed: expectedCash - cashCollected,
        date_created: nowDate,
        last_updated: nowDateTime,
      });
    } else {
      updatedVendorBalance = await vendorBalanceRepo.update(vendorId, {
        total_expected_cash: Number(balanceRow.total_expected_cash) + expectedCash,
        cash_collected: Number(balanceRow.cash_collected) + cashCollected,
        balance_owed:
          Number(balanceRow.total_expected_cash) + expectedCash -
          (Number(balanceRow.cash_collected) + cashCollected),
      });
    }
    await journalRepo.create({
      transaction_id: transactionId,
      timestamp: nowDateTime,
      endpoint: '/visit',
      stage: 'balance_update',
      status: 'success',
      payload: {
        ...payload,
        client_transaction_id: clientTransactionId,
      },
      completed: false,
      actor,
      error_message: null,
      duration_ms: 0,
    });

    await createJournalEntry('visit_append', 'pending', false);
    const visitId = generateId('VL');
    const createdVisit = await visitRepo.create({
      visit_id: visitId,
      timestamp: nowDateTime,
      date: nowDate,
      vendor_id: vendorId,
      product_id: productId,
      sales_rep_id: salesRepId,
      opening_stock: openingStock,
      stock_sold: stockSold,
      stock_added: stockAdded,
      cash_collected: cashCollected,
      expected_cash: expectedCash,
      unit_price: unitPrice,
      closing_stock: closingStock,
      payment_method: paymentMethod,
      payment_reference: paymentReference,
      client_transaction_id: clientTransactionId,
      latitude,
      longitude,
      notes,
      date_created: nowDateTime,
      last_updated: nowDateTime,
    }) as unknown as Record<string, unknown>;
    await idempotencyRepo.markCompleted(clientTransactionId, visitId, nowDateTime);
    await journalRepo.create({
      transaction_id: transactionId,
      timestamp: nowDateTime,
      endpoint: '/visit',
      stage: 'complete',
      status: 'success',
      payload: journalPayload,
      completed: true,
      actor,
      error_message: null,
      duration_ms: 0,
    });

    return {
      visitLog: createdVisit,
      inventory: updatedInventory,
      vendorInventory: updatedVendorInventory,
      vendorBalance: updatedVendorBalance,
    };
  });
  } catch (error) {
    if (clientTransactionId && isDuplicateEntry(error)) {
      return getExistingVisitResult(clientTransactionId);
    }
    await createFailureJournalEntry(error);
    throw error;
  }
}
