import { NextRequest } from 'next/server';
import { forbiddenResponse, getVerifiedSession, unauthorizedResponse } from '@/lib/session';
import type { AppUserRole } from '@/lib/authorization';
import { CashHandoverHttpError, getAgentCashAccountability, recordCompanyCashHandover } from '@/services/agentCashHandoverService';

export async function GET(request: NextRequest) {
  const session = await getVerifiedSession(request);
  if (!session) return unauthorizedResponse();
  try { return Response.json({ status: 'success', data: await getAgentCashAccountability(session.role as AppUserRole) }); }
  catch (error) { const status = error instanceof CashHandoverHttpError ? error.status : 500; return status === 403 ? forbiddenResponse() : Response.json({ status: 'error', message: error instanceof Error ? error.message : String(error) }, { status }); }
}

export async function POST(request: NextRequest) {
  const session = await getVerifiedSession(request);
  if (!session || !session.userId) return unauthorizedResponse();
  try {
    const body = await request.json();
    const data = await recordCompanyCashHandover({ agentUserId: body?.agent_user_id, amount: body?.amount, companyReceiver: body?.company_receiver, notes: body?.notes, operationId: body?.operation_id, actorUserId: session.userId, role: session.role as AppUserRole });
    return Response.json({ status: 'success', data }, { status: 201 });
  } catch (error) { const status = error instanceof CashHandoverHttpError ? error.status : 500; return status === 403 ? forbiddenResponse() : Response.json({ status: 'error', message: error instanceof Error ? error.message : String(error) }, { status }); }
}
