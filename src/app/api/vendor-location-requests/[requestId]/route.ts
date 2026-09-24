import type { NextRequest } from 'next/server';
import { getVerifiedSession, unauthorizedResponse } from '@/lib/session';
import { approveVendorLocationRequest, rejectVendorLocationRequest } from '@/services/vendorLocationService';

function getRequestId(request: NextRequest): string {
  return request.nextUrl.pathname.split('/').filter(Boolean).pop() || '';
}

export async function POST(request: NextRequest) {
  const session = await getVerifiedSession(request);
  if (!session) return unauthorizedResponse();
  try {
    const payload = await request.json().catch(() => ({}));
    const action = payload?.action === 'reject' ? 'reject' : payload?.action === 'approve' ? 'approve' : '';
    if (action === 'approve') {
      return Response.json({ status: 'success', data: await approveVendorLocationRequest(getRequestId(request), { userId: session.userId ?? '', role: session.role }) });
    }
    if (action === 'reject') {
      return Response.json({ status: 'success', data: await rejectVendorLocationRequest(getRequestId(request), { userId: session.userId ?? '', role: session.role }, payload?.reason) });
    }
    return Response.json({ status: 'error', message: 'Action must be approve or reject.' }, { status: 400 });
  } catch (error) {
    const status = error instanceof Error && 'statusCode' in error ? Number((error as { statusCode?: number }).statusCode) || 500 : 500;
    return Response.json({ status: 'error', message: error instanceof Error ? error.message : String(error) }, { status });
  }
}
