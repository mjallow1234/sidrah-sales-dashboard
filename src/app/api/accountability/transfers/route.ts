import { NextRequest } from 'next/server';
import { forbiddenResponse, getVerifiedSession, unauthorizedResponse } from '@/lib/session';
import { listAccountabilityTransfers } from '@/services/agentAccountabilityService';
import type { AppUserRole } from '@/lib/authorization';

export async function GET(request: NextRequest) {
  const session = await getVerifiedSession(request);
  if (!session) return unauthorizedResponse();
  const role = session.role;
  if (!role || !['agent', 'admin', 'super_admin', 'supervisor'].includes(role) || !session.userId) return forbiddenResponse();
  try {
    const userId = session.userId;
    return Response.json({ status: 'success', data: await listAccountabilityTransfers(userId, role as AppUserRole) });
  } catch (error) {
    return Response.json({ status: 'error', message: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
