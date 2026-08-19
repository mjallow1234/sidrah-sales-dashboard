import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { forbiddenResponse, getVerifiedSession, unauthorizedResponse } from '@/lib/session';
import { isAgentRole, isSupervisorRole, isAdminOrSupervisorRole } from '@/lib/authorization';
import { createVisit as createVisitLocally } from '@/services/visitService';

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
    if (isAgentRole(session.role) && payload.sales_rep_id && payload.sales_rep_id !== session.sales_rep_id) {
      return forbiddenResponse();
    }
    const body = {
      ...payload,
      actor_role: session.role,
      actor_sales_rep_id: session.sales_rep_id || '',
    };

    try {
      const result = await createVisitLocally(body);
      return NextResponse.json({ status: 'success', data: result });
    } catch (error) {
      const status = error instanceof Error && 'status' in error ? (error as any).status ?? 500 : 500;
      const message = error instanceof Error ? error.message : String(error);
      return NextResponse.json({ status: 'error', message }, { status });
    }
  } catch (error) {
    return Response.json(
      {
        error: String(error),
      },
      { status: 500 }
    );
  }
}
