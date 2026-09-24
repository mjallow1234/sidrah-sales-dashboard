import type { NextRequest } from 'next/server';
import { isAdminRole } from '@/lib/authorization';
import { forbiddenResponse, getVerifiedSession, unauthorizedResponse } from '@/lib/session';
import { updateDeliveryPaymentOption } from '@/services/deliveryPaymentService';

function getId(request: NextRequest): string { const parts = request.nextUrl.pathname.split('/').filter(Boolean); return parts[parts.length - 1] || ''; }

export async function PATCH(request: NextRequest) {
  const session = await getVerifiedSession(request);
  if (!session) return unauthorizedResponse();
  if (!isAdminRole(session.role)) return forbiddenResponse();
  try {
    const payload = await request.json().catch(() => ({}));
    return Response.json({ status: 'success', data: await updateDeliveryPaymentOption(getId(request), payload) });
  } catch (error: unknown) {
    const status = error instanceof Error && 'status' in error ? Number((error as any).status) : 500;
    return Response.json({ status: 'error', message: error instanceof Error ? error.message : String(error) }, { status });
  }
}
