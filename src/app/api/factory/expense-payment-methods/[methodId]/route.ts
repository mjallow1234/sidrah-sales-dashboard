import type { NextRequest } from 'next/server';
import { forbiddenResponse, getVerifiedSession, unauthorizedResponse } from '@/lib/session';
import { isAdminRole } from '@/lib/authorization';
import { editPaymentMethod, FactoryExpenseError } from '@/services/factoryExpenseService';

export async function PATCH(request: NextRequest, context: { params: Promise<{ methodId: string }> }) {
  const session = await getVerifiedSession(request);
  if (!session) return unauthorizedResponse();
  if (!isAdminRole(session.role)) return forbiddenResponse();
  try {
    const { methodId } = await context.params;
    return Response.json({ status: 'success', data: await editPaymentMethod(methodId, await request.json()) });
  } catch (error) {
    const status = error instanceof FactoryExpenseError ? error.status : 500;
    return Response.json({ status: 'error', message: error instanceof Error ? error.message : String(error) }, { status });
  }
}
