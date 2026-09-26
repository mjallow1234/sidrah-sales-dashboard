import type { NextRequest } from 'next/server';
import { forbiddenResponse, getVerifiedSession, unauthorizedResponse } from '@/lib/session';
import { getDeliveryAccountability } from '@/services/deliveryService';

function getDeliveryId(request: NextRequest): string {
  const parts = request.nextUrl.pathname.split('/').filter(Boolean);
  return parts[parts.length - 2] || '';
}

export async function GET(request: NextRequest) {
  const session = await getVerifiedSession(request);
  if (!session) return unauthorizedResponse();
  const detail = await getDeliveryAccountability(getDeliveryId(request));
  if (!detail) return Response.json({ status: 'success', data: null });
  const elevated = session.role === 'admin' || session.role === 'super_admin' || session.role === 'supervisor';
  if (!elevated && !(session.role === 'agent' && detail.accountable_agent_user_id === session.userId)) return forbiddenResponse();
  return Response.json({ status: 'success', data: detail });
}
