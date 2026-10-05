import { NextRequest } from 'next/server';
import { forbiddenResponse, getVerifiedSession, unauthorizedResponse } from '@/lib/session';
import { listAccountabilityTransfers } from '@/services/agentAccountabilityService';
import { isAdminOrSupervisorRole, type AppUserRole } from '@/lib/authorization';
import { requirePermission } from '@/lib/server/permissionEvaluator';

export async function GET(request: NextRequest) {
  const session = await getVerifiedSession(request);
  if (!session) return unauthorizedResponse();
  const permission = await requirePermission(request, 'accountability.view');
  if (permission instanceof Response) return permission;
  const role = session.role;
  if (!role || !isAdminOrSupervisorRole(role) || !session.userId) return forbiddenResponse();
  try {
    const userId = session.userId;
    return Response.json({ status: 'success', data: await listAccountabilityTransfers(userId, role as AppUserRole) });
  } catch (error) {
    return Response.json({ status: 'error', message: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
