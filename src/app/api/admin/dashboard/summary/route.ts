import type { NextRequest } from 'next/server';
import { isAdminRole } from '@/lib/authorization';
import { forbiddenResponse, getVerifiedSession, unauthorizedResponse } from '@/lib/session';
import { getAdminDashboardSummary } from '@/services/adminDashboardService';

export async function GET(request: NextRequest) {
  const session = await getVerifiedSession(request);
  if (!session) {
    return unauthorizedResponse();
  }
  if (!isAdminRole(session.role)) {
    return forbiddenResponse();
  }

  try {
    const params = request.nextUrl.searchParams;
    const summary = await getAdminDashboardSummary({
      startDate: params.get('startDate'),
      endDate: params.get('endDate'),
      productId: params.get('productId'),
      location: params.get('location'),
      salesRepId: params.get('salesRepId'),
    });
    return Response.json({ status: 'success', data: summary });
  } catch (error: unknown) {
    const status = error instanceof Error && error.name === 'ValidationError' ? 400 : 500;
    return Response.json({ status: 'error', message: error instanceof Error ? error.message : String(error) }, { status });
  }
}
