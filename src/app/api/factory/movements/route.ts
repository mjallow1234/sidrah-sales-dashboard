import type { NextRequest } from 'next/server';
import { forbiddenResponse, getVerifiedSession, unauthorizedResponse } from '@/lib/session';
import { isFactoryRole } from '@/lib/authorization';
import { createFactoryMovement, editFactoryMovement, listFactoryMovements } from '@/services/factoryInventoryService';

export async function GET(request: NextRequest) {
  const session = await getVerifiedSession(request);
  if (!session) return unauthorizedResponse();
  if (!isFactoryRole(session.role)) return forbiddenResponse();
  const params = request.nextUrl.searchParams;
  const limit = Number(params.get('limit') ?? 100);
  const movementTypeParam = params.get('movementType');
  const movementType = movementTypeParam === 'production' || movementTypeParam === 'leaving_factory' || movementTypeParam === 'returned_factory'
    ? movementTypeParam
    : undefined;
  try {
    return Response.json({ status: 'success', data: await listFactoryMovements(Number.isFinite(limit) ? limit : 100, { startDate: params.get('startDate') || undefined, endDate: params.get('endDate') || undefined, productId: params.get('productId') || undefined, movementType }) });
  } catch (error) {
    return Response.json({ status: 'error', message: error instanceof Error ? error.message : String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getVerifiedSession(request);
  if (!session) return unauthorizedResponse();
  if (!isFactoryRole(session.role) || !session.userId) return forbiddenResponse();
  try {
    const payload = await request.json();
    const result = await createFactoryMovement({ ...payload, actor_user_id: session.userId });
    return Response.json({ status: 'success', data: result }, { status: 201 });
  } catch (error) {
    const status = error instanceof Error && 'statusCode' in error ? Number((error as { statusCode?: number }).statusCode) || 500 : 500;
    return Response.json({ status: 'error', message: error instanceof Error ? error.message : String(error) }, { status });
  }
}

export async function PATCH(request: NextRequest) {
  const session = await getVerifiedSession(request); if (!session) return unauthorizedResponse(); if (!isFactoryRole(session.role) || !session.userId) return forbiddenResponse();
  try { return Response.json({ status: 'success', data: await editFactoryMovement({ ...(await request.json()), actor_user_id: session.userId }) }); }
  catch (error) { const status = error instanceof Error && 'statusCode' in error ? Number((error as { statusCode?: number }).statusCode) || 500 : 500; return Response.json({ status: 'error', message: error instanceof Error ? error.message : String(error) }, { status }); }
}
