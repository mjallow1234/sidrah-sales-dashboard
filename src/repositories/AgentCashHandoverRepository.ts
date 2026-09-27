import type { RepositoryDbClient } from './types';
import { BaseRepository } from './BaseRepository';

export interface AgentCashSummary {
  agent_user_id: string;
  agent_name: string;
  cash_collected: number;
  cash_handed_over: number;
  cash_outstanding: number;
  stock_accountability: number;
  status: 'outstanding' | 'reconciled' | 'excess';
}

export class AgentCashHandoverRepository extends BaseRepository {
  public async listSummary(): Promise<AgentCashSummary[]> {
    const [rows] = await this.db.execute<any[]>(`SELECT u.user_id AS agent_user_id, u.name AS agent_name,
      COALESCE((SELECT -SUM(e.amount_delta) FROM agent_accountability_events e WHERE e.agent_user_id = u.user_id AND e.event_type = 'cash_collection' AND e.event_status = 'posted'), 0) AS cash_collected,
      COALESCE((SELECT SUM(h.amount) FROM agent_cash_handovers h WHERE h.agent_user_id = u.user_id), 0) AS cash_handed_over,
      COALESCE((SELECT SUM(e.amount_delta) FROM agent_accountability_events e WHERE e.agent_user_id = u.user_id AND e.event_type IN ('delivery_activation','stock_return','transfer_out','transfer_in') AND e.event_status = 'posted'), 0) AS stock_accountability
      FROM app_users u WHERE u.role = 'agent' ORDER BY u.name ASC`);
    return (rows ?? []).map((row) => {
      const collected = Number(row.cash_collected ?? 0);
      const handed = Number(row.cash_handed_over ?? 0);
      const outstanding = collected - handed;
      return { agent_user_id: String(row.agent_user_id), agent_name: String(row.agent_name), cash_collected: collected, cash_handed_over: handed, cash_outstanding: outstanding, stock_accountability: Number(row.stock_accountability ?? 0), status: outstanding > 0.0001 ? 'outstanding' : outstanding < -0.0001 ? 'excess' : 'reconciled' };
    });
  }

