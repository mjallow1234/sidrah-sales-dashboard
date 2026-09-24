import type { NextRequest } from 'next/server';
import { isAdminOrSupervisorRole, isDeliveryRole } from '@/lib/authorization';
import { forbiddenResponse, getVerifiedSession, unauthorizedResponse } from '@/lib/session';
import { getDeliveryPayments, recordDeliveryPayment } from '@/services/deliveryPaymentService';

function getDeliveryId(request: NextRequest): string { const parts = request.nextUrl.pathname.split('/').filter(Boolean); return parts[parts.length - 2] || ''; }

export async function GET(request: NextRequest) {
  const session = await getVerifiedSession(request);
  if (!session) return unauthorizedResponse();
  try { return Response.json({ status: 'success', data: await getDeliveryPayments(getDeliveryId(request)) }); }
  catch (error: unknown) { const status = error instanceof Error && 'status' in error ? Number((error as any).status) : 500; return Response.json({ status: 'error', message: error instanceof Error ? error.message : String(error) }, { status }); }
}

export async function POST(request: NextRequest) {
  const session = await getVerifiedSession(request);
  if (!session) return unauthorizedResponse();
  if (!isDeliveryRole(session.role) && !isAdminOrSupervisorRole(session.role)) return forbiddenResponse();
  try {
    const payload = await request.json().catch(() => ({}));
    return Response.json({ status: 'success', data: await recordDeliveryPayment(getDeliveryId(request), payload?.amount, payload?.payment_option_id, session.userId ?? '') }, { status: 201 });
  } catch (error: unknown) { const status = error instanceof Error && 'status' in error ? Number((error as any).status) : 500; return Response.json({ status: 'error', message: error instanceof Error ? error.message : String(error) }, { status }); }
}
