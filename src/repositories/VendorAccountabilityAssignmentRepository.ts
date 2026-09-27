import { randomUUID } from 'crypto';
import type { RepositoryDbClient } from './types';
import { BaseRepository } from './BaseRepository';

export interface VendorAccountabilityAssignment {
  assignment_id: string;
  vendor_id: string;
  agent_user_id: string;
  agent_name?: string;
  vendor_name?: string;
  starting_balance: number;
  currency: string;
  assigned_at: string;
  assigned_by: string;
  operation_id: string;
  status: 'active' | 'ended';
  ended_at?: string | null;
}

export class VendorAccountabilityAssignmentRepository extends BaseRepository {
  public async assign(input: { vendorId: string; agentUserId: string; assignedBy: string; operationId: string; assignedAt: string; }): Promise<VendorAccountabilityAssignment> {
    const [existing] = await this.db.execute<any[]>(`SELECT a.*, u.name AS agent_name, v.vendor_name
      FROM agent_vendor_accountability_assignments a
      JOIN app_users u ON u.user_id = a.agent_user_id
      JOIN vendors v ON v.vendor_id = a.vendor_id
      WHERE a.operation_id = :operation_id LIMIT 1`, { operation_id: input.operationId });
    if (existing?.length) return this.map(existing[0]);

    const [agentRows] = await this.db.execute<any[]>(`SELECT user_id FROM app_users WHERE user_id = :user_id AND role = 'agent' AND status = 'active' FOR UPDATE`, { user_id: input.agentUserId });
    if (!agentRows?.length) throw new Error('The selected accountable user is not an active agent.');
    const [vendorRows] = await this.db.execute<any[]>(`SELECT vendor_id FROM vendors WHERE vendor_id = :vendor_id FOR UPDATE`, { vendor_id: input.vendorId });
    if (!vendorRows?.length) throw new Error('Vendor not found.');
    const [balanceRows] = await this.db.execute<any[]>(`SELECT balance_owed FROM vendor_balances WHERE vendor_id = :vendor_id LIMIT 1 FOR UPDATE`, { vendor_id: input.vendorId });
    const startingBalance = Number(balanceRows?.[0]?.balance_owed ?? 0);
    await this.db.execute(`UPDATE agent_vendor_accountability_assignments SET status = 'ended', ended_at = :ended_at WHERE vendor_id = :vendor_id AND status = 'active'`, { vendor_id: input.vendorId, ended_at: input.assignedAt });
    const assignmentId = `AVA_${randomUUID().replace(/-/g, '').slice(0, 20)}`;
    await this.db.execute(`INSERT INTO agent_vendor_accountability_assignments (assignment_id, vendor_id, agent_user_id, starting_balance, currency, assigned_at, assigned_by, operation_id, status)
      VALUES (:assignment_id, :vendor_id, :agent_user_id, :starting_balance, 'GMD', :assigned_at, :assigned_by, :operation_id, 'active')`, {
      assignment_id: assignmentId, vendor_id: input.vendorId, agent_user_id: input.agentUserId, starting_balance: startingBalance,
      assigned_at: input.assignedAt, assigned_by: input.assignedBy, operation_id: input.operationId,
    });
    const [rows] = await this.db.execute<any[]>(`SELECT a.*, u.name AS agent_name, v.vendor_name FROM agent_vendor_accountability_assignments a JOIN app_users u ON u.user_id = a.agent_user_id JOIN vendors v ON v.vendor_id = a.vendor_id WHERE a.assignment_id = :assignment_id`, { assignment_id: assignmentId });
    return this.map(rows[0]);
  }

  public async findActive(vendorId: string): Promise<VendorAccountabilityAssignment | null> {
    const [rows] = await this.db.execute<any[]>(`SELECT a.*, u.name AS agent_name, v.vendor_name FROM agent_vendor_accountability_assignments a JOIN app_users u ON u.user_id = a.agent_user_id JOIN vendors v ON v.vendor_id = a.vendor_id WHERE a.vendor_id = :vendor_id AND a.status = 'active' LIMIT 1`, { vendor_id: vendorId });
    return rows?.length ? this.map(rows[0]) : null;
  }

  public async listForVendor(vendorId: string): Promise<VendorAccountabilityAssignment[]> {
    const [rows] = await this.db.execute<any[]>(`SELECT a.*, u.name AS agent_name, v.vendor_name FROM agent_vendor_accountability_assignments a JOIN app_users u ON u.user_id = a.agent_user_id JOIN vendors v ON v.vendor_id = a.vendor_id WHERE a.vendor_id = :vendor_id ORDER BY a.assigned_at DESC`, { vendor_id: vendorId });
    return (rows ?? []).map((row) => this.map(row));
  }

  private map(row: any): VendorAccountabilityAssignment {
    return {
      assignment_id: String(row.assignment_id), vendor_id: String(row.vendor_id), agent_user_id: String(row.agent_user_id),
      agent_name: row.agent_name ? String(row.agent_name) : undefined, vendor_name: row.vendor_name ? String(row.vendor_name) : undefined,
      starting_balance: Number(row.starting_balance ?? 0), currency: String(row.currency ?? 'GMD'), assigned_at: String(row.assigned_at),
      assigned_by: String(row.assigned_by), operation_id: String(row.operation_id), status: String(row.status) as 'active' | 'ended', ended_at: row.ended_at ? String(row.ended_at) : null,
    };
  }
}
