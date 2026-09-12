import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { getVerifiedSession, forbiddenResponse, unauthorizedResponse } from '@/lib/session';
import { isAgentRole, isAdminOrSupervisorRole } from '@/lib/authorization';
import { reverseVisit } from '@/services/adminStockService';

export async function POST(request: NextRequest) {
  const session = await getVerifiedSession(request);
  if (!session) {
    return unauthorizedResponse();
  }
  if (!isAgentRole(session.role) && !isAdminOrSupervisorRole(session.role)) {
    return forbiddenResponse();
  }

  try {
    const payload = await request.json();
    const result = await reverseVisit(payload, {
      userId: session.userId ?? '',
      role: session.role ?? '',
      salesRepId: session.sales_rep_id,
    });
    return NextResponse.json({ status: 'success', data: result });
  } catch (error: unknown) {
    const status = error instanceof Error && 'statusCode' in error ? (error as any).statusCode ?? 500 : 500;
    return NextResponse.json(
      { status: 'error', message: error instanceof Error ? error.message : String(error) },
      { status }
    );
  }
}
