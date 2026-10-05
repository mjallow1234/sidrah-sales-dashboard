import type { NextRequest } from 'next/server';
import { isAdminOrSupervisorRole } from '@/lib/authorization';
import { forbiddenResponse, getVerifiedSession, unauthorizedResponse } from '@/lib/session';
import { getDeliveryPreparationSummary } from '@/services/deliveryService';
import { requirePermission } from '@/lib/server/permissionEvaluator';

export async function GET(request: NextRequest) {
  const session = await requirePermission(request, 'deliveries.view');
  if (session instanceof Response) return session;
  if (!isAdminOrSupervisorRole(session.role)) {
    return forbiddenResponse();
  }

  try {
    const summary = await getDeliveryPreparationSummary();
    return Response.json({ status: 'success', data: summary });
  } catch (error: unknown) {
    return Response.json({ status: 'error', message: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
