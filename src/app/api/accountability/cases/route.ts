import type { NextRequest } from 'next/server';
import { isAdminOrSupervisorRole } from '@/lib/authorization';
import { forbiddenResponse, getVerifiedSession, unauthorizedResponse } from '@/lib/session';
import { AccountabilityHttpError, listAccountabilityCases } from '@/services/agentAccountabilityService';

export async function GET(request: NextRequest) {
  const session = await getVerifiedSession(request);
  if (!session) return unauthorizedResponse();
  if (!isAdminOrSupervisorRole(session.role)) return forbiddenResponse();
  const agentUserId = request.nextUrl.searchParams.get('agent_id')?.trim();
  if (!agentUserId) return Response.json({ status: 'error', message: 'agent_id is required.' }, { status: 400 });
  try { return Response.json({ status: 'success', data: await listAccountabilityCases(agentUserId, session.role) }); }
  catch (error) { const status = error instanceof AccountabilityHttpError ? error.status : 500; return Response.json({ status: 'error', message: error instanceof Error ? error.message : String(error) }, { status }); }
}
