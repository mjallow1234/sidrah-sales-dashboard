import type { NextRequest } from 'next/server';
import { getSummary } from '@/services/crmLeadService';
import { forbiddenResponse, getVerifiedSession, unauthorizedResponse } from '@/lib/session';
import { isAgentRole, isAdminOrSupervisorRole } from '@/lib/authorization';

function allowed(role?: string) { return isAgentRole(role) || isAdminOrSupervisorRole(role); }
export async function GET(request: NextRequest) {
  const session = await getVerifiedSession(request);
  if (!session) return unauthorizedResponse();
  if (!allowed(session.role) || !session.userId) return forbiddenResponse();
  try { return Response.json({ status: 'success', data: await getSummary({ userId: session.userId, role: session.role }) }); }
  catch (error) { return Response.json({ status: 'error', message: error instanceof Error ? error.message : String(error) }, { status: 400 }); }
}
