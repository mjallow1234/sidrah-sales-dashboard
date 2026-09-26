import type { NextRequest } from 'next/server';
import type { AppUserRole } from '@/lib/authorization';
import { forbiddenResponse, getVerifiedSession, unauthorizedResponse } from '@/lib/session';
import { recordAccountabilityReturn, AccountabilityHttpError } from '@/services/agentAccountabilityService';

function getDeliveryId(request: NextRequest): string { const parts = request.nextUrl.pathname.split('/').filter(Boolean); return parts[parts.length - 3] || ''; }

export async function POST(request: NextRequest) {
  const session = await getVerifiedSession(request);
  if (!session) return unauthorizedResponse();
  if (!['agent', 'admin', 'supervisor', 'super_admin'].includes(String(session.role))) return forbiddenResponse();
  try {
    const payload = await request.json().catch(() => ({}));
    const data = await recordAccountabilityReturn({
      deliveryId: getDeliveryId(request), productId: payload?.product_id, quantity: payload?.quantity,
      operationId: payload?.operation_id, reason: payload?.reason, actorUserId: session.userId ?? '', role: session.role as AppUserRole,
    });
    return Response.json({ status: 'success', data }, { status: 201 });
  } catch (error: unknown) {
    const status = error instanceof AccountabilityHttpError ? error.status : 500;
    return Response.json({ status: 'error', message: error instanceof Error ? error.message : String(error) }, { status });
  }
}
