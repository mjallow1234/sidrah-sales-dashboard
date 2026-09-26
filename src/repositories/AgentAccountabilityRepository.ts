import type { AgentAccountabilityDetail, AgentAccountabilityEvent } from '@/lib/types';
import type { RepositoryDbClient } from './types';
import { BaseRepository } from './BaseRepository';

export interface AccountabilityLine {
  product_id: string;
  quantity: number;
  unit_value: number;
  amount: number;
}

export class AgentAccountabilityRepository extends BaseRepository {
  public async createPendingCase(input: {
    case_id: string;
    delivery_id: string;
    vendor_id: string;
    accountable_agent_user_id: string;
    created_by: string;
    lines: AccountabilityLine[];
    occurred_at: string;
  }): Promise<void> {
    await this.db.execute(
      `INSERT INTO agent_accountability_cases (case_id, delivery_id, vendor_id, accountable_agent_user_id, status, created_by)
       VALUES (:case_id, :delivery_id, :vendor_id, :agent_user_id, 'pending', :created_by)`,
      { case_id: input.case_id, delivery_id: input.delivery_id, vendor_id: input.vendor_id, agent_user_id: input.accountable_agent_user_id, created_by: input.created_by },
    );

    for (const [index, line] of input.lines.entries()) {
      await this.db.execute(
        `INSERT INTO agent_accountability_events
          (event_id, operation_id, case_id, event_type, event_status, agent_user_id, vendor_id, delivery_id,
           product_id, quantity, unit_value, amount_delta, currency, source_reference, occurred_at, recorded_by, metadata)
         VALUES (:event_id, :operation_id, :case_id, 'pending_delivery', 'pending', :agent_user_id, :vendor_id,
           :delivery_id, :product_id, :quantity, :unit_value, :amount_delta, 'GMD', :source_reference,
           :occurred_at, :recorded_by, :metadata)`,
        {
          event_id: `${input.case_id}_P${index + 1}`,
          operation_id: `${input.delivery_id}:pending:${index + 1}`,
          case_id: input.case_id,
          agent_user_id: input.accountable_agent_user_id,
          vendor_id: input.vendor_id,
          delivery_id: input.delivery_id,
          product_id: line.product_id,
          quantity: line.quantity,
          unit_value: line.unit_value,
          amount_delta: line.amount,
          source_reference: input.delivery_id,
          occurred_at: input.occurred_at,
          recorded_by: input.created_by,
          metadata: JSON.stringify({ phase: 'pending_delivery' }),
        },
      );
    }
  }

  public async activateDelivery(deliveryId: string, actorUserId: string, occurredAt: string): Promise<void> {
    const [cases] = await this.db.execute<any[]>(
      `SELECT * FROM agent_accountability_cases WHERE delivery_id = :delivery_id LIMIT 1 FOR UPDATE`,
      { delivery_id: deliveryId },
    );
    if (!Array.isArray(cases) || cases.length === 0) return;
    const accountabilityCase = cases[0];
    if (String(accountabilityCase.status) !== 'pending') return;

    const [pendingEvents] = await this.db.execute<any[]>(
      `SELECT * FROM agent_accountability_events WHERE case_id = :case_id AND event_type = 'pending_delivery' ORDER BY event_id ASC FOR UPDATE`,
      { case_id: accountabilityCase.case_id },
    );
    for (const pending of pendingEvents ?? []) {
      await this.db.execute(
        `INSERT INTO agent_accountability_events
          (event_id, operation_id, case_id, event_type, event_status, agent_user_id, vendor_id, delivery_id,
           product_id, quantity, unit_value, amount_delta, currency, source_reference, occurred_at, recorded_by, metadata)
         VALUES (:event_id, :operation_id, :case_id, 'delivery_activation', 'posted', :agent_user_id, :vendor_id,
           :delivery_id, :product_id, :quantity, :unit_value, :amount_delta, :currency, :source_reference,
           :occurred_at, :recorded_by, :metadata)`,
        {
          event_id: `${accountabilityCase.case_id}_A${String(pending.event_id).split('_P').pop()}`,
          operation_id: `${deliveryId}:activation:${pending.event_id}`,
          case_id: accountabilityCase.case_id,
          agent_user_id: accountabilityCase.accountable_agent_user_id,
          vendor_id: accountabilityCase.vendor_id,
          delivery_id: deliveryId,
          product_id: pending.product_id,
          quantity: pending.quantity,
          unit_value: pending.unit_value,
          amount_delta: pending.amount_delta,
          currency: pending.currency,
          source_reference: deliveryId,
          occurred_at: occurredAt,
          recorded_by: actorUserId,
          metadata: JSON.stringify({ phase: 'delivery_activation', pending_event_id: pending.event_id }),
        },
      );
    }
    await this.db.execute(
      `UPDATE agent_accountability_cases SET status = 'active', activated_at = :activated_at, updated_at = CURRENT_TIMESTAMP WHERE case_id = :case_id AND status = 'pending'`,
      { case_id: accountabilityCase.case_id, activated_at: occurredAt },
    );
  }

