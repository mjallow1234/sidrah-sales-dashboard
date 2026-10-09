import type { NextRequest } from 'next/server';
import { forbiddenResponse, getVerifiedSession, unauthorizedResponse } from '@/lib/session';
import { isAdminOrSupervisorRole, isDeliveryRole } from '@/lib/authorization';
import { completeDeliveryAsAdmin, markDeliveryDelivered } from '@/services/deliveryService';
import { requirePermission } from '@/lib/server/permissionEvaluator';

function getDeliveryId(request: NextRequest): string {
  const { pathname } = request.nextUrl;
  const segments = pathname.split('/').filter(Boolean);
  return segments[segments.length - 2] || '';
}

export async function POST(request: NextRequest) {
  const session = await requirePermission(request, 'deliveries.deliver');
  if (session instanceof Response) return session;
  if (!isDeliveryRole(session.role) && !isAdminOrSupervisorRole(session.role)) {
    return forbiddenResponse();
  }

  try {
    const deliveryId = getDeliveryId(request);
    const payload = await request.json().catch(() => ({}));
    const result = isAdminOrSupervisorRole(session.role)
      ? await completeDeliveryAsAdmin(deliveryId, session.userId ?? '', payload?.comment, payload?.empty_gallons_received)
      : await markDeliveryDelivered(deliveryId, session.userId ?? '', payload?.comment, payload?.empty_gallons_received);
    return Response.json({ status: 'success', data: result });
  } catch (error: unknown) {
    if (error instanceof Error && 'status' in error) {
      const status = (error as any).status || 500;
      return Response.json({ status: 'error', message: error.message }, { status });
    }
    return Response.json({ status: 'error', message: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
