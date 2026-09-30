import { randomUUID } from 'crypto';
import { getPool, transaction } from '@/lib/db';
import type { CrmLead, CrmLeadActivity, CrmLeadFilters, CrmLeadStatus } from '@/lib/types/crm';
import { CrmLeadRepository } from '@/repositories/CrmLeadRepository';
import { ValidationError, NotFoundError } from './errors';

const statuses = new Set<string>(['new', 'follow_up_required', 'converted', 'not_interested', 'lost']);
const dateOnly = /^\d{4}-\d{2}-\d{2}$/;

function text(value: unknown, field: string, required = false): string | null {
  if (value === undefined || value === null || String(value).trim() === '') { if (required) throw new ValidationError(`${field} is required.`); return null; }
  if (typeof value !== 'string') throw new ValidationError(`${field} must be text.`);
  return value.trim();
}
function date(value: unknown, field: string, required = false): string | null {
  const result = text(value, field, required);
  if (result === null) return null;
  if (!dateOnly.test(result)) throw new ValidationError(`${field} must use YYYY-MM-DD.`);
  const parsed = new Date(`${result}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== result) throw new ValidationError(`${field} is invalid.`);
  return result;
}
function status(value: unknown): CrmLeadStatus { const result = text(value, 'status', true) as string; if (!statuses.has(result)) throw new ValidationError('Invalid lead status.'); return result as CrmLeadStatus; }
function now() { return new Date().toISOString().slice(0, 19).replace('T', ' '); }

async function validateAgent(connection: any, userId: string): Promise<void> {
  const [rows] = await connection.execute('SELECT user_id FROM app_users WHERE user_id = ? AND role = \'agent\' AND status = \'active\' LIMIT 1', [userId]);
  if (!(rows as unknown[]).length) throw new ValidationError('Assigned user must be an active agent.');
}

function canManage(role?: string) { return role === 'supervisor' || role === 'admin' || role === 'super_admin'; }

export async function listLeads(filters: CrmLeadFilters, session: { userId: string; role?: string }) {
  const own = session.role === 'agent' ? session.userId : undefined;
  if (!own && !canManage(session.role)) throw new Error('Insufficient permissions.');
  return new CrmLeadRepository(getPool()).list(filters, own);
}

export async function getLead(leadId: string, session: { userId: string; role?: string }): Promise<CrmLead> {
  const lead = await new CrmLeadRepository(getPool()).findById(leadId);
  if (!lead) throw new NotFoundError('CrmLead', leadId);
  if (session.role === 'agent' && lead.assigned_agent_user_id !== session.userId) throw new Error('Insufficient permissions.');
  if (!session.role || (!canManage(session.role) && session.role !== 'agent')) throw new Error('Insufficient permissions.');
  return lead;
}

export async function getActivities(leadId: string, session: { userId: string; role?: string }): Promise<CrmLeadActivity[]> {
  await getLead(leadId, session);
  return new CrmLeadRepository(getPool()).activities(leadId);
}

export async function createLead(input: Record<string, unknown>, session: { userId: string; role?: string }): Promise<CrmLead> {
  const leadName = text(input.lead_name, 'lead_name', true) as string;
  const capturedAt = date(input.captured_at, 'captured_at', true) as string;
  const leadStatus = status(input.status ?? 'new');
  const requestedAgent = text(input.assigned_agent_user_id, 'assigned_agent_user_id');
  const assignedAgent = session.role === 'agent' ? session.userId : requestedAgent;
  if (session.role === 'agent' && requestedAgent && requestedAgent !== session.userId) throw new Error('Agents may only assign leads to themselves.');
  if (!assignedAgent && !canManage(session.role)) throw new ValidationError('An assigned agent is required.');
  if (assignedAgent) await validateAgent(getPool(), assignedAgent);
  const timestamp = now();
  const leadId = `LEAD_${randomUUID().replace(/-/g, '').slice(0, 20)}`;
  return transaction(async (connection) => {
    if (assignedAgent) await validateAgent(connection, assignedAgent);
    const repository = new CrmLeadRepository(connection);
    const lead = await repository.createLead({ lead_id: leadId, lead_name: leadName, phone: text(input.phone, 'phone'), location: text(input.location, 'location'), business_type: text(input.business_type, 'business_type'), lead_source: text(input.lead_source, 'lead_source'), assigned_agent_user_id: assignedAgent ?? null, captured_by_user_id: session.userId, captured_at: capturedAt, status: leadStatus, notes: text(input.notes, 'notes'), next_follow_up_date: date(input.next_follow_up_date, 'next_follow_up_date'), updated_by_user_id: session.userId, created_at: timestamp, updated_at: timestamp });
    await repository.createActivity({ lead_id: leadId, activity_type: 'created', activity_at: timestamp, actor_user_id: session.userId, note: lead.notes, new_status: leadStatus, follow_up_date: lead.next_follow_up_date });
    return lead;
  });
}

export async function updateLead(leadId: string, input: Record<string, unknown>, session: { userId: string; role?: string }): Promise<CrmLead> {
  const existing = await getLead(leadId, session);
  if (session.role === 'agent' && input.assigned_agent_user_id !== undefined && input.assigned_agent_user_id !== session.userId) throw new Error('Agents may only assign leads to themselves.');
  const nextStatus = input.status === undefined ? existing.status : status(input.status);
  const assignedAgent = input.assigned_agent_user_id === undefined ? existing.assigned_agent_user_id : text(input.assigned_agent_user_id, 'assigned_agent_user_id');
  if (assignedAgent) await validateAgent(getPool(), assignedAgent);
  const updates: Record<string, unknown> = { updated_at: now(), updated_by_user_id: session.userId, status: nextStatus };
  for (const field of ['lead_name', 'phone', 'location', 'business_type', 'lead_source', 'notes']) if (input[field] !== undefined) updates[field] = text(input[field], field, field === 'lead_name');
  if (input.captured_at !== undefined) updates.captured_at = date(input.captured_at, 'captured_at', true);
  if (input.next_follow_up_date !== undefined) updates.next_follow_up_date = date(input.next_follow_up_date, 'next_follow_up_date');
  if (input.assigned_agent_user_id !== undefined) updates.assigned_agent_user_id = assignedAgent;
  return transaction(async (connection) => {
    const repository = new CrmLeadRepository(connection);
    const updated = await repository.updateLead(leadId, updates);
    if (!updated) throw new NotFoundError('CrmLead', leadId);
    if (existing.status !== updated.status) await repository.createActivity({ lead_id: leadId, activity_type: 'status_change', activity_at: updates.updated_at as string, actor_user_id: session.userId, previous_status: existing.status, new_status: updated.status, follow_up_date: updated.next_follow_up_date });
    if (input.notes !== undefined && input.notes !== existing.notes) await repository.createActivity({ lead_id: leadId, activity_type: 'note', activity_at: updates.updated_at as string, actor_user_id: session.userId, note: updated.notes });
    if (input.next_follow_up_date !== undefined && input.next_follow_up_date !== existing.next_follow_up_date) await repository.createActivity({ lead_id: leadId, activity_type: 'follow_up', activity_at: updates.updated_at as string, actor_user_id: session.userId, note: 'Follow-up date updated.', follow_up_date: updated.next_follow_up_date });
    return updated;
  });
}

export async function addActivity(leadId: string, input: Record<string, unknown>, session: { userId: string; role?: string }): Promise<CrmLeadActivity> {
  await getLead(leadId, session);
  const note = text(input.note, 'note', true) as string;
  const followUpDate = date(input.follow_up_date, 'follow_up_date');
  const activityType = text(input.activity_type ?? 'note', 'activity_type', true) as string;
  if (!['note', 'follow_up'].includes(activityType)) throw new ValidationError('Invalid activity type.');
  return transaction(async (connection) => {
    const repository = new CrmLeadRepository(connection);
    if (followUpDate) await repository.updateLead(leadId, { next_follow_up_date: followUpDate, updated_at: now(), updated_by_user_id: session.userId });
    return repository.createActivity({ lead_id: leadId, activity_type: activityType, activity_at: now(), actor_user_id: session.userId, note, follow_up_date: followUpDate });
  });
}
