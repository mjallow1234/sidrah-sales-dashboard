import { randomUUID } from 'crypto';
import { getPool, transaction } from '@/lib/db';
import type { FactoryContainerInventory, FactoryContainerMovement, FactoryContainerMovementType, FactoryContainerType } from '@/lib/types';
import { FactoryContainerInventoryRepository } from '@/repositories/FactoryContainerInventoryRepository';
import { FactoryContainerMovementRepository } from '@/repositories/FactoryContainerMovementRepository';
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

function id() { return `FCM_${randomUUID().replace(/-/g, '').slice(0, 12)}`; }
function requiredString(value: unknown, name: string): string { if (typeof value !== 'string' || value.trim() === '') throw new ValidationError(`${name} is required.`); return value.trim(); }
function positiveNumber(value: unknown): number { const parsed = Number(value); if (!Number.isFinite(parsed) || parsed <= 0) throw new ValidationError('Quantity must be greater than zero.'); return parsed; }
function sqlDateTime(value?: string): string { const date = value ? new Date(value) : new Date(); if (Number.isNaN(date.getTime())) throw new ValidationError('occurred_at must be a valid date.'); return date.toISOString().slice(0, 19).replace('T', ' '); }
function isDuplicateOperation(error: unknown): boolean { if (!error || typeof error !== 'object') return false; const candidate = error as { code?: string; message?: string }; return candidate.code === 'ER_DUP_ENTRY' && /operation_id|ux_factory_container_movements_operation_id/i.test(candidate.message ?? ''); }

export async function listFactoryContainerInventory(): Promise<FactoryContainerInventory[]> { return new FactoryContainerInventoryRepository(getPool()).findAll(); }
export async function listFactoryContainerMovements(limit = 100): Promise<FactoryContainerMovement[]> { return new FactoryContainerMovementRepository(getPool()).findAll(limit); }

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
