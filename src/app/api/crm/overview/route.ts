import type { NextRequest } from 'next/server';
import { isAdminOrSupervisorRole } from '@/lib/authorization';
import { requirePermission } from '@/lib/server/permissionEvaluator';
import { getAdminOverview } from '@/services/crmLeadService';

export async function GET(request: NextRequest) {
  const session = await requirePermission(request, 'crm.view');
  if (session instanceof Response) return session;
  if (!session.userId || !isAdminOrSupervisorRole(session.role)) {
    return Response.json({ status: 'error', message: 'Insufficient permissions.' }, { status: 403 });
  }
  const q = request.nextUrl.searchParams;
  try {
    const data = await getAdminOverview({
      capturedFrom: q.get('capturedFrom') || undefined,
      capturedTo: q.get('capturedTo') || undefined,
      salesRepId: q.get('salesRepId') || undefined,
      status: (q.get('status') as any) || undefined,
      leadSource: q.get('leadSource') || undefined,
      businessType: q.get('businessType') || undefined,
      location: q.get('location') || undefined,
    }, { userId: session.userId, role: session.role });
    return Response.json({ status: 'success', data });
  } catch (error) {
    return Response.json({ status: 'error', message: error instanceof Error ? error.message : String(error) }, { status: 400 });
  }
}
