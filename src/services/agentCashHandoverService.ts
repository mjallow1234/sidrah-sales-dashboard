import { randomUUID } from 'crypto';
import { getPool, transaction } from '@/lib/db';
import type { AppUserRole } from '@/lib/authorization';
import { TransactionJournalRepository } from '@/repositories/TransactionJournalRepository';
import { AgentCashHandoverRepository } from '@/repositories/AgentCashHandoverRepository';

export class CashHandoverHttpError extends Error { public readonly status: number; constructor(status: number, message: string) { super(message); this.status = status; } }

function authorized(role?: AppUserRole): boolean { return role === 'admin' || role === 'super_admin' || role === 'supervisor'; }
function text(value: unknown, field: string, required = true): string | undefined { const result = typeof value === 'string' ? value.trim() : ''; if (required && !result) throw new CashHandoverHttpError(400, `${field} is required.`); return result || undefined; }
function amount(value: unknown): number { const result = Number(value); if (!Number.isFinite(result) || result <= 0 || Math.round(result * 100) !== result * 100) throw new CashHandoverHttpError(400, 'Amount must be positive and have at most two decimal places.'); return result; }

export async function getAgentCashAccountability(role?: AppUserRole) {
  if (!authorized(role)) throw new CashHandoverHttpError(403, 'Only management users can view cash accountability.');
  return new AgentCashHandoverRepository(getPool()).listSummary();
}

export async function listCompanyCashHandovers(role?: AppUserRole) {
  if (!authorized(role)) throw new CashHandoverHttpError(403, 'Only management users can view cash handovers.');
  return new AgentCashHandoverRepository(getPool()).listHandovers();
}

export async function recordCompanyCashHandover(input: { agentUserId: unknown; amount: unknown; companyReceiver?: unknown; notes?: unknown; operationId?: unknown; actorUserId: string; role?: AppUserRole }) {
  if (!authorized(input.role)) throw new CashHandoverHttpError(403, 'Only management users can record company handovers.');
  const agentUserId = text(input.agentUserId, 'Accountable agent') as string;
  const handoverAmount = amount(input.amount);
  const receiver = text(input.companyReceiver, 'Company receiver', false);
  const notes = text(input.notes, 'Notes', false);
  const operationId = text(input.operationId, 'Operation ID', false) ?? `ACH_${randomUUID().replace(/-/g, '')}`;
  const handoverId = `ACH_${randomUUID().replace(/-/g, '').slice(0, 20)}`;
  const timestamp = new Date().toISOString().slice(0, 19).replace('T', ' ');
  return transaction(async (connection) => {
    const repository = new AgentCashHandoverRepository(connection);
    const result = await repository.createHandover({ handover_id: handoverId, operation_id: operationId, agent_user_id: agentUserId, amount: handoverAmount, company_receiver: receiver, recorded_by: input.actorUserId, notes, handover_at: timestamp });
    await new TransactionJournalRepository(connection).create({ transaction_id: result.handover_id, timestamp, endpoint: '/accountability/cash-handovers', stage: 'record', status: 'success', payload: { action: 'company_cash_handover', ...result, agent_user_id: agentUserId, company_receiver: receiver, notes }, completed: true, actor: input.actorUserId, error_message: null, duration_ms: 0 });
    return result;
  });
}
