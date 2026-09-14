import type { NextRequest } from 'next/server';
import { forbiddenResponse, getVerifiedSession, unauthorizedResponse } from '@/lib/session';
import { isFactoryRole } from '@/lib/authorization';
import { reverseFactoryMovement } from '@/services/factoryInventoryService';
export async function POST(request: NextRequest) { const session = await getVerifiedSession(request); if (!session) return unauthorizedResponse(); if (!isFactoryRole(session.role) || !session.userId) return forbiddenResponse(); try { return Response.json({ status: 'success', data: await reverseFactoryMovement({ ...(await request.json()), actor_user_id: session.userId }) }); } catch (error) { const status = error instanceof Error && 'statusCode' in error ? Number((error as { statusCode?: number }).statusCode) || 500 : 500; return Response.json({ status: 'error', message: error instanceof Error ? error.message : String(error) }, { status }); } }
