import { randomUUID } from 'crypto';
import { getPool, transaction } from '@/lib/db';
import type { AppUserRole } from '@/lib/authorization';
import { DeliveryPaymentRepository } from '@/repositories/DeliveryPaymentRepository';
import { AgentAccountabilityRepository } from '@/repositories/AgentAccountabilityRepository';
import { getDeliveryAccountability } from './deliveryService';

export class AccountabilityHttpError extends Error {
  public readonly status: number;
  constructor(status: number, message: string) { super(message); this.status = status; }
}

function requiredText(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new AccountabilityHttpError(400, `${field} is required.`);
  return value.trim();
}

function amountValue(value: unknown): number {
  const amount = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(amount) || amount <= 0 || Math.round(amount * 100) !== amount * 100) throw new AccountabilityHttpError(400, 'Amount must be positive and have at most two decimal places.');
  return amount;
}

function quantityValue(value: unknown): number {
  const quantity = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(quantity) || quantity <= 0) throw new AccountabilityHttpError(400, 'Quantity must be greater than zero.');
  return quantity;
}

function operationId(value: unknown, prefix: string): string {
  if (typeof value === 'string' && value.trim()) return value.trim();
  return `${prefix}_${randomUUID().replace(/-/g, '')}`;
}

function isElevated(role: AppUserRole | undefined): boolean {
  return role === 'admin' || role === 'super_admin' || role === 'supervisor';
}

async function authorizeCase(deliveryId: string, actorUserId: string, role: AppUserRole | undefined) {
  const detail = await getDeliveryAccountability(deliveryId);
  if (!detail) throw new AccountabilityHttpError(404, 'No accountability case exists for this delivery.');
  if (!isElevated(role) && !(role === 'agent' && detail.accountable_agent_user_id === actorUserId)) throw new AccountabilityHttpError(403, 'You are not allowed to change this accountability case.');
  if (detail.status !== 'active') throw new AccountabilityHttpError(409, 'Accountability is not active for this delivery.');
  return detail;
}

export async function recordAccountabilityCollection(input: {
  deliveryId: string; amount: unknown; paymentOptionId: unknown; operationId?: unknown; sourcePaymentId?: unknown;
  reason?: unknown; actorUserId: string; role?: AppUserRole;
}) {
  await authorizeCase(input.deliveryId, input.actorUserId, input.role);
  const paymentOptionId = requiredText(input.paymentOptionId, 'Payment method');
  const amount = amountValue(input.amount);
  const reason = input.reason == null ? undefined : requiredText(input.reason, 'Reason');
  const operation = operationId(input.operationId, 'AAC');
  return transaction(async (connection) => {
    const option = await new DeliveryPaymentRepository(connection).findActiveOption(paymentOptionId);
    await new AgentAccountabilityRepository(connection).createCollection({
      operation_id: operation, delivery_id: input.deliveryId, amount, payment_option_id: option.payment_option_id,
      payment_method: option.name, source_payment_id: typeof input.sourcePaymentId === 'string' ? input.sourcePaymentId.trim() || undefined : undefined,
      collector_user_id: input.actorUserId, recorded_by: input.actorUserId, occurred_at: new Date().toISOString().slice(0, 19).replace('T', ' '), reason,
    });
    return new AgentAccountabilityRepository(connection).findByDelivery(input.deliveryId);
  });
}

export async function recordAccountabilityReturn(input: {
  deliveryId: string; productId: unknown; quantity: unknown; operationId?: unknown; reason?: unknown; actorUserId: string; role?: AppUserRole;
}) {
  await authorizeCase(input.deliveryId, input.actorUserId, input.role);
  const productId = requiredText(input.productId, 'Product');
  const quantity = quantityValue(input.quantity);
  const reason = input.reason == null ? undefined : requiredText(input.reason, 'Reason');
  const operation = operationId(input.operationId, 'AAR');
  return transaction(async (connection) => {
    await new AgentAccountabilityRepository(connection).createReturn({
      operation_id: operation, delivery_id: input.deliveryId, product_id: productId, quantity,
      recorded_by: input.actorUserId, occurred_at: new Date().toISOString().slice(0, 19).replace('T', ' '), reason,
    });
    return new AgentAccountabilityRepository(connection).findByDelivery(input.deliveryId);
  });
}
