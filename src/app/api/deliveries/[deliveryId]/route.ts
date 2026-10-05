import type { NextRequest } from 'next/server';
import { forbiddenResponse, getVerifiedSession, unauthorizedResponse } from '@/lib/session';
import { isAdminOrSupervisorRole } from '@/lib/authorization';
import { getDeliveryById, updateDeliveryDetails } from '@/services/deliveryService';
import { requirePermission } from '@/lib/server/permissionEvaluator';

function getDeliveryId(request: NextRequest): string {
  const { pathname } = request.nextUrl;
  const segments = pathname.split('/').filter(Boolean);
  return segments[segments.length - 1] || '';
}

export async function GET(request: NextRequest) {
  const session = await requirePermission(request, 'deliveries.view');
  if (session instanceof Response) return session;

  try {
    const deliveryId = getDeliveryId(request);
    const delivery = await getDeliveryById(deliveryId);
    return Response.json({ status: 'success', data: delivery });
  } catch (error: unknown) {
    return Response.json({ status: 'error', message: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  const session = await getVerifiedSession(request);
  if (!session) return unauthorizedResponse();
  if (!isAdminOrSupervisorRole(session.role) || !session.userId) return forbiddenResponse();
  try {
    const deliveryId = getDeliveryId(request);
    const payload = await request.json();
    const delivery = await updateDeliveryDetails(deliveryId, payload?.delivery_date, payload?.cooking_location, session.userId);
    return Response.json({ status: 'success', data: delivery });
  } catch (error: unknown) {
    const status = error instanceof Error && 'status' in error ? Number((error as { status?: number }).status) || 500 : 500;
    return Response.json({ status: 'error', message: error instanceof Error ? error.message : String(error) }, { status });
  }
}
