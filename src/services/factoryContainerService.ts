import { randomUUID } from 'crypto';
import { getPool, transaction } from '@/lib/db';
import type { FactoryContainerInventory, FactoryContainerMovement, FactoryContainerMovementType, FactoryContainerType } from '@/lib/types';
import { FactoryContainerInventoryRepository } from '@/repositories/FactoryContainerInventoryRepository';
import { FactoryContainerMovementRepository } from '@/repositories/FactoryContainerMovementRepository';
import { FactoryRecordRevisionRepository } from '@/repositories/FactoryRecordRevisionRepository';
import { ConflictError, ValidationError } from './errors';
import { calculateFactoryQuantity } from './factoryRules';

const containerTypes: FactoryContainerType[] = ['gallon', 'bucket_5l', 'bucket_1kg'];
const movementTypes: FactoryContainerMovementType[] = ['received', 'leaving_factory', 'returned_factory'];

export interface CreateFactoryContainerMovementPayload {
  operation_id: string;
  container_type: FactoryContainerType;
  movement_type: FactoryContainerMovementType;
  quantity: number | string;
  occurred_at?: string;
  actor_user_id: string;
  reason_comment?: string;
}

export interface FactoryContainerMovementResult {
  movement: FactoryContainerMovement;
  inventory: FactoryContainerInventory;
}
export interface EditFactoryContainerMovementPayload { movement_id: string; actor_user_id: string; container_type: FactoryContainerType; movement_type: FactoryContainerMovementType; quantity: number | string; occurred_at?: string; reason_comment?: string; operation_id?: string; }
export interface ReverseFactoryContainerMovementPayload { movement_id: string; actor_user_id: string; reason: string; operation_id?: string; }

function id() { return `FCM_${randomUUID().replace(/-/g, '').slice(0, 12)}`; }
function requiredString(value: unknown, name: string): string { if (typeof value !== 'string' || value.trim() === '') throw new ValidationError(`${name} is required.`); return value.trim(); }
function positiveNumber(value: unknown): number { const parsed = Number(value); if (!Number.isFinite(parsed) || parsed <= 0) throw new ValidationError('Quantity must be greater than zero.'); return parsed; }
function sqlDateTime(value?: string): string { const date = value ? new Date(value) : new Date(); if (Number.isNaN(date.getTime())) throw new ValidationError('occurred_at must be a valid date.'); return date.toISOString().slice(0, 19).replace('T', ' '); }
function isDuplicateOperation(error: unknown): boolean { if (!error || typeof error !== 'object') return false; const candidate = error as { code?: string; message?: string }; return candidate.code === 'ER_DUP_ENTRY' && /operation_id|ux_factory_container_movements_operation_id/i.test(candidate.message ?? ''); }

export async function listFactoryContainerInventory(): Promise<FactoryContainerInventory[]> { return new FactoryContainerInventoryRepository(getPool()).findAll(); }
export async function listFactoryContainerMovements(limit = 100): Promise<FactoryContainerMovement[]> { return new FactoryContainerMovementRepository(getPool()).findAll(limit); }
export async function listFactoryContainerRevisions(movementId: string) { return new FactoryRecordRevisionRepository(getPool()).findForRecord('container_movement', requiredString(movementId, 'movement_id')); }

