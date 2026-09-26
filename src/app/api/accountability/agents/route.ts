import { NextRequest } from 'next/server';
import { forbiddenResponse, getVerifiedSession, unauthorizedResponse } from '@/lib/session';
import { listAccountabilityAgents } from '@/services/agentAccountabilityService';

export async function GET(request: NextRequest) {
  const session = await getVerifiedSession(request);
  if (!session) return unauthorizedResponse();
  const role = session.role;
  if (!role || !['agent', 'admin', 'super_admin', 'supervisor'].includes(role) || !session.userId) return forbiddenResponse();
  return Response.json({ status: 'success', data: await listAccountabilityAgents() });
}
