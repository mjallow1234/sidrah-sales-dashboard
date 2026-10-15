import type { DeliveryPayment, DeliveryPaymentCorrection, DeliveryPaymentHistory, DeliveryPaymentOption, DeliveryPaymentSummary } from '@/lib/types';
import type { RepositoryDbClient } from './types';
import { BaseRepository } from './BaseRepository';
import { NotFoundError } from './errors';

export class DeliveryPaymentRepository extends BaseRepository {
  constructor(db: RepositoryDbClient) {
    super(db);
  }

  public async listOptions(includeInactive = false): Promise<DeliveryPaymentOption[]> {
    const [rows] = await this.execute<any[]>(
      `SELECT payment_option_id, name, is_active, date_created, last_updated
       FROM delivery_payment_options ${includeInactive ? '' : 'WHERE is_active = 1'} ORDER BY name ASC`
    );
    return (Array.isArray(rows) ? rows : []).map((row) => ({
      payment_option_id: String(row.payment_option_id),
      name: String(row.name),
      is_active: Boolean(row.is_active),
      date_created: row.date_created == null ? undefined : String(row.date_created),
      last_updated: row.last_updated == null ? undefined : String(row.last_updated),
    }));
  }

  public async createOption(paymentOptionId: string, name: string): Promise<DeliveryPaymentOption> {
    await this.execute(
      `INSERT INTO delivery_payment_options (payment_option_id, name, is_active) VALUES (:payment_option_id, :name, 1)`,
      { payment_option_id: paymentOptionId, name }
    );
    const [rows] = await this.execute<any[]>(`SELECT payment_option_id, name, is_active, date_created, last_updated FROM delivery_payment_options WHERE payment_option_id = ?`, [paymentOptionId]);
    return rows[0] as DeliveryPaymentOption;
  }

  public async updateOption(paymentOptionId: string, name?: string, isActive?: boolean): Promise<DeliveryPaymentOption> {
    const fields: string[] = [];
    const params: Record<string, unknown> = { payment_option_id: paymentOptionId };
    if (name !== undefined) { fields.push('name = :name'); params.name = name; }
    if (isActive !== undefined) { fields.push('is_active = :is_active'); params.is_active = isActive ? 1 : 0; }
    if (fields.length === 0) throw new Error('No payment option changes supplied.');
    const [result] = await this.execute<any>(`UPDATE delivery_payment_options SET ${fields.join(', ')}, last_updated = NOW() WHERE payment_option_id = :payment_option_id`, params);
    if (Number(result?.affectedRows ?? 0) === 0) throw new NotFoundError('Payment option', paymentOptionId);
    const [rows] = await this.execute<any[]>(`SELECT payment_option_id, name, is_active, date_created, last_updated FROM delivery_payment_options WHERE payment_option_id = ?`, [paymentOptionId]);
    return rows[0] as DeliveryPaymentOption;
  }

  public async findActiveOption(paymentOptionId: string): Promise<DeliveryPaymentOption> {
    const [rows] = await this.execute<any[]>(`SELECT payment_option_id, name, is_active FROM delivery_payment_options WHERE payment_option_id = ? AND is_active = 1 LIMIT 1`, [paymentOptionId]);
    if (!rows.length) throw new NotFoundError('Active payment option', paymentOptionId);
    return { payment_option_id: String(rows[0].payment_option_id), name: String(rows[0].name), is_active: true };
  }

  public async ensureDelivery(deliveryId: string): Promise<void> {
    const [rows] = await this.execute<any[]>(`SELECT delivery_id FROM deliveries WHERE delivery_id = ? LIMIT 1`, [deliveryId]);
    if (!rows.length) throw new NotFoundError('Delivery', deliveryId);
  }

  public async createPayment(payload: { payment_id: string; delivery_id: string; payment_option_id: string; payment_method: string; amount: number; recorded_by: string }): Promise<void> {
    await this.execute(
      `INSERT INTO delivery_payments (payment_id, delivery_id, payment_option_id, payment_method, amount, recorded_by, recorded_at)
       VALUES (:payment_id, :delivery_id, :payment_option_id, :payment_method, :amount, :recorded_by, NOW())`,
      payload
    );
  }

