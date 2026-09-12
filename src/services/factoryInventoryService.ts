import { randomUUID } from 'crypto';
import { getPool, transaction } from '@/lib/db';
import type { FactoryInventory, FactoryMovementItem, FactoryMovementType, FactoryStockMovement } from '@/lib/types';
import { FactoryInventoryRepository } from '@/repositories/FactoryInventoryRepository';
import { FactoryMovementEventRepository, type FactoryMovementEvent } from '@/repositories/FactoryMovementEventRepository';
import { FactoryStockMovementRepository } from '@/repositories/FactoryStockMovementRepository';
import { ConflictError, NotFoundError, ValidationError } from './errors';
import { calculateFactoryQuantity, isOperationDuplicateError } from './factoryRules';

export { calculateFactoryQuantity, isOperationDuplicateError } from './factoryRules';

export interface CreateFactoryMovementPayload {
  operation_id: string; movement_type: FactoryMovementType; items?: FactoryMovementItem[];
  product_id?: string; quantity?: number | string; occurred_at?: string; actor_user_id: string;
  raw_material?: string; temperature_c?: number | string; processing_duration_hours?: number | string;
  processing_duration_minutes?: number | string; reason_comment?: string; batch_reference?: string;
  input_quantity?: number | string; input_unit?: string;
}
export interface FactoryMovementResult { event: FactoryMovementEvent; movements: FactoryStockMovement[]; inventories: FactoryInventory[]; }
function id(prefix: string) { return `${prefix}_${randomUUID().replace(/-/g, '').slice(0, 12)}`; }
function requiredString(value: unknown, name: string): string { if (typeof value !== 'string' || value.trim() === '') throw new ValidationError(`${name} is required.`); return value.trim(); }
function positiveNumber(value: unknown, name: string): number { const parsed = typeof value === 'number' ? value : Number(value); if (!Number.isFinite(parsed) || parsed <= 0) throw new ValidationError(`${name} must be greater than zero.`); return parsed; }
function optionalNonNegativeNumber(value: unknown, name: string): number | null { if (value === undefined || value === null || value === '') return null; const parsed = Number(value); if (!Number.isFinite(parsed) || parsed < 0) throw new ValidationError(`${name} must be zero or greater.`); return parsed; }
function requiredFiniteNumber(value: unknown, name: string): number { if (value === undefined || value === null || value === '') throw new ValidationError(`${name} must be a valid number.`); const parsed = Number(value); if (!Number.isFinite(parsed)) throw new ValidationError(`${name} must be a valid number.`); return parsed; }
function requiredWholeNumber(value: unknown, name: string): number { if (value === undefined || value === null || value === '') throw new ValidationError(`${name} must be a non-negative whole number.`); const parsed = Number(value); if (!Number.isInteger(parsed) || parsed < 0) throw new ValidationError(`${name} must be a non-negative whole number.`); return parsed; }
function sqlDateTime(value?: string): string { const date = value ? new Date(value) : new Date(); if (Number.isNaN(date.getTime())) throw new ValidationError('occurred_at must be a valid date.'); return date.toISOString().slice(0, 19).replace('T', ' '); }
function normalizeItems(payload: CreateFactoryMovementPayload): FactoryMovementItem[] {
  const source = Array.isArray(payload.items) ? payload.items : [{ product_id: payload.product_id, quantity: payload.quantity }];
  if (source.length === 0) throw new ValidationError('At least one product item is required.');
  const seen = new Set<string>();
  return source.map((item, index) => { const productId = requiredString(item?.product_id, `items[${index}].product_id`); if (seen.has(productId)) throw new ValidationError('The same product cannot be entered more than once.'); seen.add(productId); return { product_id: productId, quantity: positiveNumber(item?.quantity, `items[${index}].quantity`) }; });
}
export async function listFactoryInventory(): Promise<FactoryInventory[]> { return new FactoryInventoryRepository(getPool()).findAll(); }
export async function listFactoryMovements(limit = 100): Promise<FactoryStockMovement[]> { return new FactoryStockMovementRepository(getPool()).findAll(limit); }
function sameItems(a: FactoryStockMovement[], b: FactoryMovementItem[]): boolean { if (a.length !== b.length) return false; const expected = new Map(b.map((item) => [item.product_id, item.quantity])); return a.every((item) => expected.get(item.product_id) === Number(item.quantity)); }

