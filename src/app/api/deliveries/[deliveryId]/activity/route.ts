import type { NextRequest } from 'next/server';
import { getVerifiedSession, unauthorizedResponse } from '@/lib/session';
import { getDeliveryActivity } from '@/services/deliveryService';
import { NotFoundError } from '@/repositories/errors';
import { requirePermission } from '@/lib/server/permissionEvaluator';

function getDeliveryId(request: NextRequest): string {
  const segments = request.nextUrl.pathname.split('/').filter(Boolean);
  return segments[segments.length - 2] || '';
}

export async function GET(request: NextRequest) {
  const session = await requirePermission(request, 'deliveries.view');
  if (session instanceof Response) return session;
  try {
    const data = await getDeliveryActivity(getDeliveryId(request));
    return Response.json({ status: 'success', data });
  } catch (error: unknown) {
    const status = error instanceof NotFoundError ? 404 : error instanceof Error && 'status' in error ? Number((error as any).status) || 500 : 500;
    return Response.json({ status: 'error', message: error instanceof Error ? error.message : String(error) }, { status });
  }
}
