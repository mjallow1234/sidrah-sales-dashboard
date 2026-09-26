import { randomUUID } from 'crypto';
import { getPool, transaction } from '@/lib/db';
import type { AppUserRole } from '@/lib/authorization';
import { DeliveryPaymentRepository } from '@/repositories/DeliveryPaymentRepository';
import { AgentAccountabilityRepository } from '@/repositories/AgentAccountabilityRepository';
import { TransactionJournalRepository } from '@/repositories/TransactionJournalRepository';
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

function canOversee(role: AppUserRole | undefined): boolean {
  return role === 'admin' || role === 'super_admin' || role === 'supervisor';
}

export async function listAccountabilityAgents() {
  return new AgentAccountabilityRepository(getPool()).listActiveAgents();
}

export async function listAccountabilityTransfers(actorUserId: string, role?: AppUserRole) {
  return new AgentAccountabilityRepository(getPool()).listTransfers(actorUserId, canOversee(role));
}

export async function initiateAccountabilityTransfer(input: {
  deliveryId: string; toAgentUserId: unknown; operationId?: unknown; reason?: unknown; actorUserId: string; role?: AppUserRole;
}) {
  if (input.role !== 'agent' && !canOversee(input.role)) throw new AccountabilityHttpError(403, 'You are not allowed to initiate accountability transfers.');
  const detail = await getDeliveryAccountability(input.deliveryId);
  if (!detail || detail.status !== 'active') throw new AccountabilityHttpError(409, 'Only active accountability can be transferred.');
  if (detail.accountable_agent_user_id !== input.actorUserId) throw new AccountabilityHttpError(403, 'Only the accountable agent can initiate this transfer.');
  const toAgentUserId = requiredText(input.toAgentUserId, 'Recipient agent');
  const agents = await listAccountabilityAgents();
  if (!agents.some((agent) => agent.user_id === toAgentUserId)) throw new AccountabilityHttpError(400, 'Recipient must be an active agent.');
  const operation = operationId(input.operationId, 'AAT');
  const reason = input.reason == null ? undefined : requiredText(input.reason, 'Reason');
  const transferId = `AAT_${randomUUID().replace(/-/g, '').slice(0, 20)}`;
  return transaction(async (connection) => {
    const repository = new AgentAccountabilityRepository(connection);
    await repository.initiateTransfer({ transfer_id: transferId, operation_id: operation, delivery_id: input.deliveryId, to_agent_user_id: toAgentUserId, initiated_by: input.actorUserId, reason, initiated_at: new Date().toISOString().slice(0, 19).replace('T', ' ') });
    await new TransactionJournalRepository(connection).create({ transaction_id: transferId, timestamp: new Date().toISOString().slice(0, 19).replace('T', ' '), endpoint: '/accountability/transfers', stage: 'initiated', status: 'success', payload: { action: 'initiated', transfer_id: transferId, delivery_id: input.deliveryId, to_agent_user_id: toAgentUserId, operation_id: operation }, completed: true, actor: input.actorUserId, error_message: null, duration_ms: 0 });
    return repository.findTransfer(transferId);
  });
}

export async function decideAccountabilityTransfer(input: {
  transferId: string; action: 'accept' | 'reject' | 'cancel'; reason?: unknown; actorUserId: string; role?: AppUserRole;
}) {
  const transfer = await new AgentAccountabilityRepository(getPool()).findTransfer(input.transferId);
  if (!transfer) throw new AccountabilityHttpError(404, 'Accountability transfer was not found.');
  const elevated = canOversee(input.role);
  if (input.action === 'cancel' && !elevated && transfer.initiated_by !== input.actorUserId) throw new AccountabilityHttpError(403, 'Only the initiating agent can cancel this transfer.');
  if (input.action !== 'cancel' && !elevated && transfer.to_agent_user_id !== input.actorUserId) throw new AccountabilityHttpError(403, 'Only the recipient agent can decide this transfer.');
  const reason = input.reason == null ? undefined : requiredText(input.reason, 'Reason');
  return transaction(async (connection) => {
    const repository = new AgentAccountabilityRepository(connection);
    const result = await repository.decideTransfer({ transferId: input.transferId, action: input.action, actorUserId: input.actorUserId, reason, decidedAt: new Date().toISOString().slice(0, 19).replace('T', ' ') });
    await new TransactionJournalRepository(connection).create({ transaction_id: input.transferId, timestamp: new Date().toISOString().slice(0, 19).replace('T', ' '), endpoint: '/accountability/transfers', stage: input.action, status: 'success', payload: { action: input.action, transfer_id: input.transferId, resulting_status: result.status, accepted_amount: result.acceptedAmount, reason }, completed: true, actor: input.actorUserId, error_message: null, duration_ms: 0 });
    return repository.findTransfer(input.transferId);
  });
}
