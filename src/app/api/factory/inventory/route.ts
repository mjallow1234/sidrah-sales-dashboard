import type { NextRequest } from 'next/server';
import { forbiddenResponse, getVerifiedSession, unauthorizedResponse } from '@/lib/session';
import { isForemanRole } from '@/lib/authorization';
import { listFactoryInventory } from '@/services/factoryInventoryService';

export async function GET(request: NextRequest) {
  const session = await getVerifiedSession(request);
  if (!session) return unauthorizedResponse();
  if (!isForemanRole(session.role)) return forbiddenResponse();
  try {
    return Response.json({ status: 'success', data: await listFactoryInventory() });
  } catch (error) {
    return Response.json({ status: 'error', message: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}
