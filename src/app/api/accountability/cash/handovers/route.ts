import type { NextRequest } from 'next/server';
import { isAdminOrSupervisorRole } from '@/lib/authorization';
import { forbiddenResponse, getVerifiedSession, unauthorizedResponse } from '@/lib/session';
import { CashHandoverHttpError, listCompanyCashHandovers } from '@/services/agentCashHandoverService';

export async function GET(request: NextRequest) {
  const session = await getVerifiedSession(request);
  if (!session) return unauthorizedResponse();
  if (!isAdminOrSupervisorRole(session.role)) return forbiddenResponse();
  try { return Response.json({ status: 'success', data: await listCompanyCashHandovers(session.role) }); }
  catch (error) { const status = error instanceof CashHandoverHttpError ? error.status : 500; return Response.json({ status: 'error', message: error instanceof Error ? error.message : String(error) }, { status }); }
}