export async function createFactoryContainerMovement(payload: CreateFactoryContainerMovementPayload): Promise<FactoryContainerMovementResult> {
  const operationId = requiredString(payload.operation_id, 'operation_id');
  const actorUserId = requiredString(payload.actor_user_id, 'actor_user_id');
  if (!containerTypes.includes(payload.container_type)) throw new ValidationError('container_type is invalid.');
  if (!movementTypes.includes(payload.movement_type)) throw new ValidationError('movement_type is invalid.');
  const quantity = positiveNumber(payload.quantity);
  const occurredAt = sqlDateTime(payload.occurred_at);
  const reasonComment = payload.reason_comment === undefined ? null : String(payload.reason_comment);
  const now = sqlDateTime();

  const executeOperation = () => transaction(async (connection) => {
    const inventoryRepo = new FactoryContainerInventoryRepository(connection);
    const movementRepo = new FactoryContainerMovementRepository(connection);
    const existing = await movementRepo.findByOperationId(operationId, true);
    if (existing) {
      if (existing.container_type !== payload.container_type || existing.movement_type !== payload.movement_type || Number(existing.quantity) !== quantity) throw new ConflictError('operation_id is already used by another container operation.');
      const inventory = await inventoryRepo.findByType(payload.container_type, true);
      if (!inventory) throw new ConflictError('Existing container operation has no inventory result.');
      return { movement: existing, inventory };
    }
    const [actorRows] = await connection.execute<any[]>('SELECT user_id FROM app_users WHERE user_id = ? AND status = \'active\' LIMIT 1', [actorUserId]);
    if (actorRows.length === 0) throw new ValidationError('Active recording user is required.');
    const currentInventory = await inventoryRepo.findByType(payload.container_type, true);
    let nextQuantity: number;
    try { nextQuantity = calculateFactoryQuantity(Number(currentInventory?.current_quantity ?? 0), payload.movement_type === 'received' ? 'returned_factory' : payload.movement_type, quantity); }
    catch (error) { if (error instanceof Error && error.message === 'FACTORY_STOCK_INSUFFICIENT') throw new ConflictError('Leaving Factory quantity exceeds available empty container inventory.'); throw new ValidationError('Container inventory values are invalid.'); }
    const inventory = currentInventory ? await inventoryRepo.updateQuantity(payload.container_type, nextQuantity, now) : await inventoryRepo.create(payload.container_type, nextQuantity, now);
    const movement = await movementRepo.create({ movement_id: id(), operation_id: operationId, container_type: payload.container_type, movement_type: payload.movement_type, quantity, occurred_at: occurredAt, recorded_at: now, actor_user_id: actorUserId, reason_comment: reasonComment });
    return { movement, inventory };
  });

  try { return await executeOperation(); }
  catch (error) {
    if (!isDuplicateOperation(error)) throw error;
    const movement = await new FactoryContainerMovementRepository(getPool()).findByOperationId(operationId);
    if (!movement || movement.container_type !== payload.container_type || movement.movement_type !== payload.movement_type || Number(movement.quantity) !== quantity) throw new ConflictError('operation_id is already used by another container operation.');
    const inventory = await new FactoryContainerInventoryRepository(getPool()).findByType(payload.container_type);
    if (!inventory) throw new ConflictError('The existing container operation has no inventory result. Please retry.');
    return { movement, inventory };
  }
}

function containerEffect(type: FactoryContainerMovementType, quantity: number) { return type === 'leaving_factory' ? -quantity : quantity; }

