import type { NextRequest } from 'next/server';
import { forbiddenResponse, getVerifiedSession, unauthorizedResponse } from '@/lib/session';
import { isAdminOrSupervisorRole, isAgentRole } from '@/lib/authorization';
import type { DeliveryStatus } from '@/lib/types';
import { createDelivery, getDeliveries } from '@/services/deliveryService';

const validStatuses = ['pending', 'ongoing', 'delivered', 'cancelled'] as const;

export async function GET(request: NextRequest) {
  const session = await getVerifiedSession(request);
  if (!session) {
    return unauthorizedResponse();
  }

  try {
    const statusParam = request.nextUrl.searchParams.get('status') ?? undefined;
    const status = statusParam && validStatuses.includes(statusParam as DeliveryStatus) ? (statusParam as DeliveryStatus) : undefined;
    const deliveries = await getDeliveries(status, session.role === 'delivery' ? session.userId : undefined);
    return Response.json({ status: 'success', data: deliveries ?? [] });
  } catch (error: unknown) {
    return Response.json({ status: 'error', message: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getVerifiedSession(request);
  if (!session) {
    return unauthorizedResponse();
  }
  if (!isAgentRole(session.role) && !isAdminOrSupervisorRole(session.role)) {
    return forbiddenResponse();
  }

  try {
    const payload = await request.json();
    const result = await createDelivery(payload, session.userId ?? '');
    return Response.json({ status: 'success', data: result });
  } catch (error: unknown) {
    if (error instanceof Error && 'status' in error) {
      const status = (error as any).status || 500;
      return Response.json({ status: 'error', message: error.message }, { status });
    }
    return Response.json({ status: 'error', message: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