  public async appendPendingLines(deliveryId: string, lines: AccountabilityLine[], recordedBy: string, occurredAt: string): Promise<void> {
    const [cases] = await this.db.execute<any[]>(
      `SELECT * FROM agent_accountability_cases WHERE delivery_id = :delivery_id LIMIT 1 FOR UPDATE`,
      { delivery_id: deliveryId },
    );
    if (!cases?.length || String(cases[0].status) !== 'pending') return;
    const accountabilityCase = cases[0];
    for (const [index, line] of lines.entries()) {
      const suffix = `${Date.now()}_${index}`;
      await this.db.execute(
        `INSERT INTO agent_accountability_events
          (event_id, operation_id, case_id, event_type, event_status, agent_user_id, vendor_id, delivery_id,
           product_id, quantity, unit_value, amount_delta, currency, source_reference, occurred_at, recorded_by, metadata)
         VALUES (:event_id, :operation_id, :case_id, 'pending_delivery', 'pending', :agent_user_id, :vendor_id,
           :delivery_id, :product_id, :quantity, :unit_value, :amount_delta, 'GMD', :source_reference,
           :occurred_at, :recorded_by, :metadata)`,
        {
          event_id: `${accountabilityCase.case_id}_P${suffix}`,
          operation_id: `${deliveryId}:pending-add:${suffix}`,
          case_id: accountabilityCase.case_id, agent_user_id: accountabilityCase.accountable_agent_user_id,
          vendor_id: accountabilityCase.vendor_id, delivery_id: deliveryId, product_id: line.product_id,
          quantity: line.quantity, unit_value: line.unit_value, amount_delta: line.amount,
          source_reference: deliveryId, occurred_at: occurredAt, recorded_by: recordedBy,
          metadata: JSON.stringify({ phase: 'pending_delivery_addition' }),
        },
      );
    }
  }

  private async lockActiveCase(deliveryId: string): Promise<any> {
    const [cases] = await this.db.execute<any[]>(`SELECT * FROM agent_accountability_cases WHERE delivery_id = :delivery_id LIMIT 1 FOR UPDATE`, { delivery_id: deliveryId });
    if (!cases?.length || String(cases[0].status) !== 'active') throw new Error('Active accountability case was not found.');
    return cases[0];
  }

  public async createCollection(input: {
    operation_id: string; delivery_id: string; amount: number; payment_option_id: string; payment_method: string;
    source_payment_id?: string; collector_user_id: string; recorded_by: string; occurred_at: string; reason?: string;
  }): Promise<void> {
    const [existing] = await this.db.execute<any[]>(`SELECT event_id FROM agent_accountability_events WHERE operation_id = :operation_id LIMIT 1`, { operation_id: input.operation_id });
    if (existing?.length) return;
    const accountabilityCase = await this.lockActiveCase(input.delivery_id);
    const [remainingRows] = await this.db.execute<any[]>(`SELECT COALESCE(SUM(amount_delta), 0) AS remaining_value FROM agent_accountability_events WHERE case_id = :case_id AND event_status = 'posted'`, { case_id: accountabilityCase.case_id });
    if (input.amount > Number(remainingRows[0]?.remaining_value ?? 0) + 0.0001) throw new Error('Collection exceeds the remaining accountability for this delivery.');
    await this.db.execute(
      `INSERT INTO agent_accountability_events
        (event_id, operation_id, case_id, event_type, event_status, agent_user_id, vendor_id, delivery_id,
         amount_delta, currency, payment_option_id, payment_method, source_payment_id, reason, occurred_at,
         recorded_by, collector_user_id, source_reference, metadata)
       VALUES (:event_id, :operation_id, :case_id, 'cash_collection', 'posted', :agent_user_id, :vendor_id, :delivery_id,
         :amount_delta, 'GMD', :payment_option_id, :payment_method, :source_payment_id, :reason, :occurred_at,
         :recorded_by, :collector_user_id, :source_reference, :metadata)`,
      {
        event_id: `AAC_${input.operation_id.replace(/[^A-Za-z0-9]/g, '').slice(-20)}`,
        operation_id: input.operation_id, case_id: accountabilityCase.case_id,
        agent_user_id: accountabilityCase.accountable_agent_user_id, vendor_id: accountabilityCase.vendor_id,
        delivery_id: input.delivery_id, amount_delta: -input.amount, payment_option_id: input.payment_option_id,
        payment_method: input.payment_method, source_payment_id: input.source_payment_id ?? null, reason: input.reason ?? null,
        occurred_at: input.occurred_at, recorded_by: input.recorded_by, collector_user_id: input.collector_user_id,
        source_reference: input.source_payment_id ?? input.delivery_id, metadata: JSON.stringify({ phase: 'cash_collection' }),
      },
    );
  }