  public async listPayments(deliveryId: string): Promise<DeliveryPaymentHistory> {
    const [rows] = await this.execute<any[]>(
      `SELECT p.payment_id, p.delivery_id, p.payment_option_id, p.payment_method,
          COALESCE((SELECT c.corrected_amount FROM delivery_payment_corrections c WHERE c.payment_id = p.payment_id ORDER BY c.corrected_at DESC, c.correction_id DESC LIMIT 1), p.amount) AS amount,
          p.recorded_by, p.recorded_at, u.name AS recorded_by_name, u.username AS recorded_by_username
       FROM delivery_payments p
       LEFT JOIN app_users u ON u.user_id = p.recorded_by
       WHERE p.delivery_id = ?
       ORDER BY p.recorded_at ASC, p.payment_id ASC`,
      [deliveryId]
    );
    const payments = (Array.isArray(rows) ? rows : []).map((row) => ({
      payment_id: String(row.payment_id),
      delivery_id: String(row.delivery_id),
      payment_option_id: String(row.payment_option_id),
      payment_method: String(row.payment_method),
      amount: Number(row.amount),
      recorded_by: String(row.recorded_by),
      recorded_by_name: row.recorded_by_name || row.recorded_by_username || 'Unknown user',
      recorded_at: String(row.recorded_at),
    }));
    return { payments, total_amount: payments.reduce((total, payment) => total + payment.amount, 0) };
  }

  public async listSummary(date: string, location?: string, customerSearch?: string): Promise<DeliveryPaymentSummary> {
    const params: Record<string, unknown> = { date };
    const conditions = ['DATE(p.recorded_at) = :date'];
    if (location) { conditions.push('d.delivery_address = :location'); params.location = location; }
    if (customerSearch) { conditions.push('LOWER(d.customer_name) LIKE :customerSearch'); params.customerSearch = `%${customerSearch.toLowerCase()}%`; }
    const where = conditions.join(' AND ');
    const [rows] = await this.execute<any[]>(
      `SELECT p.payment_id, p.delivery_id, p.payment_option_id, p.payment_method,
          COALESCE((SELECT c.corrected_amount FROM delivery_payment_corrections c WHERE c.payment_id = p.payment_id ORDER BY c.corrected_at DESC, c.correction_id DESC LIMIT 1), p.amount) AS amount,
          p.recorded_by, p.recorded_at, d.customer_name, d.delivery_address,
          u.name AS recorded_by_name, u.username AS recorded_by_username,
          claimer.name AS claimed_by_name, claimer.username AS claimed_by_username
       FROM delivery_payments p
       JOIN deliveries d ON d.delivery_id = p.delivery_id
       LEFT JOIN app_users u ON u.user_id = p.recorded_by
       LEFT JOIN app_users claimer ON claimer.user_id = d.claimed_by
       WHERE ${where}
       ORDER BY p.recorded_at ASC, p.payment_id ASC`,
      params
    );
    const records = Array.isArray(rows) ? rows : [];
    const payments = records.map((row) => ({
      payment_id: String(row.payment_id), delivery_id: String(row.delivery_id), payment_option_id: String(row.payment_option_id),
      payment_method: String(row.payment_method), amount: Number(row.amount), recorded_by: String(row.recorded_by),
      recorded_by_name: row.recorded_by_name || row.recorded_by_username || 'Unknown user', recorded_at: String(row.recorded_at),
      customer_name: String(row.customer_name), delivery_address: String(row.delivery_address),
      claimed_by_name: row.claimed_by_name || row.claimed_by_username || undefined,
    }));
    const [locationRows] = await this.execute<any[]>(
      `SELECT DISTINCT d.delivery_address FROM delivery_payments p JOIN deliveries d ON d.delivery_id = p.delivery_id WHERE DATE(p.recorded_at) = :date ORDER BY d.delivery_address ASC`,
      { date }
    );
    return {
      date,
      locations: (Array.isArray(locationRows) ? locationRows : []).map((row) => String(row.delivery_address)),
      payments,
      total_amount: payments.reduce((total, payment) => total + payment.amount, 0),
    };
  }

