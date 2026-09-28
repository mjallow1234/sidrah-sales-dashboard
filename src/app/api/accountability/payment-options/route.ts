import type { NextRequest } from 'next/server';
import { getVerifiedSession, unauthorizedResponse, forbiddenResponse } from '@/lib/session';
import { isAdminOrSupervisorRole } from '@/lib/authorization';
import { getDeliveryPaymentOptions } from '@/services/deliveryPaymentService';

export async function GET(request: NextRequest) {
  const session = await getVerifiedSession(request);
  if (!session) return unauthorizedResponse();
  if (!isAdminOrSupervisorRole(session.role)) return forbiddenResponse();
  return Response.json({ status: 'success', data: await getDeliveryPaymentOptions(false) });
}
