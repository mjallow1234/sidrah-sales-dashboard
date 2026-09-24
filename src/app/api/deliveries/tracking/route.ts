import type { NextRequest } from 'next/server';
import { forbiddenResponse, getVerifiedSession, unauthorizedResponse } from '@/lib/session';
import { isAdminOrSupervisorRole, isDeliveryRole } from '@/lib/authorization';
import { listActiveDeliveryLocations, updateDeliveryLocation, DeliveryTrackingError } from '@/services/deliveryTrackingService';

export async function GET(request: NextRequest) {
  const session = await getVerifiedSession(request);
  if (!session) return unauthorizedResponse();
  if (!isAdminOrSupervisorRole(session.role)) return forbiddenResponse();
  try {
    return Response.json({ status: 'success', data: await listActiveDeliveryLocations() });
  } catch (error: unknown) {
    return Response.json({ status: 'error', message: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getVerifiedSession(request);
  if (!session) return unauthorizedResponse();
  if (!isDeliveryRole(session.role)) return forbiddenResponse();
  try {
    const payload = await request.json();
    await updateDeliveryLocation(payload?.delivery_id, payload?.latitude, payload?.longitude, session.userId ?? '');
    return Response.json({ status: 'success' });
  } catch (error: unknown) {
    const status = error instanceof DeliveryTrackingError ? error.status : 500;
    return Response.json({ status: 'error', message: error instanceof Error ? error.message : String(error) }, { status });
  }
}
