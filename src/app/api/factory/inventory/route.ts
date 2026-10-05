import type { NextRequest } from 'next/server';
import { forbiddenResponse, getVerifiedSession, unauthorizedResponse } from '@/lib/session';
import { isFactoryRole } from '@/lib/authorization';
import { listFactoryInventory } from '@/services/factoryInventoryService';
import { requirePermission } from '@/lib/server/permissionEvaluator';

export async function GET(request: NextRequest) {
  const session = await requirePermission(request, 'factory.view');
  if (session instanceof Response) return session;
  if (!isFactoryRole(session.role)) return forbiddenResponse();
  try {
    return Response.json({ status: 'success', data: await listFactoryInventory(request.nextUrl.searchParams.get('productId') || undefined) });
  } catch (error) {
    return Response.json({ status: 'error', message: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
