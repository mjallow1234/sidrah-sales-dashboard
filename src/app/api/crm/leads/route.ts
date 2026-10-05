import type { NextRequest } from 'next/server';
import { forbiddenResponse, getVerifiedSession, unauthorizedResponse } from '@/lib/session';
import { isAgentRole, isAdminOrSupervisorRole } from '@/lib/authorization';
import { createLead, listLeads } from '@/services/crmLeadService';
import { requirePermission } from '@/lib/server/permissionEvaluator';

function allowed(role?: string) { return isAgentRole(role) || isAdminOrSupervisorRole(role); }
function errorResponse(error: unknown) { const status = error instanceof Error && /permissions|assign/i.test(error.message) ? 403 : 400; return Response.json({ status: 'error', message: error instanceof Error ? error.message : String(error) }, { status }); }

export async function GET(request: NextRequest) {
  const session = await requirePermission(request, 'crm.view');
  if (session instanceof Response) return session;
  if (!allowed(session.role) || !session.userId) return forbiddenResponse();
  const q = request.nextUrl.searchParams;
  try { return Response.json({ status: 'success', data: await listLeads({ status: (q.get('status') as any) || undefined, assignedAgentUserId: q.get('assignedAgentUserId') || undefined, search: q.get('search') || undefined, businessType: q.get('businessType') || undefined, location: q.get('location') || undefined, capturedFrom: q.get('capturedFrom') || undefined, capturedTo: q.get('capturedTo') || undefined, followUpDate: q.get('followUpDate') || undefined, followUpBucket: (q.get('followUpBucket') as any) || undefined }, { userId: session.userId, role: session.role }) }); } catch (error) { return errorResponse(error); }
}

export async function POST(request: NextRequest) {
  const session = await requirePermission(request, 'crm.create');
  if (session instanceof Response) return session;
  if (!allowed(session.role) || !session.userId) return forbiddenResponse();
  try { return Response.json({ status: 'success', data: await createLead(await request.json(), { userId: session.userId, role: session.role }) }); } catch (error) { return errorResponse(error); }
}