export async function editFactoryContainerMovement(payload: EditFactoryContainerMovementPayload): Promise<FactoryContainerMovementResult> {
  const movementId = requiredString(payload.movement_id, 'movement_id'); const actor = requiredString(payload.actor_user_id, 'actor_user_id');
  if (!containerTypes.includes(payload.container_type) || !movementTypes.includes(payload.movement_type)) throw new ValidationError('Container movement values are invalid.');
  const quantity = positiveNumber(payload.quantity); const now = sqlDateTime();
  return transaction(async (connection) => {
    const repo = new FactoryContainerMovementRepository(connection); const inventoryRepo = new FactoryContainerInventoryRepository(connection); const revisions = new FactoryRecordRevisionRepository(connection);
    const current = await repo.findById(movementId, true); if (!current) throw new ValidationError('Container movement was not found.'); if (current.status === 'reversed') throw new ConflictError('Reversed container movements cannot be edited.');
    const oldEffect = containerEffect(current.movement_type, current.quantity); const newEffect = containerEffect(payload.movement_type, quantity);
    const oldInventory = await inventoryRepo.findByType(current.container_type, true); const newInventory = payload.container_type === current.container_type ? oldInventory : await inventoryRepo.findByType(payload.container_type, true);
    if (payload.container_type === current.container_type) { const next = Number(oldInventory?.current_quantity ?? 0) + newEffect - oldEffect; if (next < 0) throw new ConflictError('The correction would result in negative empty-container inventory.'); if (oldInventory) await inventoryRepo.updateQuantity(payload.container_type, next, now); else await inventoryRepo.create(payload.container_type, next, now); }
    else { const oldNext = Number(oldInventory?.current_quantity ?? 0) - oldEffect; const newNext = Number(newInventory?.current_quantity ?? 0) + newEffect; if (oldNext < 0) throw new ConflictError('The correction would result in negative empty-container inventory.'); if (oldInventory) await inventoryRepo.updateQuantity(current.container_type, oldNext, now); else await inventoryRepo.create(current.container_type, oldNext, now); if (newInventory) await inventoryRepo.updateQuantity(payload.container_type, newNext, now); else await inventoryRepo.create(payload.container_type, newNext, now); }
    const occurredAt = sqlDateTime(payload.occurred_at); await connection.execute('UPDATE factory_container_movements SET container_type = ?, movement_type = ?, quantity = ?, occurred_at = ?, recorded_at = ?, reason_comment = ?, edited_by = ?, edited_at = ? WHERE movement_id = ?', [payload.container_type, payload.movement_type, quantity, occurredAt, now, payload.reason_comment ?? current.reason_comment ?? null, actor, now, movementId]);
    const after = await repo.findById(movementId, true); await revisions.create({ revision_id: id(), record_type: 'container_movement', movement_id: movementId, action_type: 'edit', actor_user_id: actor, recorded_at: now, reason_comment: payload.reason_comment ?? null, operation_id: payload.operation_id ?? null, before_snapshot: current, after_snapshot: after });
    return { movement: after as FactoryContainerMovement, inventory: (await inventoryRepo.findByType(payload.container_type, true)) as FactoryContainerInventory };
  });
}

export async function reverseFactoryContainerMovement(payload: ReverseFactoryContainerMovementPayload): Promise<FactoryContainerMovementResult> {
  const movementId = requiredString(payload.movement_id, 'movement_id'); const actor = requiredString(payload.actor_user_id, 'actor_user_id'); const reason = requiredString(payload.reason, 'reason'); const operationId = payload.operation_id?.trim() || id(); const now = sqlDateTime();
  return transaction(async (connection) => {
    const repo = new FactoryContainerMovementRepository(connection); const inventoryRepo = new FactoryContainerInventoryRepository(connection); const revisions = new FactoryRecordRevisionRepository(connection);
    const current = await repo.findById(movementId, true); if (!current) throw new ValidationError('Container movement was not found.'); if (current.status === 'reversed') throw new ConflictError('Container movement has already been reversed.');
    const inventory = await inventoryRepo.findByType(current.container_type, true); const next = Number(inventory?.current_quantity ?? 0) - containerEffect(current.movement_type, current.quantity); if (next < 0) throw new ConflictError('The reversal would result in negative empty-container inventory.');
    if (inventory) await inventoryRepo.updateQuantity(current.container_type, next, now); else await inventoryRepo.create(current.container_type, next, now);
    await connection.execute("UPDATE factory_container_movements SET status = 'reversed', reversed_by = ?, reversed_at = ?, reversal_reason = ?, reversal_operation_id = ? WHERE movement_id = ?", [actor, now, reason, operationId, movementId]);
    const after = await repo.findById(movementId, true); await revisions.create({ revision_id: id(), record_type: 'container_movement', movement_id: movementId, action_type: 'reverse', actor_user_id: actor, recorded_at: now, reason_comment: reason, operation_id: operationId, before_snapshot: current, after_snapshot: after });
    return { movement: after as FactoryContainerMovement, inventory: (await inventoryRepo.findByType(current.container_type, true)) as FactoryContainerInventory };
  });
}
