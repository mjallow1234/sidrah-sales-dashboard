import type { NextRequest } from 'next/server';
import { forbiddenResponse, getVerifiedSession, unauthorizedResponse } from '@/lib/session';
import { isForemanRole } from '@/lib/authorization';
import { createFactoryMovement, listFactoryMovements } from '@/services/factoryInventoryService';

export async function GET(request: NextRequest) {
  const session = await getVerifiedSession(request);
  if (!session) return unauthorizedResponse();
  if (!isForemanRole(session.role)) return forbiddenResponse();
  const limit = Number(request.nextUrl.searchParams.get('limit') ?? 100);
  try {
    return Response.json({ status: 'success', data: await listFactoryMovements(Number.isFinite(limit) ? limit : 100) });
  } catch (error) {
    return Response.json({ status: 'error', message: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getVerifiedSession(request);
  if (!session) return unauthorizedResponse();
  if (!isForemanRole(session.role) || !session.userId) return forbiddenResponse();
  try {
    const payload = await request.json();
    const result = await createFactoryMovement({ ...payload, actor_user_id: session.userId });
    return Response.json({ status: 'success', data: result }, { status: 201 });
  } catch (error) {
    const status = error instanceof Error && 'statusCode' in error ? Number((error as { statusCode?: number }).statusCode) || 500 : 500;
    return Response.json({ status: 'error', message: error instanceof Error ? error.message : String(error) }, { status });
  }
}
