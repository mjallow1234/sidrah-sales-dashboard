import type { NextRequest } from 'next/server';
import { getVerifiedSession, forbiddenResponse, unauthorizedResponse } from '@/lib/session';
import { isDeliveryRole } from '@/lib/authorization';
import { getRecommendedNextDelivery } from '@/services/recommendedDeliveryService';

function coordinate(value: string | null, minimum: number, maximum: number): number | undefined {
  if (value === null || value === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= minimum && parsed <= maximum ? parsed : undefined;
}

export async function GET(request: NextRequest) {
  const session = await getVerifiedSession(request);
  if (!session) return unauthorizedResponse();
  if (!isDeliveryRole(session.role)) return forbiddenResponse();
  const url = new URL(request.url);
  const latitude = coordinate(url.searchParams.get('latitude'), -90, 90);
  const longitude = coordinate(url.searchParams.get('longitude'), -180, 180);
  return Response.json({ status: 'success', data: await getRecommendedNextDelivery(session.userId ?? '', latitude, longitude) });
}