  public async createReturn(input: {
    operation_id: string; delivery_id: string; product_id: string; quantity: number; recorded_by: string; occurred_at: string; reason?: string;
  }): Promise<void> {
    const [existing] = await this.db.execute<any[]>(`SELECT event_id FROM agent_accountability_events WHERE operation_id = :operation_id LIMIT 1`, { operation_id: input.operation_id });
    if (existing?.length) return;
    const accountabilityCase = await this.lockActiveCase(input.delivery_id);
    const [stockRows] = await this.db.execute<any[]>(
      `SELECT
         COALESCE(SUM(CASE WHEN event_type = 'delivery_activation' THEN quantity WHEN event_type = 'stock_return' THEN -quantity ELSE 0 END), 0) AS available_quantity,
         COALESCE(SUM(CASE WHEN event_type = 'delivery_activation' THEN quantity * unit_value WHEN event_type = 'stock_return' THEN -quantity * unit_value ELSE 0 END), 0) AS available_value
       FROM agent_accountability_events
       WHERE case_id = :case_id AND product_id = :product_id AND event_status = 'posted'`,
      { case_id: accountabilityCase.case_id, product_id: input.product_id },
    );
    const availableQuantity = Number(stockRows[0]?.available_quantity ?? 0);
    if (input.quantity > availableQuantity + 0.0001) throw new Error('Return exceeds the accountable quantity for this product.');
    const unitValue = availableQuantity > 0 ? Number(stockRows[0]?.available_value ?? 0) / availableQuantity : 0;
    await this.db.execute(
      `INSERT INTO agent_accountability_events
        (event_id, operation_id, case_id, event_type, event_status, agent_user_id, vendor_id, delivery_id,
         product_id, quantity, unit_value, amount_delta, currency, reason, occurred_at, recorded_by,
         collector_user_id, source_reference, metadata)
       VALUES (:event_id, :operation_id, :case_id, 'stock_return', 'posted', :agent_user_id, :vendor_id, :delivery_id,
         :product_id, :quantity, :unit_value, :amount_delta, 'GMD', :reason, :occurred_at, :recorded_by,
         :collector_user_id, :source_reference, :metadata)`,
      {
        event_id: `AAR_${input.operation_id.replace(/[^A-Za-z0-9]/g, '').slice(-20)}`,
        operation_id: input.operation_id, case_id: accountabilityCase.case_id,
        agent_user_id: accountabilityCase.accountable_agent_user_id, vendor_id: accountabilityCase.vendor_id,
        delivery_id: input.delivery_id, product_id: input.product_id, quantity: input.quantity,
        unit_value: unitValue, amount_delta: -(input.quantity * unitValue), reason: input.reason ?? null,
        occurred_at: input.occurred_at, recorded_by: input.recorded_by, collector_user_id: input.recorded_by,
        source_reference: input.delivery_id, metadata: JSON.stringify({ phase: 'stock_return' }),
      },
    );
  }

