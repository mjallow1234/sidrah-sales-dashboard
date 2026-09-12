import type { FactoryMovementType } from '@/lib/types';

export function isOperationDuplicateError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const candidate = error as { code?: string; message?: string };
  return candidate.code === 'ER_DUP_ENTRY' && /operation_id|ux_factory_stock_movements_operation_id|ux_factory_movement_events_operation_id/i.test(candidate.message ?? '');
}

export function calculateFactoryQuantity(currentQuantity: number, movementType: FactoryMovementType, quantity: number): number {
  const current = Number(currentQuantity);
  const amount = Number(quantity);
  if (!Number.isFinite(current) || current < 0 || !Number.isFinite(amount) || amount <= 0) {
    throw new Error('FACTORY_QUANTITY_INVALID');
  }
  const next = movementType === 'leaving_factory' ? current - amount : current + amount;
  if (next < 0) throw new Error('FACTORY_STOCK_INSUFFICIENT');
  return next;
}
