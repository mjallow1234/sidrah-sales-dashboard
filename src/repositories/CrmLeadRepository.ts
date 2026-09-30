import { randomUUID } from 'crypto';
import type { CrmLead, CrmLeadActivity, CrmLeadFilters, CrmLeadStatus, CrmLeadSummary } from '@/lib/types/crm';
import type { RepositoryDbClient } from './types';
import { BaseRepository } from './BaseRepository';

const mapDate = (value: unknown) => value instanceof Date ? value.toISOString().slice(0, 10) : value == null ? null : String(value).slice(0, 10);
const mapDateTime = (value: unknown) => value instanceof Date ? value.toISOString() : value == null ? '' : String(value);
const normalizeCrmParams = (params: Record<string, unknown>): Record<string, unknown> => Object.fromEntries(Object.entries(params).map(([key, value]) => [key, value === undefined ? null : value]));

export class CrmLeadRepository extends BaseRepository {
  public async createLead(input: Omit<CrmLead, 'assigned_agent_name' | 'captured_by_name' | 'updated_by_name' | 'created_at' | 'updated_at'> & { created_at: string; updated_at: string }): Promise<CrmLead> {
    const params = normalizeCrmParams({
      lead_id: input.lead_id,
      lead_name: input.lead_name,
      phone: input.phone,
      location: input.location,
      business_type: input.business_type,
      lead_source: input.lead_source,
      assigned_agent_user_id: input.assigned_agent_user_id,
      captured_by_user_id: input.captured_by_user_id,
      captured_at: input.captured_at,
      status: input.status,
      notes: input.notes,
      next_follow_up_date: input.next_follow_up_date,
      created_at: input.created_at,
      updated_at: input.updated_at,
      updated_by_user_id: input.updated_by_user_id,
    });
    await this.execute(`INSERT INTO crm_leads (lead_id, lead_name, phone, location, business_type, lead_source, assigned_agent_user_id, captured_by_user_id, captured_at, status, notes, next_follow_up_date, created_at, updated_at, updated_by_user_id) VALUES (:lead_id, :lead_name, :phone, :location, :business_type, :lead_source, :assigned_agent_user_id, :captured_by_user_id, :captured_at, :status, :notes, :next_follow_up_date, :created_at, :updated_at, :updated_by_user_id)`, params);
    return this.findById(input.lead_id) as Promise<CrmLead>;
  }

  public async findById(leadId: string): Promise<CrmLead | null> {
    const [rows] = await this.execute<any[]>(this.selectSql('WHERE l.lead_id = :lead_id'), { lead_id: leadId });
    return rows.length ? this.mapLead(rows[0]) : null;
  }

  public async list(filters: CrmLeadFilters, ownAgentUserId?: string, today = new Date().toISOString().slice(0, 10)): Promise<CrmLead[]> {
    const conditions: string[] = [];
    const params: Record<string, unknown> = {};
    if (ownAgentUserId) { conditions.push('l.assigned_agent_user_id = :own_agent'); params.own_agent = ownAgentUserId; }
    if (filters.status) { conditions.push('l.status = :status'); params.status = filters.status; }
    if (filters.assignedAgentUserId) { conditions.push('l.assigned_agent_user_id = :assigned_agent'); params.assigned_agent = filters.assignedAgentUserId; }
    if (filters.search) { conditions.push('(l.lead_name LIKE :search OR l.phone LIKE :search OR l.location LIKE :search)'); params.search = `%${filters.search}%`; }
    if (filters.businessType) { conditions.push('l.business_type LIKE :business_type'); params.business_type = `%${filters.businessType}%`; }
    if (filters.location) { conditions.push('l.location LIKE :location'); params.location = `%${filters.location}%`; }
    if (filters.capturedFrom) { conditions.push('l.captured_at >= :captured_from'); params.captured_from = filters.capturedFrom; }
    if (filters.capturedTo) { conditions.push('l.captured_at <= :captured_to'); params.captured_to = filters.capturedTo; }
    if (filters.followUpDate) { conditions.push('l.next_follow_up_date = :follow_up_date'); params.follow_up_date = filters.followUpDate; }
    if (filters.followUpBucket === 'overdue') { conditions.push("l.next_follow_up_date < :follow_up_today AND l.status IN ('new', 'follow_up_required')"); params.follow_up_today = today; }
    if (filters.followUpBucket === 'today') { conditions.push("l.next_follow_up_date = :follow_up_today AND l.status IN ('new', 'follow_up_required')"); params.follow_up_today = today; }
    if (filters.followUpBucket === 'upcoming') { conditions.push("l.next_follow_up_date > :follow_up_today AND l.status IN ('new', 'follow_up_required')"); params.follow_up_today = today; }
    const [rows] = await this.execute<any[]>(this.selectSql(conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''), params);
    return rows.map((row) => this.mapLead(row));
  }

