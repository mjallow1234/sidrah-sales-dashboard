import type { NextRequest } from 'next/server';
import { getVerifiedSession, unauthorizedResponse, forbiddenResponse } from '@/lib/session';
import { requirePermission } from '@/lib/server/permissionEvaluator';
import { getVendorLocation, submitVendorLocation } from '@/services/vendorLocationService';

function getVendorId(request: NextRequest): string {
  const parts = request.nextUrl.pathname.split('/').filter(Boolean);
  return parts[parts.length - 2] || '';
}

function responseError(error: unknown) {
  const status = error instanceof Error && 'statusCode' in error ? Number((error as { statusCode?: number }).statusCode) || 500 : 500;
  return Response.json({ status: 'error', message: error instanceof Error ? error.message : String(error) }, { status });
}

export async function GET(request: NextRequest) {
  const session = await requirePermission(request, 'vendors.view');
  if (session instanceof Response) return session;
  try {
    return Response.json({ status: 'success', data: await getVendorLocation(getVendorId(request), { userId: session.userId ?? '', role: session.role, salesRepId: session.sales_rep_id }) });
  } catch (error) {
    return responseError(error);
  }
}

export async function POST(request: NextRequest) {
  const session = await requirePermission(request, 'vendors.edit');
  if (session instanceof Response) return session;
  if (!session.userId) return forbiddenResponse();
  try {
    const payload = await request.json().catch(() => ({}));
    const result = await submitVendorLocation(getVendorId(request), payload?.latitude, payload?.longitude, { userId: session.userId, role: session.role, salesRepId: session.sales_rep_id });
    return Response.json({ status: 'success', data: result }, { status: result.type === 'requested' ? 202 : 200 });
  } catch (error) {
    return responseError(error);
  }
}
