import { NextRequest } from 'next/server';
import { forbiddenResponse, getVerifiedSession, unauthorizedResponse } from '@/lib/session';
import { AccountabilityHttpError, decideAccountabilityTransfer } from '@/services/agentAccountabilityService';
import type { AppUserRole } from '@/lib/authorization';

function transferId(request: NextRequest): string { const parts = request.nextUrl.pathname.split('/').filter(Boolean); return parts[parts.length - 1] || ''; }

export async function POST(request: NextRequest) {
  const session = await getVerifiedSession(request);
  if (!session) return unauthorizedResponse();
  const role = session.role;
  if (!role || !['agent', 'admin', 'super_admin', 'supervisor'].includes(role) || !session.userId) return forbiddenResponse();
  try {
    const body = await request.json();
    const action = body?.action;
    if (!['accept', 'reject', 'cancel'].includes(action)) return Response.json({ status: 'error', message: 'A valid transfer action is required.' }, { status: 400 });
    const userId = session.userId;
    const data = await decideAccountabilityTransfer({ transferId: transferId(request), action, reason: body?.reason, actorUserId: userId, role: role as AppUserRole });
    return Response.json({ status: 'success', data });
  } catch (error) {
    const status = error instanceof AccountabilityHttpError ? error.status : 500;
    return Response.json({ status: 'error', message: error instanceof Error ? error.message : String(error) }, { status });
  }
}