export async function createFactoryMovement(payload: CreateFactoryMovementPayload): Promise<FactoryMovementResult> {
  const operationId = requiredString(payload.operation_id, 'operation_id'); const movementType = payload.movement_type;
  if (!['production', 'leaving_factory', 'returned_factory'].includes(movementType)) throw new ValidationError('movement_type is invalid.');
  const actorUserId = requiredString(payload.actor_user_id, 'actor_user_id'); const items = normalizeItems(payload);
  if (movementType === 'production' && items.length !== 1) throw new ValidationError('Production records must contain one output item.');
  const inputQuantity = optionalNonNegativeNumber(payload.input_quantity, 'input_quantity'); const occurredAt = sqlDateTime(payload.occurred_at);
  const reasonComment = payload.reason_comment === undefined ? null : String(payload.reason_comment); const batchReference = payload.batch_reference === undefined ? null : String(payload.batch_reference);
  const inputUnit = payload.input_unit === undefined ? null : String(payload.input_unit); const rawMaterial = payload.raw_material === undefined ? null : String(payload.raw_material).trim();
  const temperature = payload.temperature_c === undefined ? null : requiredFiniteNumber(payload.temperature_c, 'temperature_c');
  const durationHours = payload.processing_duration_hours === undefined ? null : requiredWholeNumber(payload.processing_duration_hours, 'processing_duration_hours');
  const durationMinutes = payload.processing_duration_minutes === undefined ? null : requiredWholeNumber(payload.processing_duration_minutes, 'processing_duration_minutes');
  if (movementType === 'production') { if (!rawMaterial) throw new ValidationError('raw_material is required for production.'); if (!batchReference?.trim()) throw new ValidationError('batch_reference is required for production.'); if (inputQuantity === null || inputQuantity <= 0) throw new ValidationError('Weight (kg) must be greater than zero for production.'); if (inputUnit !== 'kg') throw new ValidationError('Weight (kg) must use kilograms.'); if (temperature === null) throw new ValidationError('temperature_c is required for production.'); if (durationHours === null) throw new ValidationError('processing_duration_hours is required for production.'); if (durationMinutes === null || durationMinutes > 59) throw new ValidationError('processing_duration_minutes must be from 0 to 59.'); }
  const now = sqlDateTime();
  const executeOperation = () => transaction(async (connection) => {
    const eventRepo = new FactoryMovementEventRepository(connection); const movementRepo = new FactoryStockMovementRepository(connection); const inventoryRepo = new FactoryInventoryRepository(connection);
    const existingEvent = await eventRepo.findByOperationId(operationId, true);
    if (existingEvent) { const existingMovements = await movementRepo.findItemsByOperationId(operationId, true); if (existingEvent.movement_type !== movementType || !sameItems(existingMovements, items)) throw new ConflictError('operation_id is already used by another factory operation.'); const inventories = await Promise.all(items.map((item) => inventoryRepo.findByProduct(item.product_id, true))); if (inventories.some((item) => !item)) throw new ConflictError('Existing operation has no inventory result.'); return { event: existingEvent, movements: existingMovements, inventories: inventories as FactoryInventory[] }; }
    const sortedItems = [...items].sort((a, b) => a.product_id.localeCompare(b.product_id));
    const [productRows] = await connection.execute<any[]>(`SELECT product_id FROM products WHERE product_id IN (${sortedItems.map(() => '?').join(',')}) AND active = TRUE`, sortedItems.map((item) => item.product_id));
    if (productRows.length !== sortedItems.length) { const found = new Set(productRows.map((row) => String(row.product_id))); throw new NotFoundError('Active product', sortedItems.find((item) => !found.has(item.product_id))?.product_id ?? 'unknown'); }
    const [actorRows] = await connection.execute<any[]>('SELECT user_id FROM app_users WHERE user_id = ? AND status = \'active\' LIMIT 1', [actorUserId]); if (actorRows.length === 0) throw new NotFoundError('Active user', actorUserId);
    const locked = new Map<string, FactoryInventory | null>(); for (const item of sortedItems) locked.set(item.product_id, await inventoryRepo.findByProduct(item.product_id, true));
    const nextQuantities = new Map<string, number>(); for (const item of sortedItems) { try { nextQuantities.set(item.product_id, calculateFactoryQuantity(Number(locked.get(item.product_id)?.current_quantity ?? 0), movementType, item.quantity)); } catch (error) { if (error instanceof Error && error.message === 'FACTORY_STOCK_INSUFFICIENT') throw new ConflictError('Leaving Factory quantity exceeds available factory inventory.'); throw new ValidationError('Factory quantity values are invalid.'); } }
    const event = await eventRepo.create({ event_id: id('FE'), operation_id: operationId, movement_type: movementType, occurred_at: occurredAt, recorded_at: now, actor_user_id: actorUserId, reason_comment: reasonComment });
    const inventories: FactoryInventory[] = []; for (const item of sortedItems) { const current = locked.get(item.product_id); inventories.push(current ? await inventoryRepo.updateQuantity(item.product_id, nextQuantities.get(item.product_id) as number, now) : await inventoryRepo.create(item.product_id, nextQuantities.get(item.product_id) as number, now, id('FI'))); }
    const movements: FactoryStockMovement[] = []; for (const item of items) movements.push(await movementRepo.create({ movement_id: id('FM'), event_id: event.event_id, operation_id: operationId, movement_type: movementType, product_id: item.product_id, quantity: item.quantity, occurred_at: occurredAt, recorded_at: now, actor_user_id: actorUserId, raw_material: movementType === 'production' ? rawMaterial : null, temperature_c: movementType === 'production' ? temperature : null, processing_duration_hours: movementType === 'production' ? durationHours : null, processing_duration_minutes: movementType === 'production' ? durationMinutes : null, reason_comment: null, batch_reference: movementType === 'production' ? batchReference : null, input_quantity: movementType === 'production' ? inputQuantity : null, input_unit: movementType === 'production' ? inputUnit : null }));
    return { event, movements, inventories };
  });
  try { return await executeOperation(); } catch (error) { if (!isOperationDuplicateError(error)) throw error; const event = await new FactoryMovementEventRepository(getPool()).findByOperationId(operationId); const movementRepo = new FactoryStockMovementRepository(getPool()); const existing = await movementRepo.findByOperationId(operationId); const movements = await movementRepo.findItemsByOperationId(operationId); if (!event || !existing || movements.length === 0) throw new ConflictError('This factory operation was already submitted, but its result is not yet available. Please retry.'); if (event.movement_type !== movementType || !sameItems(movements, items)) throw new ConflictError('operation_id is already used by another factory operation.'); const inventories = await Promise.all(items.map((item) => new FactoryInventoryRepository(getPool()).findByProduct(item.product_id))); if (inventories.some((item) => !item)) throw new ConflictError('The existing factory operation has no inventory result. Please retry.'); return { event, movements, inventories: inventories as FactoryInventory[] }; }
}
