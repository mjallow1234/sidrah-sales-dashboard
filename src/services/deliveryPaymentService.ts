import { randomUUID } from 'crypto';
import { getPool, transaction } from '@/lib/db';
import type { DeliveryPaymentHistory, DeliveryPaymentOption, DeliveryPaymentSummary } from '@/lib/types';
import { DeliveryPaymentRepository } from '@/repositories/DeliveryPaymentRepository';
import { NotFoundError } from '@/repositories/errors';

export class DeliveryPaymentHttpError extends Error {
  public readonly status: number;
  constructor(status: number, message: string) { super(message); this.status = status; }
}

function buildId(): string { return `DPM_${randomUUID().replace(/-/g, '').slice(0, 20)}`; }

function todayUtcDate(): string { return new Date().toISOString().slice(0, 10); }

function validateDate(value: unknown): string {
  const date = typeof value === 'string' && value.trim() ? value.trim() : todayUtcDate();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new DeliveryPaymentHttpError(400, 'A valid date is required.');
  const parsed = new Date(`${date}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) throw new DeliveryPaymentHttpError(400, 'A valid date is required.');
  return date;
}

export async function getDeliveryPaymentOptions(includeInactive = false): Promise<DeliveryPaymentOption[]> {
  return new DeliveryPaymentRepository(getPool()).listOptions(includeInactive);
}

export async function createDeliveryPaymentOption(nameValue: unknown): Promise<DeliveryPaymentOption> {
  if (typeof nameValue !== 'string' || !nameValue.trim()) throw new DeliveryPaymentHttpError(400, 'Payment option name is required.');
  const name = nameValue.trim();
  if (name.length > 128) throw new DeliveryPaymentHttpError(400, 'Payment option name is too long.');
  try { return await new DeliveryPaymentRepository(getPool()).createOption(buildId(), name); }
  catch (error: any) { if (error?.code === 'ER_DUP_ENTRY') throw new DeliveryPaymentHttpError(409, 'That payment option already exists.'); throw error; }
}

export async function updateDeliveryPaymentOption(id: string, payload: { name?: unknown; is_active?: unknown }): Promise<DeliveryPaymentOption> {
  let name: string | undefined;
  if (payload.name !== undefined) {
    if (typeof payload.name !== 'string' || !payload.name.trim()) throw new DeliveryPaymentHttpError(400, 'Payment option name is required.');
    name = payload.name.trim();
    if (name.length > 128) throw new DeliveryPaymentHttpError(400, 'Payment option name is too long.');
  }
  const isActive = payload.is_active === undefined ? undefined : Boolean(payload.is_active);
  try { return await new DeliveryPaymentRepository(getPool()).updateOption(id, name, isActive); }
  catch (error: any) { if (error?.code === 'ER_DUP_ENTRY') throw new DeliveryPaymentHttpError(409, 'That payment option already exists.'); if (error instanceof NotFoundError) throw new DeliveryPaymentHttpError(404, error.message); throw error; }
}

export async function getDeliveryPayments(deliveryId: string): Promise<DeliveryPaymentHistory> {
  const repository = new DeliveryPaymentRepository(getPool());
  try { await repository.ensureDelivery(deliveryId); return await repository.listPayments(deliveryId); }
  catch (error: unknown) { if (error instanceof NotFoundError) throw new DeliveryPaymentHttpError(404, error.message); throw error; }
}

export async function getDeliveryPaymentSummary(dateValue?: unknown, location?: unknown, customerSearch?: unknown): Promise<DeliveryPaymentSummary> {
  const date = validateDate(dateValue);
  const locationValue = typeof location === 'string' ? location.trim() : '';
  const searchValue = typeof customerSearch === 'string' ? customerSearch.trim() : '';
  return new DeliveryPaymentRepository(getPool()).listSummary(date, locationValue || undefined, searchValue || undefined);
}

export async function recordDeliveryPayment(deliveryId: string, value: unknown, paymentOptionId: unknown, actorUserId: string): Promise<DeliveryPaymentHistory> {
  const amount = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(amount) || amount <= 0) throw new DeliveryPaymentHttpError(400, 'Amount received must be greater than zero.');
  if (Math.round(amount * 100) !== amount * 100) throw new DeliveryPaymentHttpError(400, 'Amount received can have at most two decimal places.');
  if (typeof paymentOptionId !== 'string' || !paymentOptionId.trim()) throw new DeliveryPaymentHttpError(400, 'Payment method is required.');
  try {
    return await transaction(async (connection) => {
      const repository = new DeliveryPaymentRepository(connection);
      await repository.ensureDelivery(deliveryId);
      const option = await repository.findActiveOption(paymentOptionId.trim());
      await repository.createPayment({ payment_id: buildId(), delivery_id: deliveryId, payment_option_id: option.payment_option_id, payment_method: option.name, amount, recorded_by: actorUserId });
      return repository.listPayments(deliveryId);
    });
  } catch (error: unknown) {
    if (error instanceof DeliveryPaymentHttpError) throw error;
    if (error instanceof NotFoundError) throw new DeliveryPaymentHttpError(400, 'Delivery or active payment method was not found.');
    throw error;
  }
}
