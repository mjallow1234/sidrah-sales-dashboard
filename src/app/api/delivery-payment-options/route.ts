import type { NextRequest } from 'next/server';
import { canRecordDeliveryPayment, isAdminRole } from '@/lib/authorization';
import { forbiddenResponse, getVerifiedSession, unauthorizedResponse } from '@/lib/session';
import { createDeliveryPaymentOption, getDeliveryPaymentOptions } from '@/services/deliveryPaymentService';

export async function GET(request: NextRequest) {
  const session = await getVerifiedSession(request);
  if (!session) return unauthorizedResponse();
  const includeInactive = request.nextUrl.searchParams.get('includeInactive') === '1';
  if (!canRecordDeliveryPayment(session.role) || (includeInactive && !isAdminRole(session.role))) return forbiddenResponse();
  try { return Response.json({ status: 'success', data: await getDeliveryPaymentOptions(includeInactive) }); }
  catch (error: unknown) { return Response.json({ status: 'error', message: error instanceof Error ? error.message : String(error) }, { status: 500 }); }
}

export async function POST(request: NextRequest) {
  const session = await getVerifiedSession(request);
  if (!session) return unauthorizedResponse();
  if (!isAdminRole(session.role)) return forbiddenResponse();
  try {
    const payload = await request.json().catch(() => ({}));
    return Response.json({ status: 'success', data: await createDeliveryPaymentOption(payload?.name) }, { status: 201 });
  } catch (error: unknown) {
    const status = error instanceof Error && 'status' in error ? Number((error as any).status) : 500;
    return Response.json({ status: 'error', message: error instanceof Error ? error.message : String(error) }, { status });
  }
}
