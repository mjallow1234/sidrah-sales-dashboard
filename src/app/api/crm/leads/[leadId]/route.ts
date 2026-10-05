import type { NextRequest } from 'next/server';
import { forbiddenResponse, unauthorizedResponse, type SessionVerificationResult } from '@/lib/session';
import { isAgentRole, isAdminOrSupervisorRole } from '@/lib/authorization';
import { getLead, updateLead } from '@/services/crmLeadService';
import { requirePermission } from '@/lib/server/permissionEvaluator';

function allowed(role?: string) { return isAgentRole(role) || isAdminOrSupervisorRole(role); }
function errorResponse(error: unknown) { const status = error instanceof Error && /not found/i.test(error.message) ? 404 : error instanceof Error && /permissions|assign/i.test(error.message) ? 403 : 400; return Response.json({ status: 'error', message: error instanceof Error ? error.message : String(error) }, { status }); }

export async function GET(request: NextRequest, { params }: { params: Promise<{ leadId: string }> }) {
  const session = await requirePermission(request, 'crm.view'); if (session instanceof Response) return session; if (!allowed(session.role) || !session.userId) return forbiddenResponse();
  try { return Response.json({ status: 'success', data: await getLead((await params).leadId, { userId: session.userId, role: session.role }) }); } catch (error) { return errorResponse(error); }
}
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ leadId: string }> }) {
  const payload = await request.json();
  const permissions = new Set<string>();
  const has = (field: string) => Object.prototype.hasOwnProperty.call(payload ?? {}, field);
  if (has('status')) permissions.add('crm.status.change');
  if (has('assigned_agent_user_id')) permissions.add('crm.assign');
  if (has('next_follow_up_date')) permissions.add('crm.follow_up.manage');
  if (['lead_name', 'phone', 'location', 'business_type', 'lead_source', 'captured_at', 'notes'].some(has)) permissions.add('crm.edit');
  if (!permissions.size) permissions.add('crm.edit');

  let session: SessionVerificationResult | Response | null = null;
  for (const permission of permissions) {
    session = await requirePermission(request, permission);
    if (session instanceof Response) return session;
  }
  if (!session) return unauthorizedResponse(); if (session instanceof Response) return session; if (!allowed(session.role) || !session.userId) return forbiddenResponse();
  try { return Response.json({ status: 'success', data: await updateLead((await params).leadId, payload, { userId: session.userId, role: session.role }) }); } catch (error) { return errorResponse(error); }
}
