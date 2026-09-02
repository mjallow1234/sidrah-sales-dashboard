import type { NextRequest } from 'next/server';
import { getVerifiedSession, unauthorizedResponse } from '@/lib/session';
import { getDeliveryById } from '@/services/deliveryService';

function getDeliveryId(request: NextRequest): string {
  const { pathname } = request.nextUrl;
  const segments = pathname.split('/').filter(Boolean);
  return segments[segments.length - 1] || '';
}

export async function GET(request: NextRequest) {
  const session = await getVerifiedSession(request);
  if (!session) {
    return unauthorizedResponse();
  }

  try {
    const deliveryId = getDeliveryId(request);
    const delivery = await getDeliveryById(deliveryId);
    return Response.json({ status: 'success', data: delivery });
  } catch (error: unknown) {
    return Response.json({ status: 'error', message: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
