import { NextRequest } from 'next/server';
import { forbiddenResponse, getVerifiedSession, unauthorizedResponse } from '@/lib/session';
import { AccountabilityHttpError, initiateAccountabilityTransfer } from '@/services/agentAccountabilityService';
import { isAdminOrSupervisorRole, type AppUserRole } from '@/lib/authorization';

function deliveryId(request: NextRequest): string { const parts = request.nextUrl.pathname.split('/').filter(Boolean); return parts[parts.length - 3] || ''; }

export async function POST(request: NextRequest) {
  const session = await getVerifiedSession(request);
  if (!session) return unauthorizedResponse();
  if (!isAdminOrSupervisorRole(session.role) || !session.userId) return forbiddenResponse();
  try {
    const body = await request.json();
    const data = await initiateAccountabilityTransfer({ deliveryId: deliveryId(request), toAgentUserId: body?.to_agent_user_id, operationId: body?.operation_id, reason: body?.reason, actorUserId: session.userId, role: session.role as AppUserRole });
    return Response.json({ status: 'success', data }, { status: 201 });
  } catch (error) {
    const status = error instanceof AccountabilityHttpError ? error.status : 500;
    return Response.json({ status: 'error', message: error instanceof Error ? error.message : String(error) }, { status });
  }
}
