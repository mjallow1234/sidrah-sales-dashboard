import { randomUUID } from 'crypto';
import type { CrmLead, CrmLeadActivity, CrmLeadFilters, CrmLeadStatus, CrmLeadSummary, CrmOverview, CrmOverviewFilters } from '@/lib/types/crm';
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
    if (filters.salesRepId) { conditions.push('aa.sales_rep_id = :sales_rep_id'); params.sales_rep_id = filters.salesRepId; }
    if (filters.search) { conditions.push('(l.lead_name LIKE :search OR l.phone LIKE :search OR l.location LIKE :search)'); params.search = `%${filters.search}%`; }
    if (filters.businessType === '__blank__') conditions.push("(l.business_type IS NULL OR TRIM(l.business_type) = '')");
    else if (filters.businessType) { conditions.push('l.business_type LIKE :business_type'); params.business_type = `%${filters.businessType}%`; }
    if (filters.location === '__blank__') conditions.push("(l.location IS NULL OR TRIM(l.location) = '')");
    else if (filters.location) { conditions.push('l.location LIKE :location'); params.location = `%${filters.location}%`; }
    if (filters.leadSource === '__blank__') conditions.push("(l.lead_source IS NULL OR TRIM(l.lead_source) = '')");
    else if (filters.leadSource) { conditions.push('l.lead_source LIKE :lead_source'); params.lead_source = `%${filters.leadSource}%`; }
    if (filters.capturedFrom) { conditions.push('l.captured_at >= :captured_from'); params.captured_from = filters.capturedFrom; }
    if (filters.capturedTo) { conditions.push('l.captured_at <= :captured_to'); params.captured_to = filters.capturedTo; }
    if (filters.followUpDate) { conditions.push('l.next_follow_up_date = :follow_up_date'); params.follow_up_date = filters.followUpDate; }
    if (filters.followUpBucket === 'overdue') { conditions.push("l.next_follow_up_date < :follow_up_today AND l.status IN ('new', 'follow_up_required')"); params.follow_up_today = today; }
    if (filters.followUpBucket === 'today') { conditions.push("l.next_follow_up_date = :follow_up_today AND l.status IN ('new', 'follow_up_required')"); params.follow_up_today = today; }
    if (filters.followUpBucket === 'upcoming') { conditions.push("l.next_follow_up_date > :follow_up_today AND l.status IN ('new', 'follow_up_required')"); params.follow_up_today = today; }
    if (filters.followUpBucket === 'no_follow_up') { conditions.push("l.next_follow_up_date IS NULL AND l.status IN ('new', 'follow_up_required')"); }
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

  public async adminOverview(filters: CrmOverviewFilters, today: string): Promise<CrmOverview> {
    const conditions: string[] = [];
    const params: Record<string, unknown> = { today };
    if (filters.capturedFrom) { conditions.push('l.captured_at >= :captured_from'); params.captured_from = filters.capturedFrom; }
    if (filters.capturedTo) { conditions.push('l.captured_at <= :captured_to'); params.captured_to = filters.capturedTo; }
    if (filters.salesRepId) { conditions.push('au.sales_rep_id = :sales_rep_id'); params.sales_rep_id = filters.salesRepId; }
    if (filters.status) { conditions.push('l.status = :status'); params.status = filters.status; }
    if (filters.leadSource === '__blank__') conditions.push("(l.lead_source IS NULL OR TRIM(l.lead_source) = '')");
    else if (filters.leadSource) { conditions.push('l.lead_source LIKE :lead_source'); params.lead_source = `%${filters.leadSource}%`; }
    if (filters.businessType === '__blank__') conditions.push("(l.business_type IS NULL OR TRIM(l.business_type) = '')");
    else if (filters.businessType) { conditions.push('l.business_type LIKE :business_type'); params.business_type = `%${filters.businessType}%`; }
    if (filters.location === '__blank__') conditions.push("(l.location IS NULL OR TRIM(l.location) = '')");
    else if (filters.location) { conditions.push('l.location LIKE :location'); params.location = `%${filters.location}%`; }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const leadConditions = conditions.filter((condition) => !condition.includes('au.sales_rep_id'));
    const base = `FROM crm_leads l LEFT JOIN app_users au ON au.user_id = l.assigned_agent_user_id LEFT JOIN sales_reps sr ON sr.sales_rep_id = au.sales_rep_id ${where}`;
    const [summaryRows] = await this.execute<any[]>(`SELECT COUNT(*) AS total, SUM(l.status = 'new') AS new_leads, SUM(l.next_follow_up_date = :today AND l.status IN ('new','follow_up_required')) AS follow_up_today, SUM(l.next_follow_up_date < :today AND l.status IN ('new','follow_up_required')) AS overdue, SUM(l.next_follow_up_date > :today AND l.status IN ('new','follow_up_required')) AS upcoming, SUM(l.status = 'converted') AS converted, SUM(l.status = 'lost') AS lost ${base}`, params);
    const [pipelineRows] = await this.execute<any[]>(`SELECT l.status AS label, COUNT(*) AS count ${base} GROUP BY l.status ORDER BY FIELD(l.status, 'new','follow_up_required','converted','not_interested','lost')`, params);
    const [healthRows] = await this.execute<any[]>(`SELECT COUNT(CASE WHEN l.status IN ('new','follow_up_required') THEN 1 END) AS active, SUM(l.next_follow_up_date < :today AND l.status IN ('new','follow_up_required')) AS overdue, SUM(l.next_follow_up_date = :today AND l.status IN ('new','follow_up_required')) AS today, SUM(l.next_follow_up_date > :today AND l.status IN ('new','follow_up_required')) AS upcoming, SUM(l.next_follow_up_date IS NULL AND l.status IN ('new','follow_up_required')) AS no_follow_up ${base}`, params);
    const [salesRepRows] = await this.execute<any[]>(`SELECT COALESCE(sr.sales_rep_id, 'UNASSIGNED') AS sales_rep_id, COALESCE(sr.name, 'Unassigned') AS name, COUNT(l.lead_id) AS total, SUM(l.status = 'new') AS new_count, SUM(l.status = 'follow_up_required') AS follow_up_required, SUM(l.status = 'converted') AS converted, SUM(l.status = 'not_interested') AS not_interested, SUM(l.status = 'lost') AS lost, SUM(l.next_follow_up_date < :today AND l.status IN ('new','follow_up_required')) AS overdue FROM sales_reps sr LEFT JOIN app_users au ON au.sales_rep_id = sr.sales_rep_id LEFT JOIN crm_leads l ON l.assigned_agent_user_id = au.user_id ${where ? `WHERE ${conditions.join(' AND ')}` : ''} GROUP BY sr.sales_rep_id, sr.name UNION ALL SELECT 'UNASSIGNED', 'Unassigned', COUNT(l.lead_id), SUM(l.status = 'new'), SUM(l.status = 'follow_up_required'), SUM(l.status = 'converted'), SUM(l.status = 'not_interested'), SUM(l.status = 'lost'), SUM(l.next_follow_up_date < :today AND l.status IN ('new','follow_up_required')) FROM crm_leads l LEFT JOIN app_users au ON au.user_id = l.assigned_agent_user_id LEFT JOIN sales_reps sr ON sr.sales_rep_id = au.sales_rep_id WHERE ${filters.salesRepId ? '1 = 0' : `sr.sales_rep_id IS NULL${leadConditions.length ? ` AND ${leadConditions.join(' AND ')}` : ''}`} HAVING COUNT(l.lead_id) > 0 ORDER BY total DESC, name ASC`, params);
    const [sourceRows] = await this.execute<any[]>(`SELECT COALESCE(NULLIF(TRIM(l.lead_source), ''), 'Unknown / Not Specified') AS label, COUNT(*) AS count ${base} GROUP BY COALESCE(NULLIF(TRIM(l.lead_source), ''), 'Unknown / Not Specified') ORDER BY count DESC, label ASC`, params);
    const [businessRows] = await this.execute<any[]>(`SELECT COALESCE(NULLIF(TRIM(l.business_type), ''), 'Unknown / Not Specified') AS label, COUNT(*) AS count ${base} GROUP BY COALESCE(NULLIF(TRIM(l.business_type), ''), 'Unknown / Not Specified') ORDER BY count DESC, label ASC`, params);
    const [locationRows] = await this.execute<any[]>(`SELECT COALESCE(NULLIF(TRIM(l.location), ''), 'Unknown / Not Specified') AS label, COUNT(*) AS count ${base} GROUP BY COALESCE(NULLIF(TRIM(l.location), ''), 'Unknown / Not Specified') ORDER BY count DESC, label ASC`, params);
    const number = (value: unknown) => Number(value ?? 0);
    const summary = summaryRows[0] ?? {};
    const health = healthRows[0] ?? {};
    return {
      summary: { total: number(summary.total), new_leads: number(summary.new_leads), follow_up_today: number(summary.follow_up_today), overdue: number(summary.overdue), upcoming: number(summary.upcoming), converted: number(summary.converted), lost: number(summary.lost), conversion_rate: number(summary.total) ? Number(((number(summary.converted) / number(summary.total)) * 100).toFixed(2)) : 0 },
      pipeline: ['new', 'follow_up_required', 'converted', 'not_interested', 'lost'].map((label) => ({ label, count: number(pipelineRows.find((row) => String(row.label) === label)?.count) })),
      follow_up_health: { active: number(health.active), overdue: number(health.overdue), today: number(health.today), upcoming: number(health.upcoming), no_follow_up: number(health.no_follow_up) },
      sales_reps: salesRepRows.map((row) => { const total = number(row.total); return { sales_rep_id: String(row.sales_rep_id), name: String(row.name), total, new_count: number(row.new_count), follow_up_required: number(row.follow_up_required), converted: number(row.converted), not_interested: number(row.not_interested), lost: number(row.lost), overdue: number(row.overdue), conversion_rate: total ? Number(((number(row.converted) / total) * 100).toFixed(2)) : 0 }; }),
      sources: sourceRows.map((row) => ({ label: String(row.label), count: number(row.count) })),
      business_types: businessRows.map((row) => ({ label: String(row.label), count: number(row.count) })),
      locations: locationRows.map((row) => ({ label: String(row.label), count: number(row.count) })),
    };
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
