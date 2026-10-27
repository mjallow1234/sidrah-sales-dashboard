import { NextRequest } from 'next/server';
import { forbiddenResponse, getVerifiedSession, unauthorizedResponse } from '@/lib/session';
import { isAdminRole } from '@/lib/authorization';
import { requirePermission } from '@/lib/server/permissionEvaluator';
import { reverseSale } from '@/services/outletService';

function errorResponse(error: unknown) { const message = error instanceof Error ? error.message : String(error); const status = message === 'Forbidden' ? 403 : message.includes('already been reversed') ? 409 : 400; return Response.json({ status: 'error', message }, { status }); }

export async function POST(request: NextRequest, { params }: { params: Promise<{ outletId: string; saleId: string }> }) {
  const session = await getVerifiedSession(request);
  if (!session) return unauthorizedResponse();
  const permission = await requirePermission(request, 'outlets.manage');
  if (permission instanceof Response) return permission;
  if (!session.userId || !isAdminRole(session.role)) return forbiddenResponse();
  try {
    const body = await request.json();
    const { outletId, saleId } = await params;
    return Response.json({ status: 'success', data: await reverseSale(outletId, saleId, body?.reason, { userId: session.userId, role: session.role }) });
  } catch (error) { return errorResponse(error); }
}