  public async createHandover(input: {
    handover_id: string; operation_id: string; agent_user_id: string; amount: number; company_receiver?: string; recorded_by: string; notes?: string; handover_at: string;
  }): Promise<{ handover_id: string; amount: number; collected: number; outstanding: number; variance: number; status: string; allocation_count: number }> {
    const [existing] = await this.db.execute<any[]>(`SELECT handover_id, amount, cash_collected_at_record, variance, status FROM agent_cash_handovers WHERE operation_id = :operation_id LIMIT 1`, { operation_id: input.operation_id });
    if (existing?.length) return { handover_id: String(existing[0].handover_id), amount: Number(existing[0].amount), collected: Number(existing[0].cash_collected_at_record), outstanding: Number(existing[0].cash_collected_at_record) - Number(existing[0].amount), variance: Number(existing[0].variance), status: String(existing[0].status), allocation_count: 0 };
    const [agentRows] = await this.db.execute<any[]>(`SELECT user_id FROM app_users WHERE user_id = :agent_user_id AND role = 'agent' FOR UPDATE`, { agent_user_id: input.agent_user_id });
    if (!agentRows?.length) throw new Error('The selected accountable user is not an agent.');
    const [collections] = await this.db.execute<any[]>(`SELECT e.event_id, e.case_id, e.vendor_id, e.delivery_id, -e.amount_delta AS amount,
      COALESCE((SELECT SUM(a.amount) FROM agent_cash_handover_allocations a WHERE a.collection_event_id = e.event_id), 0) AS allocated
      FROM agent_accountability_events e WHERE e.agent_user_id = :agent_user_id AND e.event_type = 'cash_collection' AND e.event_status = 'posted' ORDER BY e.occurred_at ASC, e.event_id ASC FOR UPDATE`, { agent_user_id: input.agent_user_id });
    const collected = (collections ?? []).reduce((sum, row) => sum + Number(row.amount), 0);
    const available = (collections ?? []).reduce((sum, row) => sum + Math.max(0, Number(row.amount) - Number(row.allocated)), 0);
    const variance = input.amount - available;
    if (variance > 0.0001 && !input.notes?.trim()) throw new Error('A note is required when the handover exceeds outstanding cash accountability.');
    const status = variance > 0.0001 ? 'excess' : variance < -0.0001 ? 'short' : 'reconciled';
    await this.db.execute(`INSERT INTO agent_cash_handovers (handover_id, operation_id, agent_user_id, amount, cash_collected_at_record, variance, status, company_receiver, handover_at, recorded_by, notes) VALUES (:handover_id, :operation_id, :agent_user_id, :amount, :collected, :variance, :status, :company_receiver, :handover_at, :recorded_by, :notes)`, { handover_id: input.handover_id, operation_id: input.operation_id, agent_user_id: input.agent_user_id, amount: input.amount, collected: available, variance, status, company_receiver: input.company_receiver ?? null, handover_at: input.handover_at, recorded_by: input.recorded_by, notes: input.notes ?? null });
    let remainingToAllocate = Math.min(input.amount, Math.max(0, available));
    let allocationCount = 0;
    for (const row of collections ?? []) {
      const availableCollection = Math.max(0, Number(row.amount) - Number(row.allocated));
      const allocation = Math.min(remainingToAllocate, availableCollection);
      if (allocation <= 0) continue;
      const suffix = String(input.handover_id).replace(/[^A-Za-z0-9]/g, '').slice(-18);
      const eventId = `ACH_${suffix}${String(allocationCount).padStart(2, '0')}`;
      await this.db.execute(`INSERT INTO agent_cash_handover_allocations (allocation_id, handover_id, collection_event_id, case_id, vendor_id, delivery_id, amount) VALUES (:allocation_id, :handover_id, :collection_event_id, :case_id, :vendor_id, :delivery_id, :amount)`, { allocation_id: `${eventId}L`, handover_id: input.handover_id, collection_event_id: row.event_id, case_id: row.case_id, vendor_id: row.vendor_id, delivery_id: row.delivery_id ?? null, amount: allocation });
      await this.db.execute(`INSERT INTO agent_accountability_events (event_id, operation_id, case_id, event_type, event_status, agent_user_id, vendor_id, delivery_id, amount_delta, currency, source_reference, reason, occurred_at, recorded_by, metadata) VALUES (:event_id, :operation_id, :case_id, 'cash_handover', 'posted', :agent_user_id, :vendor_id, :delivery_id, :amount_delta, 'GMD', :source_reference, :reason, :occurred_at, :recorded_by, :metadata)`, { event_id: eventId, operation_id: `${input.operation_id}:${allocationCount}`, case_id: row.case_id, agent_user_id: input.agent_user_id, vendor_id: row.vendor_id, delivery_id: row.delivery_id ?? null, amount_delta: -allocation, source_reference: input.handover_id, reason: input.notes ?? null, occurred_at: input.handover_at, recorded_by: input.recorded_by, metadata: JSON.stringify({ phase: 'cash_handover', handover_id: input.handover_id, collection_event_id: row.event_id }) });
      remainingToAllocate -= allocation;
      allocationCount += 1;
      if (remainingToAllocate <= 0.0001) break;
    }
    if (remainingToAllocate > 0.0001 && collections?.length) {
      const row = collections[0];
      const suffix = String(input.handover_id).replace(/[^A-Za-z0-9]/g, '').slice(-18);
      const eventId = `ACH_${suffix}EX`;
      await this.db.execute(`INSERT INTO agent_accountability_events (event_id, operation_id, case_id, event_type, event_status, agent_user_id, vendor_id, delivery_id, amount_delta, currency, source_reference, reason, occurred_at, recorded_by, metadata) VALUES (:event_id, :operation_id, :case_id, 'cash_handover', 'posted', :agent_user_id, :vendor_id, :delivery_id, :amount_delta, 'GMD', :source_reference, :reason, :occurred_at, :recorded_by, :metadata)`, {
        event_id: eventId, operation_id: `${input.operation_id}:excess`, case_id: row.case_id, agent_user_id: input.agent_user_id,
        vendor_id: row.vendor_id, delivery_id: row.delivery_id ?? null, amount_delta: -remainingToAllocate, source_reference: input.handover_id,
        reason: input.notes ?? 'Excess handover', occurred_at: input.handover_at, recorded_by: input.recorded_by,
        metadata: JSON.stringify({ phase: 'cash_handover', handover_id: input.handover_id, excess: true }),
      });
    }
    return { handover_id: input.handover_id, amount: input.amount, collected: available, outstanding: available - input.amount, variance, status, allocation_count: allocationCount };
  }

  public async listHandovers(): Promise<Array<{
    handover_id: string; operation_id: string; agent_user_id: string; agent_name: string; amount: number;
    expected_amount: number; variance: number; status: 'reconciled' | 'short' | 'excess'; company_receiver?: string;
    handover_at: string; recorded_by: string; recorded_by_name?: string; notes?: string;
  }>> {
    const [rows] = await this.db.execute<any[]>(`SELECT h.*, a.name AS agent_name, r.name AS recorded_by_name
      FROM agent_cash_handovers h
      JOIN app_users a ON a.user_id = h.agent_user_id
      LEFT JOIN app_users r ON r.user_id = h.recorded_by
      ORDER BY h.handover_at DESC, h.handover_id DESC`);
    return (rows ?? []).map((row) => ({
      handover_id: String(row.handover_id), operation_id: String(row.operation_id), agent_user_id: String(row.agent_user_id), agent_name: String(row.agent_name),
      amount: Number(row.amount), expected_amount: Number(row.cash_collected_at_record), variance: Number(row.variance), status: String(row.status) as 'reconciled' | 'short' | 'excess',
      company_receiver: row.company_receiver ? String(row.company_receiver) : undefined, handover_at: String(row.handover_at), recorded_by: String(row.recorded_by),
      recorded_by_name: row.recorded_by_name ? String(row.recorded_by_name) : undefined, notes: row.notes ? String(row.notes) : undefined,
    }));
  }
}
