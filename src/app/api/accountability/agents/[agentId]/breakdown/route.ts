import { NextRequest } from 'next/server';
import { isAdminOrSupervisorRole } from '@/lib/authorization';
import { forbiddenResponse, getVerifiedSession, unauthorizedResponse } from '@/lib/session';
import { AccountabilityHttpError, getAccountabilityBreakdown } from '@/services/agentAccountabilityService';
import { requirePermission } from '@/lib/server/permissionEvaluator';

export async function GET(request: NextRequest, context: { params: Promise<{ agentId: string }> }) {
  const session = await getVerifiedSession(request);
  if (!session) return unauthorizedResponse();
  const permission = await requirePermission(request, 'accountability.view');
  if (permission instanceof Response) return permission;
  if (!isAdminOrSupervisorRole(session.role)) return forbiddenResponse();
  const { agentId } = await context.params;
  try { return Response.json({ status: 'success', data: await getAccountabilityBreakdown(decodeURIComponent(agentId), session.role as any) }); }
  catch (error) { const status = error instanceof AccountabilityHttpError ? error.status : 500; return status === 403 ? forbiddenResponse() : Response.json({ status: 'error', message: error instanceof Error ? error.message : String(error) }, { status }); }
}
