import type { NextRequest } from 'next/server';
import { getVerifiedSession, unauthorizedResponse } from '@/lib/session';
import { getDeliveryPaymentSummary } from '@/services/deliveryPaymentService';

export async function GET(request: NextRequest) {
  const session = await getVerifiedSession(request);
  if (!session) return unauthorizedResponse();
  const url = new URL(request.url);
  try {
    const data = await getDeliveryPaymentSummary(url.searchParams.get('date'), url.searchParams.get('location'), url.searchParams.get('vendor'));
    return Response.json({ status: 'success', data });
  } catch (error: unknown) {
    const status = error instanceof Error && 'status' in error ? Number((error as any).status) : 500;
    return Response.json({ status: 'error', message: error instanceof Error ? error.message : String(error) }, { status });
  }
}