  public async findByDelivery(deliveryId: string): Promise<AgentAccountabilityDetail | null> {
    const [rows] = await this.db.execute<any[]>(
      `SELECT c.*, u.name AS accountable_agent_name,
          COALESCE((SELECT SUM(e.amount_delta) FROM agent_accountability_events e WHERE e.case_id = c.case_id AND e.event_status = 'pending'), 0) AS pending_value,
          COALESCE((SELECT SUM(e.amount_delta) FROM agent_accountability_events e WHERE e.case_id = c.case_id AND e.event_status = 'posted' AND e.event_type = 'delivery_activation'), 0) AS active_value,
          COALESCE(-(SELECT SUM(e.amount_delta) FROM agent_accountability_events e WHERE e.case_id = c.case_id AND e.event_status = 'posted' AND e.event_type = 'cash_collection'), 0) AS cash_collected,
          COALESCE(-(SELECT SUM(e.amount_delta) FROM agent_accountability_events e WHERE e.case_id = c.case_id AND e.event_status = 'posted' AND e.event_type = 'stock_return'), 0) AS stock_returned,
          COALESCE((SELECT SUM(e.amount_delta) FROM agent_accountability_events e WHERE e.case_id = c.case_id AND e.event_status = 'posted'), 0) AS remaining_value
       FROM agent_accountability_cases c
       LEFT JOIN app_users u ON u.user_id = c.accountable_agent_user_id
       WHERE c.delivery_id = :delivery_id LIMIT 1`,
      { delivery_id: deliveryId },
    );
    if (!rows?.length) return null;
    const row = rows[0];
    const [eventRows] = await this.db.execute<any[]>(
      `SELECT e.*, au.name AS agent_name, ru.name AS recorded_by_name, cu.name AS collector_name, p.product_name
       FROM agent_accountability_events e
       LEFT JOIN app_users au ON au.user_id = e.agent_user_id
       LEFT JOIN app_users ru ON ru.user_id = e.recorded_by
       LEFT JOIN app_users cu ON cu.user_id = e.collector_user_id
       LEFT JOIN products p ON p.product_id = e.product_id
       WHERE e.case_id = :case_id ORDER BY e.occurred_at ASC, e.event_id ASC`,
      { case_id: row.case_id },
    );
    return {
      case_id: String(row.case_id),
      delivery_id: String(row.delivery_id),
      vendor_id: String(row.vendor_id),
      accountable_agent_user_id: String(row.accountable_agent_user_id),
      accountable_agent_name: row.accountable_agent_name ? String(row.accountable_agent_name) : undefined,
      status: String(row.status) as AgentAccountabilityDetail['status'],
      pending_value: Number(row.pending_value ?? 0),
      active_value: Number(row.active_value ?? 0),
      cash_collected: Number(row.cash_collected ?? 0),
      stock_returned: Number(row.stock_returned ?? 0),
      remaining_value: Number(row.remaining_value ?? 0),
      events: (eventRows ?? []).map((event) => ({
        event_id: String(event.event_id), operation_id: String(event.operation_id), case_id: String(event.case_id),
        event_type: String(event.event_type) as AgentAccountabilityEvent['event_type'], event_status: String(event.event_status) as AgentAccountabilityEvent['event_status'],
        agent_user_id: String(event.agent_user_id), agent_name: event.agent_name ? String(event.agent_name) : undefined,
        vendor_id: String(event.vendor_id), delivery_id: event.delivery_id ? String(event.delivery_id) : undefined,
        product_id: event.product_id ? String(event.product_id) : undefined, product_name: event.product_name ? String(event.product_name) : undefined,
        quantity: event.quantity == null ? undefined : Number(event.quantity), unit_value: event.unit_value == null ? undefined : Number(event.unit_value),
        amount_delta: Number(event.amount_delta), currency: String(event.currency), source_reference: event.source_reference ? String(event.source_reference) : undefined,
        reason: event.reason ? String(event.reason) : undefined, occurred_at: String(event.occurred_at), recorded_by: String(event.recorded_by),
        recorded_by_name: event.recorded_by_name ? String(event.recorded_by_name) : undefined,
        payment_option_id: event.payment_option_id ? String(event.payment_option_id) : undefined,
        payment_method: event.payment_method ? String(event.payment_method) : undefined,
        source_payment_id: event.source_payment_id ? String(event.source_payment_id) : undefined,
        collector_user_id: event.collector_user_id ? String(event.collector_user_id) : undefined,
        collector_name: event.collector_name ? String(event.collector_name) : undefined,
      })),
    };
  }
}
