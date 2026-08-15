import type { NextRequest } from 'next/server';
import { forbiddenResponse, getVerifiedSession, unauthorizedResponse } from '@/lib/session';
import { isAgentRole, isSupervisorRole, isAdminOrSupervisorRole } from '@/lib/authorization';
import { createSupply } from '@/services/supplyService';

export async function POST(request: NextRequest) {
  const session = await getVerifiedSession(request);
  if (!session) {
    return unauthorizedResponse();
  }
  if (!isAgentRole(session.role) && !isSupervisorRole(session.role) && !isAdminOrSupervisorRole(session.role)) {
    return forbiddenResponse();
  }

  try {
    const payload = await request.json();
    const result = await createSupply({
      ...payload,
      actor_role: session.role,
      actor_sales_rep_id: session.sales_rep_id || '',
    });
    return Response.json({ status: 'success', data: result });
  } catch (error) {
    const status = error instanceof Error && 'statusCode' in error
      ? Number((error as { statusCode?: number }).statusCode) || 500
      : 500;
    return Response.json({
      status: 'error',
      message: error instanceof Error ? error.message : String(error),
    }, { status });
  }
}