  public async correctPayment(input: { correction_id: string; operation_id: string; payment_id: string; delivery_id: string; corrected_amount: number; reason: string; corrected_by: string }): Promise<DeliveryPaymentCorrection> {
    const [existingOperation] = await this.db.execute<any[]>(`SELECT correction_id, payment_id, delivery_id, previous_amount, corrected_amount, reason, corrected_by, corrected_at FROM delivery_payment_corrections WHERE operation_id = :operation_id LIMIT 1`, { operation_id: input.operation_id });
    if (existingOperation?.length) return this.mapCorrection(existingOperation[0], input.operation_id);
    const [payments] = await this.db.execute<any[]>(`SELECT p.payment_id, p.delivery_id, p.amount, d.status FROM delivery_payments p JOIN deliveries d ON d.delivery_id = p.delivery_id WHERE p.payment_id = :payment_id AND p.delivery_id = :delivery_id LIMIT 1 FOR UPDATE`, { payment_id: input.payment_id, delivery_id: input.delivery_id });
    if (!payments?.length) throw new NotFoundError('Delivery payment', input.payment_id);
    if (String(payments[0].status) !== 'delivered') throw new Error('Only completed deliveries can have payment corrections.');
    const [latest] = await this.db.execute<any[]>(`SELECT corrected_amount FROM delivery_payment_corrections WHERE payment_id = :payment_id ORDER BY corrected_at DESC, correction_id DESC LIMIT 1 FOR UPDATE`, { payment_id: input.payment_id });
    const previousAmount = Number(latest?.[0]?.corrected_amount ?? payments[0].amount);
    await this.db.execute(`INSERT INTO delivery_payment_corrections (correction_id, operation_id, payment_id, delivery_id, previous_amount, corrected_amount, reason, corrected_by, corrected_at) VALUES (:correction_id, :operation_id, :payment_id, :delivery_id, :previous_amount, :corrected_amount, :reason, :corrected_by, NOW())`, { ...input, previous_amount: previousAmount });
    const [rows] = await this.db.execute<any[]>(`SELECT c.correction_id, c.operation_id, c.payment_id, c.delivery_id, c.previous_amount, c.corrected_amount, c.reason, c.corrected_by, c.corrected_at, u.name AS corrected_by_name, u.username AS corrected_by_username FROM delivery_payment_corrections c LEFT JOIN app_users u ON u.user_id = c.corrected_by WHERE c.correction_id = :correction_id LIMIT 1`, { correction_id: input.correction_id });
    return this.mapCorrection(rows[0], input.operation_id);
  }

  public async listCorrections(paymentId: string): Promise<DeliveryPaymentCorrection[]> {
    const [rows] = await this.db.execute<any[]>(`SELECT c.correction_id, c.operation_id, c.payment_id, c.delivery_id, c.previous_amount, c.corrected_amount, c.reason, c.corrected_by, c.corrected_at, u.name AS corrected_by_name, u.username AS corrected_by_username FROM delivery_payment_corrections c LEFT JOIN app_users u ON u.user_id = c.corrected_by WHERE c.payment_id = :payment_id ORDER BY c.corrected_at ASC, c.correction_id ASC`, { payment_id: paymentId });
    return (rows ?? []).map((row) => this.mapCorrection(row, String(row.operation_id)));
  }

  private mapCorrection(row: any, operationId: string): DeliveryPaymentCorrection {
    return { correction_id: String(row.correction_id), operation_id: String(row.operation_id ?? operationId), payment_id: String(row.payment_id), delivery_id: String(row.delivery_id), previous_amount: Number(row.previous_amount), corrected_amount: Number(row.corrected_amount), reason: String(row.reason), corrected_by: String(row.corrected_by), corrected_by_name: row.corrected_by_name || row.corrected_by_username || undefined, corrected_at: String(row.corrected_at) };
  }
}
