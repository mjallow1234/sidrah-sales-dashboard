import type { NextRequest } from 'next/server';
import { isAdminOrSupervisorRole, isAgentRole, isDeliveryRole } from '@/lib/authorization';
import { forbiddenResponse, getVerifiedSession, unauthorizedResponse } from '@/lib/session';
import { addDeliveryComment } from '@/services/deliveryService';

function getDeliveryId(request: NextRequest): string {
  const segments = request.nextUrl.pathname.split('/').filter(Boolean);
  return segments[segments.length - 2] || '';
}

export async function POST(request: NextRequest) {
  const session = await getVerifiedSession(request);
  if (!session) return unauthorizedResponse();
  if (!isAdminOrSupervisorRole(session.role) && !isAgentRole(session.role) && !isDeliveryRole(session.role)) return forbiddenResponse();

  try {
    const payload = await request.json();
    const data = await addDeliveryComment(getDeliveryId(request), session.userId ?? '', session.role, payload?.comment);
    return Response.json({ status: 'success', data });
  } catch (error: unknown) {
    const status = error instanceof Error && 'status' in error ? Number((error as any).status) || 500 : 500;
    return Response.json({ status: 'error', message: error instanceof Error ? error.message : String(error) }, { status });
  }
}
