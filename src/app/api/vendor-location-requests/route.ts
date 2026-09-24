import type { NextRequest } from 'next/server';
import { getVerifiedSession, unauthorizedResponse } from '@/lib/session';
import { listPendingVendorLocationRequests } from '@/services/vendorLocationService';

export async function GET(request: NextRequest) {
  const session = await getVerifiedSession(request);
  if (!session) return unauthorizedResponse();
  try {
    return Response.json({ status: 'success', data: await listPendingVendorLocationRequests({ role: session.role }) });
  } catch (error) {
    const status = error instanceof Error && 'statusCode' in error ? Number((error as { statusCode?: number }).statusCode) || 500 : 500;
    return Response.json({ status: 'error', message: error instanceof Error ? error.message : String(error) }, { status });
  }
}
