import type { NextRequest } from 'next/server';
import { isAdminRole } from '@/lib/authorization';
import { forbiddenResponse, getVerifiedSession, unauthorizedResponse } from '@/lib/session';
import { correctDeliveryPayment } from '@/services/deliveryPaymentService';

function ids(request: NextRequest) {
  const parts = request.nextUrl.pathname.split('/').filter(Boolean);
  return { deliveryId: parts[parts.length - 3] || '', paymentId: parts[parts.length - 1] || '' };
}

export async function PATCH(request: NextRequest) {
  const session = await getVerifiedSession(request);
  if (!session) return unauthorizedResponse();
  if (!isAdminRole(session.role) || !session.userId) return forbiddenResponse();
  try {
    const { deliveryId, paymentId } = ids(request);
    const payload = await request.json().catch(() => ({}));
    const correction = await correctDeliveryPayment({ deliveryId, paymentId, amount: payload?.amount, reason: payload?.reason, operationId: payload?.operation_id, actorUserId: session.userId });
    return Response.json({ status: 'success', data: correction });
  } catch (error: unknown) {
    const status = error instanceof Error && 'status' in error ? Number((error as any).status) || 500 : 500;
    return Response.json({ status: 'error', message: error instanceof Error ? error.message : String(error) }, { status });
  }
}
