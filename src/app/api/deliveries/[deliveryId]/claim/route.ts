import type { NextRequest } from 'next/server';
import { forbiddenResponse, getVerifiedSession, unauthorizedResponse } from '@/lib/session';
import { isDeliveryRole } from '@/lib/authorization';
import { claimDelivery } from '@/services/deliveryService';

function getDeliveryId(request: NextRequest): string {
  const { pathname } = request.nextUrl;
  const segments = pathname.split('/').filter(Boolean);
  return segments[segments.length - 2] || '';
}

export async function POST(request: NextRequest) {
  const session = await getVerifiedSession(request);
  if (!session) {
    return unauthorizedResponse();
  }
  if (!isDeliveryRole(session.role)) {
    return forbiddenResponse();
  }

  try {
    const deliveryId = getDeliveryId(request);
    const result = await claimDelivery(deliveryId, session.userId ?? '');
    return Response.json({ status: 'success', data: result });
  } catch (error: unknown) {
    if (error instanceof Error && 'status' in error) {
      const status = (error as any).status || 500;
      return Response.json({ status: 'error', message: error.message }, { status });
    }
    return Response.json({ status: 'error', message: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
