import type { DeliveryPayment, DeliveryPaymentHistory, DeliveryPaymentOption, DeliveryPaymentSummary } from '@/lib/types';
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
      `SELECT p.payment_id, p.delivery_id, p.payment_option_id, p.payment_method, p.amount,
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
      `SELECT p.payment_id, p.delivery_id, p.payment_option_id, p.payment_method, p.amount,
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
}
