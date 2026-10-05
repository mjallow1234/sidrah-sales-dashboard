import type { NextRequest } from 'next/server';
import { isDeliveryRole } from '@/lib/authorization';
import { forbiddenResponse, getVerifiedSession, unauthorizedResponse } from '@/lib/session';
import { DeliveryUserLocationError, getDeliveryUserLocationState, saveCurrentDeliveryUserLocation } from '@/services/deliveryUserLocationService';
import { requirePermission } from '@/lib/server/permissionEvaluator';

function errorResponse(error: unknown) {
  const status = error instanceof DeliveryUserLocationError ? error.status : 500;
  return Response.json({ status: 'error', message: error instanceof Error ? error.message : String(error) }, { status });
}

export async function GET(request: NextRequest) {
  const session = await requirePermission(request, 'deliveries.view');
  if (session instanceof Response) return session;
  if (!isDeliveryRole(session.role)) return forbiddenResponse();
  try {
    return Response.json({ status: 'success', data: await getDeliveryUserLocationState(session.userId ?? '') });
  } catch (error: unknown) {
    return errorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  const session = await requirePermission(request, 'deliveries.view');
  if (session instanceof Response) return session;
  if (!isDeliveryRole(session.role)) return forbiddenResponse();
  try {
    const payload = await request.json().catch(() => ({}));
    return Response.json({ status: 'success', data: await saveCurrentDeliveryUserLocation(session.userId ?? '', payload?.latitude, payload?.longitude) });
  } catch (error: unknown) {
    return errorResponse(error);
  }
}
