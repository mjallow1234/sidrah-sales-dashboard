import { NextRequest } from 'next/server';
import { forbiddenResponse, getVerifiedSession, unauthorizedResponse } from '@/lib/session';
import { isAdminOrSupervisorRole } from '@/lib/authorization';
import { listAccountabilityAgents } from '@/services/agentAccountabilityService';
import { requirePermission } from '@/lib/server/permissionEvaluator';

export async function GET(request: NextRequest) {
  const session = await getVerifiedSession(request);
  if (!session) return unauthorizedResponse();
  const permission = await requirePermission(request, 'accountability.view');
  if (permission instanceof Response) return permission;
  const role = session.role;
  if (!role || !isAdminOrSupervisorRole(role) || !session.userId) return forbiddenResponse();
  return Response.json({ status: 'success', data: await listAccountabilityAgents() });
}
