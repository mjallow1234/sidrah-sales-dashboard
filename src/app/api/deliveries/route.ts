import type { NextRequest } from 'next/server';
import { forbiddenResponse, getVerifiedSession, unauthorizedResponse } from '@/lib/session';
import { isAdminOrSupervisorRole, isAgentRole } from '@/lib/authorization';
import type { DeliveryStatus } from '@/lib/types';
import { createDelivery, getDeliveries } from '@/services/deliveryService';
import { requirePermission } from '@/lib/server/permissionEvaluator';
import { isValidDateOnly } from '@/lib/dateOnly';

const validStatuses = ['pending', 'ongoing', 'delivered', 'cancelled'] as const;

export async function GET(request: NextRequest) {
  const session = await requirePermission(request, 'deliveries.view');
  if (session instanceof Response) return session;

  try {
    const statusParam = request.nextUrl.searchParams.get('status') ?? '';
    const productId = request.nextUrl.searchParams.get('productId');
    const unassigned = request.nextUrl.searchParams.get('unassigned') === 'true';
    const vendor = request.nextUrl.searchParams.get('vendor')?.trim() || undefined;
    const location = request.nextUrl.searchParams.get('location')?.trim() || undefined;
    const dateDeliveredParam = request.nextUrl.searchParams.get('dateDelivered')?.trim() || undefined;
    const deliveredDate = dateDeliveredParam && isValidDateOnly(dateDeliveredParam) ? dateDeliveredParam : undefined;
    const requestedStatuses = statusParam.split(',').map((value) => value.trim()).filter(Boolean);
    const status = requestedStatuses.length > 0 && requestedStatuses.every((value) => validStatuses.includes(value as DeliveryStatus))
      ? requestedStatuses.length === 1 ? requestedStatuses[0] as DeliveryStatus : requestedStatuses as DeliveryStatus[]
      : undefined;
    const deliveries = await getDeliveries(status, session.role === 'delivery' ? session.userId : undefined, productId || undefined, unassigned, vendor, location, deliveredDate);
    return Response.json({ status: 'success', data: deliveries ?? [] });
  } catch (error: unknown) {
    return Response.json({ status: 'error', message: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await requirePermission(request, 'deliveries.create');
  if (session instanceof Response) return session;
  if (!isAgentRole(session.role) && !isAdminOrSupervisorRole(session.role)) {
    return forbiddenResponse();
  }

  try {
    const payload = await request.json();
    const result = await createDelivery({
      ...payload,
      accountability_agent_user_id: session.role === 'agent' ? session.userId : undefined,
    }, session.userId ?? '');
    return Response.json({ status: 'success', data: result });
  } catch (error: unknown) {
    if (error instanceof Error && 'status' in error) {
      const status = (error as any).status || 500;
      return Response.json({ status: 'error', message: error.message }, { status });
    }
    return Response.json({ status: 'error', message: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
