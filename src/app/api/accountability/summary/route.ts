import type { NextRequest } from 'next/server';
import { isAdminOrSupervisorRole } from '@/lib/authorization';
import { forbiddenResponse, getVerifiedSession, unauthorizedResponse } from '@/lib/session';
import { AccountabilityHttpError, listAccountabilityManagementSummary } from '@/services/agentAccountabilityService';
import { requirePermission } from '@/lib/server/permissionEvaluator';

export async function GET(request: NextRequest) {
  const session = await getVerifiedSession(request);
  if (!session) return unauthorizedResponse();
  const permission = await requirePermission(request, 'accountability.view');
  if (permission instanceof Response) return permission;
  if (!isAdminOrSupervisorRole(session.role)) return forbiddenResponse();
  try { return Response.json({ status: 'success', data: await listAccountabilityManagementSummary(session.role) }); }
  catch (error) { const status = error instanceof AccountabilityHttpError ? error.status : 500; return Response.json({ status: 'error', message: error instanceof Error ? error.message : String(error) }, { status }); }
}
