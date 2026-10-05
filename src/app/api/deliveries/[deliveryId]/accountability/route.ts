import type { NextRequest } from 'next/server';
import { forbiddenResponse, getVerifiedSession, unauthorizedResponse } from '@/lib/session';
import { isAdminOrSupervisorRole } from '@/lib/authorization';
import { getDeliveryAccountability } from '@/services/deliveryService';
import { requirePermission } from '@/lib/server/permissionEvaluator';

function getDeliveryId(request: NextRequest): string {
  const parts = request.nextUrl.pathname.split('/').filter(Boolean);
  return parts[parts.length - 2] || '';
}

export async function GET(request: NextRequest) {
  const session = await getVerifiedSession(request);
  if (!session) return unauthorizedResponse();
  const permission = await requirePermission(request, 'accountability.view');
  if (permission instanceof Response) return permission;
  if (!isAdminOrSupervisorRole(session.role)) return forbiddenResponse();
  const detail = await getDeliveryAccountability(getDeliveryId(request));
  if (!detail) return Response.json({ status: 'success', data: null });
  return Response.json({ status: 'success', data: detail });
}