  public async summary(ownAgentUserId: string | undefined, today: string): Promise<CrmLeadSummary> {
    const params: Record<string, unknown> = { today };
    const scope = ownAgentUserId ? ' AND assigned_agent_user_id = :own_agent' : '';
    if (ownAgentUserId) params.own_agent = ownAgentUserId;
    const [rows] = await this.execute<any[]>(`SELECT
      SUM(next_follow_up_date = :today AND status IN ('new', 'follow_up_required')) AS follow_up_today,
      SUM(next_follow_up_date < :today AND status IN ('new', 'follow_up_required')) AS overdue_follow_ups,
      SUM(next_follow_up_date > :today AND status IN ('new', 'follow_up_required')) AS upcoming_follow_ups,
      SUM(status = 'new') AS new_leads,
      SUM(status = 'converted') AS converted_leads,
      SUM(status = 'lost') AS lost_leads
      FROM crm_leads WHERE 1=1${scope}`, params);
    const row = rows[0] ?? {};
    return { follow_up_today: Number(row.follow_up_today ?? 0), overdue_follow_ups: Number(row.overdue_follow_ups ?? 0), upcoming_follow_ups: Number(row.upcoming_follow_ups ?? 0), new_leads: Number(row.new_leads ?? 0), converted_leads: Number(row.converted_leads ?? 0), lost_leads: Number(row.lost_leads ?? 0) };
  }

  public async updateLead(leadId: string, updates: Record<string, unknown>): Promise<CrmLead | null> {
    const fields = Object.keys(updates).filter((key) => ['lead_name', 'phone', 'location', 'business_type', 'lead_source', 'assigned_agent_user_id', 'captured_at', 'status', 'notes', 'next_follow_up_date', 'updated_at', 'updated_by_user_id'].includes(key));
    if (fields.length) {
      const params: Record<string, unknown> = { lead_id: leadId, ...updates };
      await this.execute(`UPDATE crm_leads SET ${fields.map((field) => `${field} = :${field}`).join(', ')} WHERE lead_id = :lead_id`, normalizeCrmParams(params));
    }
    return this.findById(leadId);
  }

  public async createActivity(input: { lead_id: string; activity_type: string; activity_at: string; actor_user_id: string; note?: string | null; previous_status?: string | null; new_status?: string | null; follow_up_date?: string | null }): Promise<CrmLeadActivity> {
    const activityId = `LDA_${randomUUID().replace(/-/g, '').slice(0, 20)}`;
    const params = normalizeCrmParams({
      activity_id: activityId,
      lead_id: input.lead_id,
      activity_type: input.activity_type,
      activity_at: input.activity_at,
      actor_user_id: input.actor_user_id,
      note: input.note,
      previous_status: input.previous_status,
      new_status: input.new_status,
      follow_up_date: input.follow_up_date,
    });
    await this.execute(`INSERT INTO crm_lead_activities (activity_id, lead_id, activity_type, activity_at, actor_user_id, note, previous_status, new_status, follow_up_date) VALUES (:activity_id, :lead_id, :activity_type, :activity_at, :actor_user_id, :note, :previous_status, :new_status, :follow_up_date)`, params);
    const [rows] = await this.execute<any[]>(`SELECT a.*, u.name AS actor_name FROM crm_lead_activities a JOIN app_users u ON u.user_id = a.actor_user_id WHERE a.activity_id = :activity_id`, { activity_id: activityId });
    return this.mapActivity(rows[0]);
  }

  public async activities(leadId: string): Promise<CrmLeadActivity[]> {
    const [rows] = await this.execute<any[]>(`SELECT a.*, u.name AS actor_name FROM crm_lead_activities a JOIN app_users u ON u.user_id = a.actor_user_id WHERE a.lead_id = :lead_id ORDER BY a.activity_at ASC, a.activity_id ASC`, { lead_id: leadId });
    return rows.map((row) => this.mapActivity(row));
  }

  private selectSql(where: string) { return `SELECT l.*, aa.name AS assigned_agent_name, cu.name AS captured_by_name, uu.name AS updated_by_name FROM crm_leads l LEFT JOIN app_users aa ON aa.user_id = l.assigned_agent_user_id JOIN app_users cu ON cu.user_id = l.captured_by_user_id JOIN app_users uu ON uu.user_id = l.updated_by_user_id ${where} ORDER BY l.captured_at DESC, l.created_at DESC, l.lead_id DESC`; }
  private mapLead(row: any): CrmLead { return { lead_id: String(row.lead_id), lead_name: String(row.lead_name), phone: row.phone == null ? null : String(row.phone), location: row.location == null ? null : String(row.location), business_type: row.business_type == null ? null : String(row.business_type), lead_source: row.lead_source == null ? null : String(row.lead_source), assigned_agent_user_id: row.assigned_agent_user_id == null ? null : String(row.assigned_agent_user_id), assigned_agent_name: row.assigned_agent_name == null ? null : String(row.assigned_agent_name), captured_by_user_id: String(row.captured_by_user_id), captured_by_name: row.captured_by_name == null ? null : String(row.captured_by_name), captured_at: mapDate(row.captured_at) ?? '', status: String(row.status) as CrmLeadStatus, notes: row.notes == null ? null : String(row.notes), next_follow_up_date: mapDate(row.next_follow_up_date), created_at: mapDateTime(row.created_at), updated_at: mapDateTime(row.updated_at), updated_by_user_id: String(row.updated_by_user_id), updated_by_name: row.updated_by_name == null ? null : String(row.updated_by_name) }; }
  private mapActivity(row: any): CrmLeadActivity { return { activity_id: String(row.activity_id), lead_id: String(row.lead_id), activity_type: String(row.activity_type) as CrmLeadActivity['activity_type'], activity_at: mapDateTime(row.activity_at), actor_user_id: String(row.actor_user_id), actor_name: row.actor_name == null ? null : String(row.actor_name), note: row.note == null ? null : String(row.note), previous_status: row.previous_status == null ? null : String(row.previous_status) as CrmLeadStatus, new_status: row.new_status == null ? null : String(row.new_status) as CrmLeadStatus, follow_up_date: mapDate(row.follow_up_date) }; }
}
